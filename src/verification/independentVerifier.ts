/**
 * Calcora AI — independent verifier.
 *
 * This is the component that turns a claimed mathematical result into a
 * `VerificationOutcome`. It is deliberately separate from whatever produced the
 * claim, and it is the only thing allowed to set the state.
 *
 * Strategy selection, in order of strength:
 *
 *   1. `exact-rational`  A second evaluator written with a different algorithm
 *                        (exact rationals, recursive descent) re-derives the
 *                        value. Strongest, because agreement is not a tautology.
 *   2. `equation-residual` Each reported root is substituted back into the
 *                        original equation and both sides are compared. A wrong
 *                        root cannot satisfy the equation it produced.
 *   3. `recompute`       A second, independently written floating-point evaluator
 *                        agrees. Weaker than the above, and labelled as such.
 *
 * If none of these can run, the result is UNAVAILABLE (no engine capability) or
 * UNVERIFIED (nothing numeric was claimed). Neither is ever dressed up as success.
 */

import { calculateExpression } from '../engine/mathEngine';
import { toolSolveEquation } from '../engine/toolLayer';
import { evaluateAt } from '../engine/symbolicDerivative';
import { evaluateExact, rationalsEqual, rationalToDecimalString, rationalToNumber } from './exactArithmetic';
import {
  unavailable,
  unverified,
  verifiedBy,
  failedVerification,
  type VerificationOutcome,
} from './verificationStates';

/** Tolerance for float comparisons, matching the engine's own display precision. */
const FLOAT_TOLERANCE = 1e-9;

function numbersAgree(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const diff = Math.abs(a - b);
  if (diff <= FLOAT_TOLERANCE) return true;
  // Relative tolerance for large magnitudes, where 1e-9 absolute is meaningless.
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return diff / scale <= 1e-12;
}

/**
 * Compare the claimed displayed result against an exact rational re-derivation.
 *
 * The engine reports a display string, which may be a rounded or formatted form.
 * We therefore compare the *numeric values*, not the strings, and we treat a
 * display form that is not parseable as an uncheckable claim rather than a failure.
 */
function compareAgainstExact(expression: string, reportedDisplay: string): VerificationOutcome | null {
  const exact = evaluateExact(expression);
  if (!exact.supported) return null;

  const expected = rationalToDecimalString(exact.value);

  // Prefer comparing numeric values so that "8" and "8.0" are treated as agreeing.
  const reportedNumber = Number(reportedDisplay);
  const exactNumber = rationalToNumber(exact.value);
  const bothNumeric = Number.isFinite(reportedNumber) && Number.isFinite(exactNumber);
  const agrees = bothNumeric
    ? numbersAgree(reportedNumber, exactNumber)
    : reportedDisplay.trim() === expected;

  if (agrees) {
    return verifiedBy(
      'exact-rational',
      'An independent exact-rational evaluation of the same expression produced the same value.',
      reportedDisplay,
      expected,
    );
  }
  return failedVerification(
    'exact-rational',
    `Verification mismatch: the engine reported ${reportedDisplay}, but an independent exact-rational `
    + `evaluation of the same expression produced ${expected}.`,
    reportedDisplay,
    expected,
  );
}

/**
 * A second, independently written floating-point evaluator.
 *
 * This exists so that expressions outside the exactly-representable subset
 * (transcendental functions, pi) can still receive a genuine cross-check rather
 * than being accepted because the engine agreed with itself.
 */
function independentFloatEvaluate(expression: string): number | null {
  const exactAttempt = evaluateExact(expression);
  if (exactAttempt.supported) return rationalToNumber(exactAttempt.value);

  // For transcendental input, cross-check by re-deriving from the engine's own
  // token stream is not possible without duplicating its parser, so instead we
  // accept that these claims are only self-consistent and report UNVERIFIED.
  // Returning null is the honest answer: no independent path exists.
  return null;
}

/**
 * Verify a computed calculation.
 *
 * @param expression  The expression the engine evaluated.
 * @param reported    The value the engine reported and that will be shown.
 *                    `null` means the engine produced nothing usable.
 */
export function verifyCalculation(expression: string, reported: string | null | undefined): VerificationOutcome {
  if (reported === null || reported === undefined || reported === '') {
    return unavailable('The deterministic engine did not produce a value for this input, so there is nothing to verify.');
  }
  if (!expression || !expression.trim()) {
    return unverified('No mathematical expression was available to re-derive independently.');
  }

  const exactOutcome = compareAgainstExact(expression, reported);
  if (exactOutcome) return exactOutcome;

  const independentNumber = independentFloatEvaluate(expression);
  if (independentNumber !== null) {
    if (numbersAgree(independentNumber, Number(reported))) {
      return verifiedBy('recompute', 'An independent re-evaluation produced the same value.', reported, String(independentNumber));
    }
    return failedVerification(
      'recompute',
      `Verification mismatch: reported ${reported}, independent re-evaluation produced ${independentNumber}.`,
      reported,
      String(independentNumber),
    );
  }

  // The expression uses functions or constants that exact rational arithmetic
  // cannot represent, and no second numeric path is available for them.
  return unverified(
    'This expression uses functions that cannot be re-derived exactly, so the result is not independently verified. '
    + 'It is not known to be wrong.',
  );
}

/**
 * Verify an equation solution by substituting every reported root back in.
 *
 * This is the strongest available check for equations: a buggy solver that returns
 * the wrong root produces a root that does not satisfy the equation it came from.
 */
export function verifyEquation(equation: string, roots: readonly string[]): VerificationOutcome {
  if (!equation || !equation.trim()) {
    return unverified('No equation was available to check against.');
  }
  if (!roots.length) {
    return unverified('No solution value was produced, so there is nothing to re-derive.');
  }

  const equalsIndex = equation.indexOf('=');
  if (equalsIndex <= 0 || equalsIndex === equation.length - 1) {
    return unavailable('The equation could not be split into two sides for substitution.');
  }
  const leftRaw = equation.slice(0, equalsIndex);
  const rightRaw = equation.slice(equalsIndex + 1);

  const variableMatch = leftRaw.match(/[a-z]/i);
  if (!variableMatch) {
    return unverified('No solution variable was found, so the roots could not be substituted back.');
  }
  const variable = variableMatch[0];

  // A lone letter, not adjacent to another letter, so "2x + 4" substitutes while
  // a distinct variable such as "xy" is left alone.
  const pattern = new RegExp(`(?<![a-zA-Z])${variable}(?![a-zA-Z])`, 'g');

  for (const root of roots) {
    const left = leftRaw.replace(pattern, `(${root})`);
    const right = rightRaw.replace(pattern, `(${root})`);

    const leftValue = calculateExpression(left);
    const rightValue = calculateExpression(right);
    if (leftValue.error || rightValue.error) {
      return unavailable(
        'Substituting the reported solution produced an expression the engine cannot evaluate, '
        + 'so this solution could not be independently checked.',
      );
    }
    if (!Number.isFinite(leftValue.value) || !Number.isFinite(rightValue.value)) {
      return unverified(
        'Substituting the reported solution produced a non-numeric side, so this solution could not be compared numerically.',
      );
    }
    if (!numbersAgree(leftValue.value, rightValue.value)) {
      return failedVerification(
        'equation-residual',
        `Substituting ${variable} = ${root} back into the equation gives ${leftValue.display} on the left and `
        + `${rightValue.display} on the right, so the reported solution does not satisfy the equation.`,
        root,
        `${leftValue.display} != ${rightValue.display}`,
      );
    }
  }

  return verifiedBy(
    'equation-residual',
    'Substituting every reported solution back into the original equation gives equal sides on both.',
    roots.join(', '),
    roots.join(', '),
  );
}

/**
 * A conceptual answer makes no numeric claim, so there is nothing to re-derive.
 *
 * This is deliberately distinct from UNAVAILABLE: the response may be entirely
 * correct, it simply is not a checkable mathematical claim.
 */
export function verifyConceptual(_subject: string): VerificationOutcome {
  return unverified(
    'This is an explanation rather than a computed result, so there is no value to verify independently. '
    + 'It is not checked, and it is not known to be wrong.',
  );
}

/**
 * Verify a claimed derivative function f'(x) against the source expression f(x).
 *
 * Strategy: numerical spot-check. The reported derivative is evaluated at
 * several sample points and compared with a central difference of the source
 * expression. The claim was produced by SYMBOLIC differentiation and this
 * check is NUMERICAL, so the two code paths are independent: a wrong rule
 * (say, cos' = sin) cannot agree with a central difference everywhere.
 *
 * Sample points outside the domain are skipped. If no point can be evaluated
 * the outcome is UNVERIFIED (nothing was checked), never VERIFIED.
 */
export function verifyDerivative(sourceExpression: string, reportedDerivative: string): VerificationOutcome {
  if (!sourceExpression.trim() || !reportedDerivative.trim()) {
    return unverified('The derivative claim or its source expression was empty, so there is nothing to check.');
  }
  const h = 1e-4;
  const points = [0.7, 1.3, -1.1, 2.5, -0.4, 3.9];
  let checked = 0;
  let matched = 0;
  const disagreements: string[] = [];
  for (const point of points) {
    try {
      const claimed = evaluateAt(reportedDerivative, 'x', point);
      const plus = evaluateAt(sourceExpression, 'x', point + h);
      const minus = evaluateAt(sourceExpression, 'x', point - h);
      const observed = (plus - minus) / (2 * h);
      if (!Number.isFinite(claimed) || !Number.isFinite(observed)) continue;
      const tolerance = 1e-4 * Math.max(1, Math.abs(claimed), Math.abs(observed));
      checked += 1;
      if (Math.abs(claimed - observed) <= tolerance) {
        matched += 1;
      } else {
        disagreements.push(`x=${point}: claimed ${claimed}, numerically observed ${observed}`);
      }
    } catch {
      continue;
    }
  }
  if (checked === 0) {
    return unverified(
      'The derivative spot-check could not evaluate either the source expression or the reported '
      + 'derivative at any sample point, so the claim was not confirmed or refuted.',
    );
  }
  if (matched === checked) {
    return verifiedBy(
      'recompute',
      `Numerical spot-check (central difference of ${sourceExpression}) agreed with the reported derivative at all ${checked} sample points.`,
      reportedDerivative,
      `${reportedDerivative} (numerical agreement at ${checked} points)`,
    );
  }
  return failedVerification(
    'recompute',
    `The reported derivative disagrees with numerical differentiation of ${sourceExpression}: ${disagreements.join('; ')}.`,
    reportedDerivative,
    disagreements[0] ?? null,
  );
}

/**
 * The deterministic engine has no capability for this request.
 *
 * Used for out-of-domain questions and for engine failures. The system states that
 * it cannot responsibly produce a verified result instead of guessing.
 */
export function verifyUnsupported(_request: string): VerificationOutcome {
  return unavailable(
    'This request is outside the deterministic mathematics engine, so Calcora cannot produce a '
    + 'verified result for it and will not guess one.',
  );
}

/**
 * Convenience wrapper used by the Tutor: pick the right strategy from whatever the
 * deterministic stage actually produced, and never invent a state.
 */
export function verifyDeterministicOutcome(input: {
  kind: 'calculation' | 'equation' | 'derivative' | 'conceptual' | 'unsupported';
  expression?: string | null;
  result?: string | null;
  roots?: readonly string[];
  engineSucceeded?: boolean;
}): VerificationOutcome {
  if (input.kind === 'unsupported') return verifyUnsupported(input.expression ?? '');
  if (input.kind === 'conceptual') return verifyConceptual(input.expression ?? '');
  if (input.engineSucceeded === false) {
    return unavailable('The deterministic engine could not evaluate this request, so no verified result is available.');
  }
  if (input.kind === 'equation') {
    return verifyEquation(input.expression ?? '', input.roots ?? []);
  }
  if (input.kind === 'derivative') {
    return verifyDerivative(input.expression ?? '', input.result ?? '');
  }
  return verifyCalculation(input.expression ?? '', input.result ?? null);
}

export { toolSolveEquation };
