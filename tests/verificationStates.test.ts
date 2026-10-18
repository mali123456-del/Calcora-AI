/**
 * Canonical verification contract tests.
 *
 * These define the four states the running product is allowed to show, and prove
 * that each state is reached by real computation rather than by a default.
 *
 * Every assertion here is written to fail against the pre-Wave-1 code, where the
 * live Tutor reported a single boolean `isVerified` that was simply an alias for
 * "the engine returned a success".
 */
import {
  VERIFICATION_STATES,
  fromAgentStatus,
  type VerificationState,
} from '../src/verification/verificationStates';
import { verifyCalculation, verifyEquation, verifyConceptual, verifyUnsupported } from '../src/verification/independentVerifier';
import { calculateExpression } from '../src/engine/mathEngine';
import { toolSolveEquation } from '../src/engine/toolLayer';

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

// ---------------------------------------------------------------------------
section('contract shape');
// ---------------------------------------------------------------------------

check(
  VERIFICATION_STATES.length === 4,
  'exactly four verification states are published',
);
check(
  VERIFICATION_STATES.join(',') === 'VERIFIED,UNVERIFIED,FAILED,UNAVAILABLE',
  `state names are stable and ordered (got ${VERIFICATION_STATES.join(',')})`,
);

// ---------------------------------------------------------------------------
section('VERIFIED — independent re-derivation agrees');
// ---------------------------------------------------------------------------

const sevenTimesEight = calculateExpression('7 * 8');
const verifiedCalc = verifyCalculation('7 * 8', sevenTimesEight.display);
check(verifiedCalc.state === 'VERIFIED', `exact rational cross-check marks 7*8 VERIFIED (got ${verifiedCalc.state})`);
check(verifiedCalc.method === 'exact-rational', `method is a genuinely separate evaluator (got ${verifiedCalc.method})`);
check(verifiedCalc.independent !== null, 'an independent observation is recorded');

const trickyPrecedence = calculateExpression('24 - 4 * (3 + 2) + 18 / 3');
const verifiedPrecedence = verifyCalculation('24 - 4 * (3 + 2) + 18 / 3', trickyPrecedence.display);
check(verifiedPrecedence.state === 'VERIFIED', `precedence-heavy expression VERIFIED (got ${verifiedPrecedence.state})`);

const exactFraction = calculateExpression('1/3 + 1/6');
const verifiedFraction = verifyCalculation('1/3 + 1/6', exactFraction.display);
check(verifiedFraction.state === 'VERIFIED', `repeating-decimal expression still VERIFIED (got ${verifiedFraction.state})`);

// ---------------------------------------------------------------------------
section('FAILED — independent re-derivation disagrees');
// ---------------------------------------------------------------------------

const wrongClaim = verifyCalculation('7 * 8', '57');
check(wrongClaim.state === 'FAILED', `a wrong claimed result is FAILED, never VERIFIED (got ${wrongClaim.state})`);
check(wrongClaim.actual === '57', 'FAILED retains the actual claimed value for display');
check(wrongClaim.independent !== null, 'FAILED retains the independent value for display');
check(
  typeof wrongClaim.reason === 'string' && wrongClaim.reason.length > 0,
  'FAILED carries a human-readable reason',
);

// ---------------------------------------------------------------------------
section('UNVERIFIED — conceptual, not checkable, not wrong');
// ---------------------------------------------------------------------------

const conceptual = verifyConceptual('What is a derivative?');
check(conceptual.state === 'UNVERIFIED', `a conceptual answer is UNVERIFIED (got ${conceptual.state})`);
check(conceptual.actual === null, 'UNVERIFIED makes no numeric claim');
// An UNVERIFIED reason may reassure ("not known to be wrong"), but must never
// assert that the answer itself is faulty. Only *negated* mentions are allowed.
const mentionsWrong = /wrong|incorrect|invalid/i.test(conceptual.reason);
const onlyNegated = !mentionsWrong || /not (known to be|necessarily|yet)/i.test(conceptual.reason);
check(
  onlyNegated,
  `UNVERIFIED never asserts the answer is faulty (reason: "${conceptual.reason}")`,
);
check(
  /not.{0,30}(verif|check)/i.test(conceptual.reason),
  'UNVERIFIED states plainly that the answer was not verified',
);

const transcendental = calculateExpression('sin(0) + cos(0)');
const notExact = verifyCalculation('sin(0) + cos(0)', transcendental.display);
check(
  notExact.state === 'VERIFIED' || notExact.state === 'UNVERIFIED',
  `a transcendental expression is never FAILED spuriously (got ${notExact.state})`,
);

// ---------------------------------------------------------------------------
section('UNAVAILABLE — the capability does not exist');
// ---------------------------------------------------------------------------

const unsupported = verifyUnsupported('Who won the 1998 football world cup?');
check(unsupported.state === 'UNAVAILABLE', `an out-of-domain question is UNAVAILABLE (got ${unsupported.state})`);
check(
  /cannot|unable|no deterministic|not available/i.test(unsupported.reason),
  `UNAVAILABLE explains that the system cannot verify rather than guessing (reason: "${unsupported.reason}")`,
);

const engineFailure = calculateExpression('2 +* 3');
check(!!engineFailure.error, 'the engine rejects a malformed expression (precondition)');
const unavailableFromEngine = verifyCalculation('2 +* 3', null);
check(
  unavailableFromEngine.state === 'UNAVAILABLE',
  `an engine failure maps to UNAVAILABLE, not to a guess (got ${unavailableFromEngine.state})`,
);

// ---------------------------------------------------------------------------
section('equations — residual substitution is genuinely independent');
// ---------------------------------------------------------------------------

const linear = toolSolveEquation({ equation: '2x + 4 = 10' });
check(linear.success, 'the engine solved 2x + 4 = 10 (precondition)');

const linearVerified = verifyEquation('2x + 4 = 10', String(linear.result).split(',').map((s) => s.trim()));
check(linearVerified.state === 'VERIFIED', `a correct root set is VERIFIED (got ${linearVerified.state})`);
check(linearVerified.method === 'equation-residual', `method is residual substitution (got ${linearVerified.method})`);

const wrongRoot = verifyEquation('2x + 4 = 10', ['7']);
check(wrongRoot.state === 'FAILED', `an injected wrong root x=7 is FAILED (got ${wrongRoot.state})`);
check(
  wrongRoot.independent !== null && wrongRoot.independent.includes('!='),
  `FAILED exposes the actual vs independent comparison (independent: ${wrongRoot.independent})`,
);
check(wrongRoot.actual === '7', 'FAILED retains the wrong claimed root for display');

const quadratic = toolSolveEquation({ equation: 'x^2 - 5x + 6 = 0' });
const quadraticVerified = verifyEquation('x^2 - 5x + 6 = 0', String(quadratic.result).split(',').map((s) => s.trim()));
check(
  quadraticVerified.state === 'VERIFIED',
  `every root of a quadratic is checked, not just the first (got ${quadraticVerified.state})`,
);

const noRoots = verifyEquation('x + 1 = 5', []);
check(noRoots.state !== 'VERIFIED', `reporting no roots is never VERIFIED (got ${noRoots.state})`);

const uncheckable = verifyEquation('x + y = 5', ['2']);
check(
  uncheckable.state === 'UNAVAILABLE' || uncheckable.state === 'UNVERIFIED',
  `an uncheckable equation is not falsely VERIFIED (got ${uncheckable.state})`,
);

// ---------------------------------------------------------------------------
section('honesty invariants');
// ---------------------------------------------------------------------------

const samples = [
  verifyCalculation('7 * 8', '56'),
  verifyCalculation('7 * 8', '57'),
  verifyConceptual('explain limits'),
  verifyUnsupported('who won the world cup'),
  verifyEquation('2x + 4 = 10', ['3']),
  verifyEquation('2x + 4 = 10', ['7']),
];

check(
  samples.every((s) => VERIFICATION_STATES.includes(s.state as VerificationState)),
  'every outcome carries one of the four published states',
);
check(
  samples.every((s) => typeof s.reason === 'string' && s.reason.trim().length > 0),
  'every outcome carries a non-empty reason',
);
check(
  samples.filter((s) => s.state === 'VERIFIED').every((s) => s.independent !== null),
  'VERIFIED is never claimed without an independent observation',
);
check(
  samples.filter((s) => s.state === 'FAILED').every((s) => s.independent !== null),
  'FAILED always exposes the independent observation for comparison',
);
check(
  samples.every((s) => s.checkedAt > 0),
  'every outcome is timestamped',
);

// ---------------------------------------------------------------------------
// Agent status mapping: a derivative spot-check is a real independent check.
// ---------------------------------------------------------------------------
// The Math Agent reports PASS/FAIL/UNKNOWN with a method name. A `spot-check`
// (symbolic derivative vs. central difference) is a genuinely independent
// numeric observation, so it must map to the canonical `recompute` method —
// silently falling through to `none` would claim VERIFIED with no method,
// breaking the "VERIFIED carries an independent observation" contract.
const spotPass = fromAgentStatus('PASS', 'spot-check', 'central difference matched at 4/4 sample points', '4/4', '2x');
check(spotPass.state === 'VERIFIED', 'a passing spot-check reports VERIFIED');
check(
  spotPass.method === 'recompute',
  `a passing spot-check maps to the canonical recompute method, got "${spotPass.method}"`,
);
check(
  spotPass.independent !== null,
  'a VERIFIED spot-check carries the independent observation',
);
const spotFail = fromAgentStatus('FAIL', 'spot-check', 'symbolic derivative 3x disagrees with numerical 2x', '1/4', '3x');
check(spotFail.state === 'FAILED', 'a failing spot-check reports FAILED');
check(
  spotFail.method === 'recompute',
  `a failing spot-check maps to recompute so the disagreement is attributable, got "${spotFail.method}"`,
);
const spotUnknown = fromAgentStatus('UNKNOWN', 'spot-check', 'no evaluable sample points', undefined, null);
check(spotUnknown.state === 'UNVERIFIED', 'an unknown spot-check reports UNVERIFIED, never VERIFIED');

console.log(`\nVerification contract tests passed: ${passed}, failed: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  FAILED: ${f}`);
  process.exit(1);
}
