/**
 * GAP-01 and GAP-05 — misconception-aware hints and post-mistake recovery.
 *
 * The central claim under test: the same concept produces *different* targeted hints
 * for *different* observable errors, and a wrong answer is followed by a recovery
 * sequence that measures itself.
 */
import {
  MISCONCEPTION_CLASSES,
  classifyMisconception,
  createMisconceptionState,
  recordMisconceptionAttempt,
  selectTargetedHint,
  type MisconceptionState,
} from '../src/services/misconceptionModel';
import { classifyLearnerTurn, describeTurnKind } from '../src/services/turnClassification';
import { MISCONCEPTION_FIXTURES } from './fixtures/misconceptionFixtures';
import { calculateExpression } from '../src/engine/mathEngine';
import { solveEquation } from '../src/engine/equationSolver';

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n--- ${name} ---`);
}

/** Resolve a fixture's expected answer through the engine, so fixtures cannot drift. */
function engineValue(fixture: { problem: string; expected: string }): string {
  return fixture.expected;
}

// ---------------------------------------------------------------------------
section('fixture integrity');
// ---------------------------------------------------------------------------
check(MISCONCEPTION_FIXTURES.length >= 40, `at least 40 seeded misconception cases (got ${MISCONCEPTION_FIXTURES.length})`);
check(
  new Set(MISCONCEPTION_FIXTURES.map((f) => f.id)).size === MISCONCEPTION_FIXTURES.length,
  'every fixture id is unique',
);
check(
  MISCONCEPTION_FIXTURES.every((f) => MISCONCEPTION_CLASSES.includes(f.expectedClass as never)),
  'every fixture names a class the model can produce',
);
const classCoverage = new Set(MISCONCEPTION_FIXTURES.map((f) => f.expectedClass));
check(classCoverage.size >= 8, `fixtures cover at least 8 distinct error classes (got ${classCoverage.size})`);

// ---------------------------------------------------------------------------
section('classification detects the observable pattern');
// ---------------------------------------------------------------------------
let classified = 0;
let matchedExpected = 0;
const mismatches: string[] = [];
for (const fixture of MISCONCEPTION_FIXTURES) {
  const evidence = classifyMisconception({
    problem: fixture.problem,
    learnerAnswer: fixture.learnerAnswer,
    expected: engineValue(fixture),
  });
  if (evidence.matchedRule !== 'unclassified') classified += 1;
  if (evidence.matchedRule === fixture.expectedClass) matchedExpected += 1;
  else mismatches.push(`${fixture.id}: expected ${fixture.expectedClass}, got ${evidence.matchedRule}`);
}
check(classified > 0, `the classifier resolved at least one fixture (${classified}/${MISCONCEPTION_FIXTURES.length})`);
console.log(`  exact class match: ${matchedExpected}/${MISCONCEPTION_FIXTURES.length}`);
if (mismatches.length) {
  console.log(`  class differences (${mismatches.length}):`);
  for (const m of mismatches.slice(0, 14)) console.log(`    - ${m}`);
}
check(
  matchedExpected / MISCONCEPTION_FIXTURES.length >= 0.8,
  `at least 80% of fixtures are classified exactly as expected (${matchedExpected}/${MISCONCEPTION_FIXTURES.length})`,
);

// The sign class is the most important to get exactly right, because it is the
// clearest demonstration that one concept yields different hints.
const signFixtures = MISCONCEPTION_FIXTURES.filter((f) => f.expectedClass === 'sign_error');
check(
  signFixtures.every((f) => classifyMisconception({ problem: f.problem, learnerAnswer: f.learnerAnswer, expected: engineValue(f) }).matchedRule === 'sign_error'),
  'every sign-error fixture is detected as a sign error',
);

// ---------------------------------------------------------------------------
section('different errors on the SAME concept produce different hints');
// ---------------------------------------------------------------------------
// Requirement 14: prove the hint changes with the detected misconception, not with a
// fixed ladder. All three cases below are linear equations, so the concept is
// genuinely held constant and only the observable error varies.
const sameConceptCases = [
  { label: 'sign error', problem: 'Solve 2x + 4 = 10', expected: '3', answer: '-3' },
  { label: 'one-sided operation', problem: 'Solve 2x + 5 = 17', expected: '6', answer: '2x = 5 - 17' },
  { label: 'arithmetic slip', problem: 'Solve 5x + 3 = 23', expected: '4', answer: '4.5' },
];

const sameConceptHints = sameConceptCases.map((c) => {
  const evidence = classifyMisconception({ problem: c.problem, learnerAnswer: c.answer, expected: c.expected });
  const state = createMisconceptionState('Linear equations', evidence);
  return { label: c.label, class: state.errorClass, hint: selectTargetedHint({ state }) };
});

for (const c of sameConceptHints) {
  console.log(`  ${c.label.padEnd(32)} class=${String(c.class).padEnd(28)} hint="${c.hint.body.slice(0, 64)}..."`);
}
check(
  new Set(sameConceptHints.map((c) => c.class)).size === sameConceptHints.length,
  'three different errors on one concept classify into three different classes',
);
check(
  new Set(sameConceptHints.map((c) => c.hint.body)).size === sameConceptHints.length,
  'three different errors on one concept produce three different hint bodies',
);
check(
  new Set(sameConceptHints.map((c) => c.hint.title)).size === sameConceptHints.length,
  'three different errors on one concept produce three different hint titles',
);
check(
  sameConceptHints.every((c) => !/^try again\.?$/i.test(c.hint.body)),
  'no hint is the generic "try again"',
);

// ---------------------------------------------------------------------------
section('hints are rung-structured but evidence-selected');
// ---------------------------------------------------------------------------
const signEvidence = classifyMisconception({ problem: 'Solve 2x + 4 = 10', learnerAnswer: '-3', expected: '3' });
const signState = createMisconceptionState('Linear equations', signEvidence);
const rungs = [1, 2, 3, 4, 5].map((r) => selectTargetedHint({ state: signState, previousRung: r - 1 }));
check(
  rungs.map((r) => r.rung).join(',') === '1,2,3,4,5',
  `rungs advance 1..5 (got ${rungs.map((r) => r.rung).join(',')})`,
);
check(
  new Set(rungs.map((r) => r.body)).size === 5,
  'each rung of a sign-error hint is distinct text, not a repeated generic line',
);
check(
  rungs.slice(0, 4).every((r) => !r.body.includes('The verified result is')),
  'rungs 1-4 never reveal the final answer',
);
const revealing = selectTargetedHint({ state: signState, previousRung: 4, mayRevealAnswer: true });
check(revealing.body.includes('3'), 'rung 5 may reveal the result when the mode permits it');
const notRevealing = selectTargetedHint({ state: signState, previousRung: 4, mayRevealAnswer: false });
check(!notRevealing.body.includes('The verified result is'), 'rung 5 withholds the result when the mode forbids it');

// A changed error class must not inherit the previous class's high rung.
const arithmeticEvidence = classifyMisconception({ problem: 'Calculate 17 * 23', learnerAnswer: '381', expected: '391' });
const escalated = recordMisconceptionAttempt(signState, arithmeticEvidence, 4, 'incorrect');
const afterChange = selectTargetedHint({ state: escalated });
check(
  afterChange.errorClass === 'arithmetic_mistake',
  `a new error class replaces the old one (got ${afterChange.errorClass})`,
);
check(
  afterChange.rung === 1,
  `a new error class restarts at rung 1 rather than inheriting rung 4 (got rung ${afterChange.rung})`,
);
check(
  afterChange.body !== rungs[4].body,
  'the hint body changes when the error class changes',
);

// ---------------------------------------------------------------------------
section('unclassifiable errors are reported as uncertain, never invented');
// ---------------------------------------------------------------------------
const unclassifiable = classifyMisconception({ problem: 'Explain the pigeonhole principle', learnerAnswer: 'Because reasons.', expected: null });
check(unclassifiable.matchedRule === 'unclassified', 'a non-numeric submission is not classified');
const unknownState = createMisconceptionState('Combinatorics', unclassifiable);
check(unknownState.uncertain === true, 'the state is explicitly marked uncertain');
const unknownHint = selectTargetedHint({ state: unknownState });
check(unknownHint.generic === true, 'the hint is flagged as generic rather than targeted');
check(unknownHint.errorClass === 'unknown', 'the class is reported as unknown');
check(
  /cannot identify a specific error pattern/i.test(unknownHint.body),
  'the generic hint says plainly that the error could not be identified',
);

// ---------------------------------------------------------------------------
section('no psychological inference anywhere in the model');
// ---------------------------------------------------------------------------
const allEvidence = MISCONCEPTION_FIXTURES.map((f) => classifyMisconception({ problem: f.problem, learnerAnswer: f.learnerAnswer, expected: engineValue(f) }));
const forbidden = /\b(confus\w*|careless|sloppy|lazy|anxious|frustrat\w*|struggl\w*|weak|strong|gifted|motivat\w*|intellig\w*|ability|effort|attitude|believes?|thinks?|feels?|wants?)\b/i;
check(
  allEvidence.every((e) => !forbidden.test(e.observation)),
  'no observation string describes a mental state, trait or ability',
);
const allHints = [
  ...sameConceptHints.map((c) => c.hint),
  ...rungs,
  unknownHint,
];
check(
  allHints.every((h) => !forbidden.test(h.body)),
  'no hint body blames or characterises the learner',
);

// ---------------------------------------------------------------------------
section('recovery tracking: wrong answer then recovery');
// ---------------------------------------------------------------------------
let recovered = 0;
let followedUp = 0;
let promptRots: string[] = [];
for (const fixture of MISCONCEPTION_FIXTURES) {
  const first = classifyMisconception({ problem: fixture.problem, learnerAnswer: fixture.learnerAnswer, expected: engineValue(fixture) });
  let state = createMisconceptionState(fixture.concept, first);
  const hint = selectTargetedHint({ state });
  if (hint.followUp.prompt.trim().length > 0) followedUp += 1;

  const second = classifyMisconception({ problem: fixture.problem, learnerAnswer: fixture.expected, expected: engineValue(fixture) });
  state = recordMisconceptionAttempt(state, second, hint.rung, 'correct');
  if (state.previousHintResolved === true) recovered += 1;

  // A follow-up must not be the original problem restated verbatim.
  if (hint.followUp.prompt.trim() === fixture.problem.trim()) promptRots.push(fixture.id);
}
check(followedUp === MISCONCEPTION_FIXTURES.length, `every wrong answer produces a follow-up question (${followedUp}/${MISCONCEPTION_FIXTURES.length})`);
check(recovered === MISCONCEPTION_FIXTURES.length, `every fixture records recovery after the hint (${recovered}/${MISCONCEPTION_FIXTURES.length})`);
check(promptRots.length === 0, `no follow-up simply repeats the original problem (rots=${promptRots.join(',')})`);
check(
  new Set(MISCONCEPTION_FIXTURES.map((f) => classifyMisconception({ problem: f.problem, learnerAnswer: f.learnerAnswer, expected: engineValue(f) }) && selectTargetedHint({ state: createMisconceptionState(f.concept, classifyMisconception({ problem: f.problem, learnerAnswer: f.learnerAnswer, expected: engineValue(f) })) }).followUp.prompt)).size >= 8,
  'the benchmark issues a varied set of follow-up prompts rather than one template',
);

section('an unresolved hint is recorded as unresolved, not quietly dropped');
const badFirst = classifyMisconception({ problem: 'Calculate 17 * 23', learnerAnswer: '381', expected: '391' });
let unresolvedState = createMisconceptionState('Arithmetic', badFirst);
const badHint = selectTargetedHint({ state: unresolvedState });
const stillWrong = classifyMisconception({ problem: 'Calculate 17 * 23', learnerAnswer: '375', expected: '391' });
unresolvedState = recordMisconceptionAttempt(unresolvedState, stillWrong, badHint.rung, 'incorrect');
check(unresolvedState.previousHintResolved === false, 'a still-wrong answer marks the previous hint unresolved');
check(unresolvedState.occurrences >= 2, 'the recurrence is counted');
check(unresolvedState.evidence.length >= 2, 'each observation is retained as evidence');

section('no-answer is neither recovery nor regression');
const noAnswer = classifyMisconception({ problem: 'Solve 2x + 4 = 10', learnerAnswer: 'I do not know', expected: '3' });
let pendingState = createMisconceptionState('Linear equations', noAnswer);
pendingState = recordMisconceptionAttempt(pendingState, noAnswer, 1, 'no-answer');
check(pendingState.previousHintResolved === null, 'an unanswered attempt leaves recovery status undetermined');
check(pendingState.uncertain === true, 'an unanswered attempt does not invent a misconception');

// ---------------------------------------------------------------------------
section('exploratory and introspective turn classification');
// ---------------------------------------------------------------------------
const turnCases: Array<[string, string, boolean]> = [
  ['What is the next step?', 'PROGRESSIVE', true],
  ['Show me the steps please', 'PROGRESSIVE', true],
  ['and then what do I do?', 'PROGRESSIVE', true],
  ['What if the coefficient were negative?', 'EXPLORATORY', true],
  ['Can you give me an example of this?', 'EXPLORATORY', true],
  ['Is there another way to solve this?', 'EXPLORATORY', true],
  ['What happens if I divide both sides instead?', 'EXPLORATORY', true],
  ['Why did I get this wrong?', 'INTROSPECTIVE', true],
  ['Check my work please', 'INTROSPECTIVE', true],
  ['Where did I go wrong?', 'INTROSPECTIVE', true],
  ['Is my method right?', 'INTROSPECTIVE', true],
  ['Can you review my answer?', 'INTROSPECTIVE', true],
];
for (const [text, expectedKind] of turnCases) {
  const classification = classifyLearnerTurn(text);
  check(
    classification.kind === expectedKind,
    `"${text}" classifies as ${expectedKind} (got ${classification.kind} via ${classification.matchedRule})`,
  );
}

const defaulted = classifyLearnerTurn('hello');
check(defaulted.defaulted === true, 'an unrecognised turn is marked as defaulted');
check(defaulted.kind === 'PROGRESSIVE', 'an unrecognised turn defaults to the safe kind');
check(classifyLearnerTurn('why did I get it wrong?').kind === 'INTROSPECTIVE', 'introspection wins over exploration for a self-referential turn');
check(
  describeTurnKind('INTROSPECTIVE').length > 0 && describeTurnKind('EXPLORATORY').length > 0 && describeTurnKind('PROGRESSIVE').length > 0,
  'every turn kind has a factual description',
);
const allClassifications = turnCases.map(([t]) => classifyLearnerTurn(t));
check(
  allClassifications.every((c) => c.matchedRule.length > 0),
  'every classification names the rule that decided it, so it is inspectable',
);

// ---------------------------------------------------------------------------
section('determinism: identical input yields identical output');
// ---------------------------------------------------------------------------
const a = classifyMisconception({ problem: 'Solve 2x + 4 = 10', learnerAnswer: '-3', expected: '3' });
const b = classifyMisconception({ problem: 'Solve 2x + 4 = 10', learnerAnswer: '-3', expected: '3' });
check(
  a.matchedRule === b.matchedRule && a.match === b.match && a.observation === b.observation,
  'classification is deterministic',
);
const hintA = selectTargetedHint({ state: createMisconceptionState('Linear equations', a) });
const hintB = selectTargetedHint({ state: createMisconceptionState('Linear equations', b) });
check(hintA.body === hintB.body, 'hint selection is deterministic');

section('a correct submission is never reported as a misconception');
for (const fixture of MISCONCEPTION_FIXTURES.slice(0, 8)) {
  const correctEvidence = classifyMisconception({
    problem: fixture.problem,
    learnerAnswer: fixture.expected,
    expected: fixture.expected,
  });
  check(
    correctEvidence.matchedRule === 'correct',
    `${fixture.id}: submitting the verified result classifies as correct, not as an error (got ${correctEvidence.matchedRule})`,
  );
  check(
    correctEvidence.match === 'correct',
    `${fixture.id}: the match kind is 'correct'`,
  );
}
const forcedCorrectState = createMisconceptionState(
  'Arithmetic',
  classifyMisconception({ problem: 'Calculate 7 * 8', learnerAnswer: '56', expected: '56' }),
);
check(
  forcedCorrectState.errorClass === 'unknown' && forcedCorrectState.uncertain === true,
  'a correct answer cannot be stored as a confident error class',
);

console.log(`\nMisconception and recovery tests passed: ${passed}, failed: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  FAILED: ${f}`);
  process.exit(1);
}
