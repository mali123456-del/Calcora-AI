/**
 * Calcora AI — misconception model and evidence-based hint selection.
 *
 * Purpose
 * -------
 * Before this module the Tutor's hints came from a fixed five-rung ladder keyed on
 * how many times a learner had already asked. Two learners who made *different*
 * observable errors on the same concept received the same hint, because the ladder
 * could not see the error.
 *
 * This module replaces the position-based ladder with evidence-based selection:
 * classify the observable error, then choose a hint that addresses *that* error.
 *
 * Rules this module holds itself to
 * ---------------------------------
 *   - Only observable signals are recorded. No emotion, personality, ability,
 *     motivation or psychological state is inferred, stored or described. The
 *     evidence strings are facts about submitted expressions.
 *   - When an error cannot be classified, that is reported as `unknown` with an
 *     explicit uncertainty flag. A misconception is never invented to fill a gap.
 *   - A hint never contains the final answer at rungs 1-4. Rung 5 may complete the
 *     step, and only when the mode permits revealing it.
 *   - Language is factual and never blames the learner. It describes the pattern,
 *     not the person.
 */

import type { MistakeCategory } from '../utils/aiTutor';
import { calculateExpression } from '../engine/mathEngine';

export type MisconceptionClass = MistakeCategory | 'unknown';

export const MISCONCEPTION_CLASSES: readonly MisconceptionClass[] = [
  'arithmetic_mistake',
  'sign_error',
  'algebraic_manipulation_error',
  'formula_selection_error',
  'unit_error',
  'domain_restriction',
  'assumption_error',
  'conceptual_misunderstanding',
  'operation_error',
  'order_of_operations_error',
  'fraction_error',
  'variable_isolation_error',
  'unknown',
];

/**
 * What was observed, stated as a fact about the submitted work.
 *
 * `match` describes the *shape* of the disagreement, which is the cheapest reliable
 * signal available and the one that separates a sign slip from a method error.
 */
export type MisconceptionMatch =
  | 'correct'
  | 'sign_only'          // same magnitude, opposite sign
  | 'off_by_one_operation' // consistent with applying one inverse operation wrongly
  | 'magnitude_close'    // numerically near, suggests arithmetic slip
  | 'method_divergent'   // unrelated value, suggests a different method
  | 'no_comparison';     // no expected answer was available to compare against

export interface MisconceptionEvidence {
  problem: string;
  learnerAnswer: string;
  expectedAnswer: string | null;
  match: MisconceptionMatch;
  /** Absolute difference, when both sides were numeric. */
  numericGap?: number;
  /** A short, factual description of the observed pattern. */
  observation: string;
  /** The deterministic rule that identified this class, for inspectability. */
  matchedRule: string;
}

export interface MisconceptionAttempt {
  at: number;
  evidence: MisconceptionEvidence;
  hintRungGiven: number | null;
  /** Set once a later attempt shows whether the previous hint resolved the error. */
  resolved: boolean | null;
}

/**
 * The observable misconception record for one concept.
 *
 * Deliberately a flat, inspectable structure. There is no confidence score, no
 * affect label and no trait inference — only counts, evidence strings and what
 * happened after a hint was given.
 */
export interface MisconceptionState {
  concept: string;
  errorClass: MisconceptionClass;
  /** Factual observations, oldest first. Capped by `MAX_EVIDENCE`. */
  evidence: string[];
  /** The most recent full evidence record. */
  latest: MisconceptionEvidence | null;
  /** The step in the working the error was attributed to, when identifiable. */
  affectedStep: string | null;
  occurrences: number;
  /** The rung of the last hint issued for this state. */
  previousHintRung: number | null;
  /** Whether the hint issued at `previousHintRung` was followed by a correct answer. */
  previousHintResolved: boolean | null;
  /** Full attempt trail, for the recovery benchmark. */
  history: MisconceptionAttempt[];
  /** True when the classifier could not determine a specific class. */
  uncertain: boolean;
}

const MAX_EVIDENCE = 12;
const MAX_HISTORY = 24;

export function createMisconceptionState(concept: string, evidence: MisconceptionEvidence): MisconceptionState {
  // Defensive: a correct submission is not a misconception. If one reaches this
  // function it is downgraded to `unknown` rather than stored as an error class,
  // so no caller can produce a state implying the learner was wrong when they
  // were right.
  const rule = evidence.matchedRule === 'unclassified' || evidence.matchedRule === 'correct'
    ? 'unknown'
    : evidence.matchedRule;
  return {
    concept,
    errorClass: rule as MisconceptionClass,
    evidence: [evidence.observation],
    latest: evidence,
    affectedStep: null,
    occurrences: 1,
    previousHintRung: null,
    previousHintResolved: null,
    history: [{ at: Date.now(), evidence, hintRungGiven: null, resolved: null }],
    uncertain: rule === 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function firstNumber(text: string): number | null {
  const fractions = text.match(/(-?\d+)\s*\/\s*(\d+)/);
  if (fractions) {
    const denominator = Number(fractions[2]);
    if (denominator !== 0) return Number(fractions[1]) / denominator;
  }
  const plain = text.match(/-?\d+(?:\.\d+)?/);
  if (!plain) return null;
  const value = Number(plain[0]);
  return Number.isFinite(value) ? value : null;
}

function allNumbers(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((n) => Number.isFinite(n));
}

/**
 * Classify an observable error.
 *
 * The order of the rules matters: the most specific observable pattern is tested
 * first, so a sign slip is never reported as a generic arithmetic mistake just
 * because it also changed a digit.
 *
 * `expected` may be null, in which case only structural evidence is available and
 * the result is `unknown` rather than a guess.
 */
export function classifyMisconception(input: {
  problem: string;
  learnerAnswer: string;
  expected: string | null;
  concept?: string;
}): MisconceptionEvidence {
  const problem = (input.problem ?? '').trim();
  const learner = (input.learnerAnswer ?? '').trim();
  const expected = input.expected?.trim() ?? null;
  const expectedNumber = expected ? firstNumber(expected) : null;
  const learnerNumber = firstNumber(learner);

  const base = {
    problem,
    learnerAnswer: learner,
    expectedAnswer: expected,
  };

  // --- Domain violation in the submitted step itself.
  if (/\/\s*0(?![.\d])/.test(learner) || /divide\s+by\s+zero/i.test(learner) || /sqrt\(\s*-/.test(learner)) {
    return {
      ...base,
      match: 'method_divergent',
      observation: 'The submitted step divides by zero or takes the root of a negative real number.',
      matchedRule: 'domain_restriction',
    };
  }

  // --- Domain violation visible in the problem: answering with a plain number at all
  //     is the observable error, because no finite number can satisfy it.
  if (learnerNumber !== null && denominatorIsZero(problem)) {
    return {
      ...base,
      match: 'method_divergent',
      observation: 'The problem divides by an expression that evaluates to zero, and the submitted answer is a finite number, so the division is outside its valid domain.',
      matchedRule: 'domain_restriction',
    };
  }

  // --- Unit error: a unit appears in the answer where the problem expects a bare number.
  if (/\d\s*(cm|m|km|kg|g|s|min|ft|in|°|deg|%)\b/i.test(learner) && !/\d\s*(cm|m|km|kg|g|s|min|ft|in|°|deg|%)\b/i.test(problem)) {
    return {
      ...base,
      match: 'method_divergent',
      observation: 'The submitted answer carries a unit that the problem did not ask for.',
      matchedRule: 'unit_error',
    };
  }

  // --- Formula selection: the answer is a symbolic form when a numeric one was expected.
  if (expectedNumber !== null && /[a-z]/i.test(learner.replace(/\b(?:x|y|z|n|a|b|c)\b/gi, '')) === false && /^[a-z]\s*=/i.test(learner.trim())) {
    return {
      ...base,
      match: 'method_divergent',
      observation: 'The submitted answer is left in an unsolved symbolic form instead of being solved for the variable.',
      matchedRule: 'formula_selection_error',
    };
  }

  if (expectedNumber === null || learnerNumber === null) {
    // No comparable numeric pair. Say so rather than inventing a class.
    return {
      ...base,
      match: 'no_comparison',
      observation: 'No numeric pair was available, so the error could not be classified from the submitted work alone.',
      matchedRule: 'unclassified',
    };
  }

  const gap = Math.abs(learnerNumber - expectedNumber);

  // --- Correct submission: not a misconception at all.
  //     Checked first, before any error rule, so a right answer can never be
  //     reported as a wrong one.
  if (gap < 1e-9) {
    return {
      ...base,
      match: 'correct',
      numericGap: 0,
      observation: `The submitted value ${learnerNumber} matches the verified result ${expectedNumber}.`,
      matchedRule: 'correct',
    };
  }

  // --- Sign error: identical magnitude, opposite sign. The most specific pattern.
  if (Math.abs(learnerNumber + expectedNumber) < 1e-9 && Math.abs(learnerNumber) > 1e-9) {
    return {
      ...base,
      match: 'sign_only',
      numericGap: gap,
      observation: `The submitted value ${learnerNumber} is the exact negative of the correct magnitude ${expectedNumber}, so only the sign differs.`,
      matchedRule: 'sign_error',
    };
  }

  // --- Sign error expressed in the working rather than the final value:
  //     a term changed sign between the problem and the submitted step.
  const problemTerms = allNumbers(problem);
  const learnerTerms = allNumbers(learner);
  if (problemTerms.length && learnerTerms.length) {
    const problemNegatives = problemTerms.filter((n) => n < 0).length;
    const learnerNegatives = learnerTerms.filter((n) => n < 0).length;
    if (learnerNegatives !== problemNegatives && learnerTerms.length === problemTerms.length) {
      return {
        ...base,
        match: 'sign_only',
        numericGap: gap,
        observation: `The number of negative terms changed from ${problemNegatives} to ${learnerNegatives} between the problem and the submitted step, so a sign was dropped or added.`,
        matchedRule: 'sign_error',
      };
    }
  }

  // --- Distribution: an outside factor applied to only part of a bracketed sum.
  //     Tested before the left-to-right check because "multiply only the first term"
  //     also satisfies the left-to-right pattern; distribution is the more specific
  //     and more actionable description of the same observable value.
  if (/\(\s*\d+\s*[*x]\s*\d+\s*\+\s*\d+\s*\)/i.test(problem) || /\d+\s*[*x]\s*\(\s*\d+\s*\+\s*\d+\s*\)/i.test(problem)) {
    const distributed = distributeOverSum(problem);
    if (distributed !== null && Math.abs(distributed - learnerNumber) < 1e-9 && Math.abs(distributed - expectedNumber) > 1e-9) {
      return {
        ...base,
        match: 'method_divergent',
        numericGap: gap,
        observation: `The submitted value matches multiplying only the first term of the bracket (${distributed}) and leaving the rest untouched.`,
        matchedRule: 'operation_error',
      };
    }
  }

  // --- Order of operations: the answer matches evaluating left-to-right without precedence.
  //     The guard requires both an additive and a multiplicative operator, in either
  //     order. Requiring a literal "+" would miss "10 - 2 * 3", where the error is the
  //     same: multiplication performed before the subtraction.
  if (hasAdditiveOperator(problem) && hasMultiplicativeOperator(problem)) {
    const leftToRight = evaluateLeftToRight(problem);
    if (leftToRight !== null && Math.abs(leftToRight - learnerNumber) < 1e-9 && Math.abs(leftToRight - expectedNumber) > 1e-9) {
      return {
        ...base,
        match: 'method_divergent',
        numericGap: gap,
        observation: `The submitted value matches evaluating the operations strictly left to right (${leftToRight}), ignoring operator precedence.`,
        matchedRule: 'order_of_operations_error',
      };
    }
  }

  // --- Fraction handling: the answer matches a common denominator slip.
  if (/\//.test(problem) || /\//.test(learner)) {
    const asSingleFraction = firstNumber(learner.replace(/\s/g, ''));
    if (asSingleFraction !== null && Math.abs(asSingleFraction - expectedNumber) < 1e-9) {
      return {
        ...base,
        match: 'magnitude_close',
        numericGap: gap,
        observation: 'The submitted value is algebraically equal to the expected value but written as a single fraction rather than in the requested form.',
        matchedRule: 'fraction_error',
      };
    }
  }

  // --- Variable isolation: the original left-hand constant and the original
  //     right-hand value both ended up on the same side of the equals sign. That is
  //     the observable signature of moving a term across "=" without applying the
  //     same operation to both sides, e.g. "2x + 5 = 17" becoming "2x = 5 - 17".
  if (expectedNumber !== null && gap > 1e-9 && /=/.test(problem) && /=/.test(learner)) {
    const problemParts = problem.split('=');
    const learnerParts = learner.split('=');
    if (problemParts.length === 2 && learnerParts.length === 2) {
      const problemLeftNumbers = allNumbers(problemParts[0]);
      const problemRightNumbers = allNumbers(problemParts[1]);
      const learnerRightNumbers = allNumbers(learnerParts[1]);
      // Only genuine constants count as "moved". A number attached to a variable,
      // such as the 2 in "2x", is the coefficient and correctly stays on the left,
      // so including it would make this rule unreachable for every linear equation.
      const problemConstants = allNumbers(problemParts[0].replace(/\d+\s*[a-z]\w*/gi, ' '));
      const movedConstant = problemConstants.length > 0
        && problemConstants.every((n) => learnerRightNumbers.some((r) => Math.abs(r - n) < 1e-9));
      // Compared by magnitude, because carrying a value across the equals sign
      // usually flips its sign ("2x = 5 - 17") and it is still the same value.
      const alsoCarriedRight = problemRightNumbers.length > 0
        && problemRightNumbers.every((n) => learnerRightNumbers.some((r) => Math.abs(Math.abs(r) - Math.abs(n)) < 1e-9));
      if (movedConstant && alsoCarriedRight) {
        return {
          ...base,
          match: 'method_divergent',
          numericGap: gap,
          observation: 'The submitted step moved a term across the equals sign but left the original right-hand value on the same side, so the operation was not applied to both sides.',
          matchedRule: 'variable_isolation_error',
        };
      }
    }
  }

  // --- Arithmetic slip: close but not exact, and the working used the right method.
  if (gap > 1e-9 && gap <= Math.max(1, Math.abs(expectedNumber)) * 0.25) {
    return {
      ...base,
      match: 'magnitude_close',
      numericGap: gap,
      observation: `The submitted value ${learnerNumber} is close to the correct ${expectedNumber}, differing by ${Number(gap.toPrecision(4))}, which is consistent with an arithmetic slip in an otherwise correct method.`,
      matchedRule: 'arithmetic_mistake',
    };
  }

  // --- Generic algebraic divergence.
  return {
    ...base,
    match: 'method_divergent',
    numericGap: gap,
    observation: `The submitted value ${learnerNumber} does not match the correct ${expectedNumber} and does not match a single identifiable arithmetic pattern.`,
    matchedRule: 'algebraic_manipulation_error',
  };
}

/** True when the expression contains an additive operator outside an exponent. */
function hasAdditiveOperator(text: string): boolean {
  const body = text.replace(/\^/g, ' ');
  return /[+\-]/.test(body);
}

/** True when the expression contains a multiplicative operator outside an exponent. */
function hasMultiplicativeOperator(text: string): boolean {
  const body = text.replace(/\^/g, ' ');
  return /[*\/x]/.test(body) && /[*\/]/.test(body);
}

/** Evaluate strictly left to right, ignoring precedence. Used only to detect that pattern. */
function evaluateLeftToRight(text: string): number | null {
  const tokens = text.match(/\d+(?:\.\d+)?|[+\-*/]/g);
  if (!tokens || tokens.length < 3) return null;
  let accumulator = Number(tokens[0]);
  if (!Number.isFinite(accumulator)) return null;
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const operand = Number(tokens[i + 1]);
    if (!Number.isFinite(operand)) return null;
    if (operator === '+') accumulator += operand;
    else if (operator === '-') accumulator -= operand;
    else if (operator === '*') accumulator *= operand;
    else if (operator === '/') {
      if (operand === 0) return null;
      accumulator /= operand;
    } else return null;
  }
  return accumulator;
}

/** Multiply only the first term of the first bracket. Used only to detect that pattern. */
function distributeOverSum(text: string): number | null {
  const match = text.match(/(\d+)\s*[*x]\s*\((\d+)\s*\+\s*(\d+)\)/i);
  if (!match) return null;
  const coefficient = Number(match[1]);
  const first = Number(match[2]);
  const second = Number(match[3]);
  if (![coefficient, first, second].every(Number.isFinite)) return null;
  return coefficient * first + second;
}

/** True when the problem divides by something that evaluates to zero. */
function denominatorIsZero(text: string): boolean {
  if (/\/\s*0(?![.\d])/.test(text)) return true;
  // A bracketed denominator such as "1 / (4 - 4)".
  const bracket = text.match(/\/\s*\(([^()]*)\)/);
  if (!bracket) return false;
  const evaluated = calculateExpression(bracket[1].replace(/[a-z]+/gi, '0'));
  return !evaluated.error && Number.isFinite(evaluated.value) && Math.abs(evaluated.value) < 1e-12;
}

/** Difference between the numeric terms on the two sides of an equation. */
function sideDifference(text: string): number | null {
  const [left, right] = text.split('=');
  if (left === undefined || right === undefined) return null;
  const leftValue = firstNumber(left);
  const rightValue = firstNumber(right);
  if (leftValue === null || rightValue === null) return null;
  return leftValue - rightValue;
}

// ---------------------------------------------------------------------------
// Hint selection
// ---------------------------------------------------------------------------

export interface TargetedHint {
  /** 1..5. Higher means closer to a completed step. */
  rung: number;
  /** The error class this hint was selected for. */
  errorClass: MisconceptionClass;
  /** Short factual title, e.g. "Sign of the term changed". */
  title: string;
  /** The hint body. Never contains the final answer below rung 5. */
  body: string;
  /** True when the learner could not be classified, so the hint is deliberately general. */
  generic: boolean;
  /** The next question to ask, chosen to differ from the one just answered. */
  followUp: { prompt: string; kind: 'targeted-step' | 'self-check' | 'retry-variant' };
}

/**
 * Per-class hint content.
 *
 * Each entry states the observed pattern and the governing rule, in that order, so
 * the learner sees *why this hint appeared* rather than a generic encouragement.
 * `rungAt` returns the body for a given rung; rungs 1-4 never reveal the answer.
 */
type HintContent = (context: { problem: string; expected: string | null; observation: string }) => Record<number, string>;

const HINT_CONTENT: Record<Exclude<MisconceptionClass, 'unknown'>, HintContent> = {
  sign_error: ({ problem }) => ({
    1: 'A sign changed between the problem and your step. Everything else matches.',
    2: 'When a term moves to the other side of an equals sign, its sign flips. Check each term that moved.',
    3: 'Take the problem term by term and write down what each one becomes on the other side of the equals sign.',
    4: 'Rewrite the step with parentheses around every moved term, making each flip explicit.',
    5: `Rewrite the whole step from ${problem} with each moved term parenthesised, then simplify.`,
  }),
  operation_error: ({ problem }) => ({
    1: 'The operation was applied to part of the bracket rather than to all of it.',
    2: 'A multiplication outside brackets must reach every term inside them.',
    3: 'List the terms inside the bracket one per line, then apply the outside operation to each in turn.',
    4: `Expand ${problem} term by term before combining anything.`,
    5: 'Expand fully, then collect like terms.',
  }),
  order_of_operations_error: ({ problem }) => ({
    1: 'The value matches working left to right, but brackets and multiplication come before addition.',
    2: 'Order of operations: brackets first, then multiplication and division, then addition and subtraction.',
    3: 'Evaluate the bracket on its own first and write down its value.',
    4: `Rewrite ${problem} with the bracket replaced by its value, then continue left to right.`,
    5: 'Evaluate brackets, then products and quotients, then the remaining additions and subtractions.',
  }),
  arithmetic_mistake: ({ problem }) => ({
    1: 'The method looks right and the value is close, so the slip is in the arithmetic itself.',
    2: 'Recompute the step one operation at a time and compare each intermediate value with your working.',
    3: 'Write down the result of each individual operation before combining them.',
    4: `Substitute the intermediate values back into ${problem} and check each one.`,
    5: 'Recompute the whole expression, writing every intermediate result.',
  }),
  variable_isolation_error: () => ({
    1: 'The two sides of your equation no longer differ by the same amount as the original.',
    2: 'Any operation on an equals sign must be applied to both sides, or equality is lost.',
    3: 'Write the left side and the right side on separate lines, then apply the operation to each.',
    4: 'Perform the operation on both sides explicitly, one side per line.',
    5: 'Isolate the variable term on one side and the constants on the other, one operation per line.',
  }),
  algebraic_manipulation_error: ({ problem }) => ({
    1: 'The value diverges without matching a single arithmetic pattern, so the transformation itself needs checking.',
    2: 'Check that every term on the left also changed on the right.',
    3: 'Compare the problem and your step term by term and find the first term that differs.',
    4: `Line up the terms of ${problem} above your step and reconcile them one at a time.`,
    5: 'Rewrite the step from the problem, transforming one term at a time.',
  }),
  fraction_error: () => ({
    1: 'The value is mathematically equal to the correct one but written in a different form.',
    2: 'A single fraction needs one common denominator across all its terms.',
    3: 'Find the least common denominator of the terms, then rewrite each term over it.',
    4: 'Rewrite every term over the common denominator before combining.',
    5: 'Combine over the common denominator, then simplify the result.',
  }),
  unit_error: () => ({
    1: 'The answer includes a unit that the question did not ask for.',
    2: 'Include a unit only when the quantity being measured is named in the question.',
    3: 'Re-read the question and list the quantity it asks for.',
    4: 'Restate the answer as the bare number the question requested.',
    5: 'Give the number on its own.',
  }),
  domain_restriction: () => ({
    1: 'This step evaluates an expression outside its valid domain.',
    2: 'Division by zero is undefined, and a real square root needs a non-negative argument.',
    3: 'Identify the value of the denominator and check whether it can be zero.',
    4: 'State the restriction explicitly before dividing or taking the root.',
    5: 'State the domain restriction, then solve within it.',
  }),
  assumption_error: () => ({
    1: 'A step depends on a condition the problem did not guarantee.',
    2: 'Every algebraic move has preconditions; check the ones this step needs.',
    3: 'List the conditions the problem guarantees, then check your step against them.',
    4: 'State the condition your step needs and show the problem supplies it.',
    5: 'State the assumption and complete the step under it.',
  }),
  formula_selection_error: () => ({
    1: 'The answer was left in an unsolved form rather than isolated.',
    2: 'Solving for a variable means isolating it, not restating the relationship.',
    3: 'Identify which side the variable is on and what it is attached to.',
    4: 'Apply the inverse of the operation joining the variable to the rest.',
    5: 'Isolate the variable completely.',
  }),
  conceptual_misunderstanding: () => ({
    1: 'The approach differs from the expected one, so the governing rule is worth revisiting.',
    2: 'Restate the rule this problem depends on before continuing.',
    3: 'Write the rule in your own words, then apply it to one term.',
    4: 'Apply the rule step by step, showing each intermediate value.',
    5: 'Complete the solution using the rule, one step at a time.',
  }),
};

const TITLES: Record<MisconceptionClass, string> = {
  sign_error: 'Sign changed',
  operation_error: 'Operation applied to only part of the bracket',
  order_of_operations_error: 'Operator precedence not applied',
  arithmetic_mistake: 'Arithmetic slip',
  variable_isolation_error: 'Operation not applied to both sides',
  algebraic_manipulation_error: 'Transformation diverges',
  fraction_error: 'Fraction form differs',
  unit_error: 'Unexpected unit',
  domain_restriction: 'Outside the valid domain',
  assumption_error: 'Unstated condition',
  formula_selection_error: 'Variable not isolated',
  conceptual_misunderstanding: 'Different approach',
  unknown: 'Error not classified',
};

const GENERIC_HINT = {
  1: 'The value does not match the verified result, and the submitted step does not match a specific arithmetic pattern I can name.',
  2: 'Work one operation at a time and record each intermediate value.',
  3: 'Rewrite the step showing every intermediate value.',
  4: 'Substitute your intermediate values back into the problem to find where they diverge.',
  5: 'Recompute the step from the problem, one operation per line.',
};

/**
 * Choose a hint from evidence rather than from a position in a ladder.
 *
 * `previousRung` only ever *increases* the rung. It is a floor, not a selector: a
 * learner whose error changes class gets the new class's rung-1 content rather than
 * being advanced mechanically through an unrelated sequence.
 */
export function selectTargetedHint(input: {
  state: MisconceptionState;
  previousRung?: number | null;
  /** Whether the current mode permits revealing the final answer. */
  mayRevealAnswer?: boolean;
}): TargetedHint {
  const { state, previousRung = null, mayRevealAnswer = false } = input;
  const context = {
    problem: state.latest?.problem ?? '',
    expected: state.latest?.expectedAnswer ?? null,
    observation: state.latest?.observation ?? '',
  };

  const rung = Math.min(Math.max((previousRung ?? 0) + 1, 1), 5);

  if (state.errorClass === 'unknown' || state.uncertain) {
    return {
      rung: 1,
      errorClass: 'unknown',
      title: TITLES.unknown,
      // Explicitly flags that the system could not name the error, so a generic
      // hint is never mistaken for a targeted one.
      body: `${GENERIC_HINT[1]} I cannot identify a specific error pattern from this step, so this hint is general rather than targeted.`,
      generic: true,
      followUp: buildFollowUp(state, 'self-check'),
    };
  }

  const content = HINT_CONTENT[state.errorClass](context);
  const body = content[rung] ?? content[5] ?? GENERIC_HINT[5];
  const finalBody = rung === 5 && mayRevealAnswer && state.latest?.expectedAnswer
    ? `${body} The verified result is ${state.latest.expectedAnswer}.`
    : body;

  return {
    rung,
    errorClass: state.errorClass,
    title: TITLES[state.errorClass],
    body: finalBody,
    generic: false,
    followUp: buildFollowUp(state, rung <= 2 ? 'targeted-step' : rung <= 4 ? 'self-check' : 'retry-variant'),
  };
}

/**
 * Build the next question.
 *
 * It must not repeat the question just answered, so a targeted prompt is derived from
 * the specific defect rather than re-asking the original problem.
 */
function buildFollowUp(state: MisconceptionState, kind: TargetedHint['followUp']['kind']): TargetedHint['followUp'] {
  const problem = state.latest?.problem ?? 'the problem';
  const evidence = state.latest?.observation ?? 'the submitted step';

  switch (state.errorClass) {
    case 'sign_error':
      return {
        kind,
        prompt: `In "${problem}", write each term on the left with parentheses, then state which terms change sign when they move to the right.`,
      };
    case 'order_of_operations_error':
      return {
        kind,
        prompt: `In "${problem}", what is the value of the bracket on its own, before any multiplication?`,
      };
    case 'operation_error':
      return {
        kind,
        prompt: `In "${problem}", list every term inside the brackets on its own line, then apply the outside operation to each.`,
      };
    case 'variable_isolation_error':
      return {
        kind,
        prompt: `In "${problem}", state the left side and the right side separately, then apply the operation to each.`,
      };
    case 'fraction_error':
      return {
        kind,
        prompt: `In "${problem}", what is the least common denominator of the terms?`,
      };
    case 'unit_error':
      return { kind, prompt: `Re-read "${problem}" and state exactly what quantity it asks for.` };
    case 'domain_restriction':
      return { kind, prompt: `In "${problem}", what value would make the denominator zero?` };
    case 'formula_selection_error':
      return { kind, prompt: `In "${problem}", which operation is joining the variable to the rest of the expression?` };
    case 'arithmetic_mistake':
      return { kind, prompt: `In "${problem}", state the result of the first operation only, before doing any others.` };
    case 'assumption_error':
      return { kind, prompt: `In "${problem}", what condition must hold for that step to be valid?` };
    case 'algebraic_manipulation_error':
      return { kind, prompt: `Compare "${problem}" with your step term by term, and name the first term that differs.` };
    case 'conceptual_misunderstanding':
      return { kind, prompt: `State in one sentence the rule that "${problem}" depends on.` };
    default:
      return { kind, prompt: `Given that ${evidence.toLowerCase()}, what is the first intermediate value in "${problem}"?` };
  }
}

// ---------------------------------------------------------------------------
// Recovery tracking
// ---------------------------------------------------------------------------

/**
 * Fold a new attempt into the state and resolve the previous hint's outcome.
 *
 * The previous hint counts as resolved only when a *later* attempt is correct.
 * An unclassified follow-up neither resolves nor reopens the hint, because absence of
 * a numeric answer is not evidence either way.
 */
export function recordMisconceptionAttempt(
  state: MisconceptionState,
  evidence: MisconceptionEvidence,
  hintRungGiven: number | null,
  outcome: 'correct' | 'incorrect' | 'no-answer',
): MisconceptionState {
  const resolved: boolean | null = outcome === 'correct' ? true : outcome === 'incorrect' ? false : null;
  const sameClass = evidence.matchedRule === 'unclassified' ? 'unknown' : evidence.matchedRule;

  const attempt: MisconceptionAttempt = { at: Date.now(), evidence, hintRungGiven, resolved };

  // A change of error class is a genuinely new observation, so it starts a new
  // record rather than inflating the old one's occurrence count.
  if (sameClass !== state.errorClass && state.occurrences > 0 && !state.uncertain) {
    return {
      ...createMisconceptionState(state.concept, evidence),
      affectedStep: state.affectedStep,
      history: [...state.history, attempt].slice(-MAX_HISTORY),
      previousHintRung: hintRungGiven,
      previousHintResolved: resolved,
    };
  }

  const occurrences = sameClass === state.errorClass ? state.occurrences + 1 : state.occurrences;
  const evidenceList = sameClass === state.errorClass
    ? [...state.evidence, evidence.observation].slice(-MAX_EVIDENCE)
    : [evidence.observation];

  return {
    ...state,
    errorClass: sameClass as MisconceptionClass,
    evidence: evidenceList,
    latest: evidence,
    occurrences,
    previousHintRung: hintRungGiven ?? state.previousHintRung,
    previousHintResolved: resolved ?? (state.previousHintRung === null ? null : state.previousHintResolved),
    history: [...state.history, attempt].slice(-MAX_HISTORY),
    uncertain: sameClass === 'unknown',
  };
}

export interface RecoveryMeasurement {
  concept: string;
  errorClass: MisconceptionClass;
  /** Attempts recorded for this concept and class. */
  attempts: number;
  /** True when a correct answer followed a wrong one. */
  recovered: boolean;
  /** Number of distinct follow-up prompts issued. */
  distinctFollowUps: number;
  /** True when the same follow-up prompt was issued more than once in a row. */
  repeatedIdenticalFollowUp: boolean;
  /** True when the hint content changed as the error class changed. */
  hintChangedWithErrorClass: boolean;
}
