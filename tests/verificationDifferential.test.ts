/**
 * Differential regression: the independent exact-rational verifier must AGREE with
 * the production engine on every expression the engine legitimately supports.
 *
 * This is the safety net for GAP-04a. A false FAILED in production is far worse
 * than a missing VERIFIED, because it would show a learner a "verification
 * mismatch" for a perfectly correct answer. Every case below is a real supported
 * expression, so a FAILED here is a defect in the verifier, not a finding.
 */
import { calculateExpression } from '../src/engine/mathEngine';
import { verifyCalculation } from '../src/verification/independentVerifier';
import { evaluateExact, rationalToDecimalString, makeRational, add, mul, div, sub } from '../src/verification/exactArithmetic';

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

/** Expressions the engine legitimately supports. None may produce FAILED. */
const SUPPORTED_EXPRESSIONS = [
  '7 * 8', '2 + 3 * 4', '24 - 4 * (3 + 2) + 18 / 3', '(2+3)*(4-1)', '1/3 + 1/6',
  '0.1 + 0.2', '2^10', '3^4', '-5 + 3', '-(4 + 5)', '2 * -3', '1/2 + 1/3 + 1/6',
  '10/4', '7/2', '100 * 15 / 100', '(1/3) * 3', '2^3 ^ 2', '--5', '5 - -3',
  '1.5 * 2', '0.1 * 10', '9/3/3', '1000000 * 0.000001', '1/7', '2/3 * 3/2',
  '(2/3)^3', '-1/2 - 1/2', '((((1+2))))', '1 - 2 - 3', '2 - (3 - 4)', '12/4/3',
  '3/4 * 4/3', '0.5 + 0.25', '2.5 * 4', '1.25 * 80', '3.14159 * 2',
  '0', '-0', '1', '2*3*4*5', '100 - 10 - 10 - 10', '2/3', '4/6', '8/4',
  '0.3333333333 * 3', '1/9 + 1/9', '1000 - 999', '0.75 / 3', '2^0', '5 ^ 1',
  '((((1 + 2) * 3) - 4) / 5)', '1 - 0.5 - 0.25', '3 / 4 / 5 / 6',
];

console.log('--- exact rational arithmetic invariants ---');
check(
  rationalToDecimalString(makeRational(1n, 3n)) === '0.3',
  '1/3 renders as a rounded decimal rather than a fake exact one',
);
check(rationalToDecimalString(makeRational(1n, 2n)) === '0.5', '1/2 renders exactly as 0.5');
check(rationalToDecimalString(makeRational(4n, 2n)) === '2', 'fractions are reduced before rendering');
check(rationalToDecimalString(makeRational(-1n, 2n)) === '-0.5', 'negative fractions keep their sign');
check(rationalToDecimalString(makeRational(10n, 5n)) === '2', 'terminating expansion trims trailing zeros');
check(rationalToDecimalString(makeRational(7n, 1n)) === '7', 'integers render without a decimal point');

const third = makeRational(1n, 3n);
const sixth = makeRational(1n, 6n);
check(rationalToDecimalString(add(third, sixth)) === '0.5', '1/3 + 1/6 is exactly 0.5, which floats cannot represent reliably');
check(rationalToDecimalString(mul(third, makeRational(3n, 1n))) === '1', '(1/3) * 3 is exactly 1');
check(rationalToDecimalString(div(third, third)) === '1', 'a fraction divided by itself is exactly 1');
check(rationalToDecimalString(sub(makeRational(1n, 2n), makeRational(3n, 4n))) === '-0.25', '1/2 - 3/4 is exactly -0.25');

const exactZero = evaluateExact('0.1 + 0.2 - 0.3');
check(
  exactZero.supported && rationalToDecimalString(exactZero.value) === '0',
  '0.1 + 0.2 - 0.3 is exactly zero in rational arithmetic (floating point gives 5.5e-17)',
);

const unsupportedPi = evaluateExact('pi');
check(!unsupportedPi.supported, 'pi is reported unsupported rather than approximated');
const unsupportedVar = evaluateExact('x + 1');
check(!unsupportedVar.supported, 'a bare variable is reported unsupported rather than assumed');
const unsupportedFn = evaluateExact('sin(1)');
check(!unsupportedFn.supported, 'sin is reported unsupported rather than approximated');
const divisionByZero = evaluateExact('1/0');
check(!divisionByZero.supported, 'division by zero is refused, not returned as a number');
const exponentGuard = evaluateExact('2^99999999');
check(!exponentGuard.supported, 'an adversarial exponent is refused rather than computed');

console.log('\n--- no spurious FAILED on engine-supported expressions ---');
let spurious = 0;
for (const expression of SUPPORTED_EXPRESSIONS) {
  const engine = calculateExpression(expression);
  const outcome = verifyCalculation(expression, engine.display);
  if (outcome.state === 'FAILED') {
    spurious += 1;
    failures.push(`spurious FAILED for ${expression}`);
    console.log(`  FAIL  ${expression} -> engine ${engine.display}, independent ${outcome.independent}`);
  } else {
    passed += 1;
  }
}
check(
  spurious === 0,
  `all ${SUPPORTED_EXPRESSIONS.length} engine-supported expressions avoid a spurious FAILED (spurious=${spurious})`,
);

console.log('\n--- real mismatches are still caught ---');
check(verifyCalculation('7 * 8', '55').state === 'FAILED', 'a wrong arithmetic claim is caught');
check(verifyCalculation('2 + 3 * 4', '20').state === 'FAILED', 'a precedence-faulted claim is caught');
check(verifyCalculation('1/3 + 1/6', '0.5000001').state === 'FAILED', 'a precision-faulted claim is caught');

console.log(`\nVerification differential tests passed: ${passed}, failed: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  FAILED: ${f}`);
  process.exit(1);
}
