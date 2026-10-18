import assert from 'node:assert/strict';
import {
  calculateExpression,
  formatEngineeringNotation,
} from '../src/engine/mathEngine';
import { toolCalculate } from '../src/engine/toolLayer';

function expectValue(expression: string, expected: number, angleMode: 'DEG' | 'RAD' | 'GRAD' = 'DEG') {
  const result = calculateExpression(expression, angleMode);
  assert.equal(result.error, undefined, expression);
  assert.ok(Math.abs(result.value - expected) < 1e-10, `${expression} => ${result.value}, expected ${expected}`);
}

function expectError(expression: string) {
  const result = calculateExpression(expression);
  assert.equal(result.display, 'Error', expression);
  assert.ok(result.error, `Expected an error for ${expression}`);
}

expectValue('2^3^2', 512);
expectValue('0.1 + 0.2', 0.3);
expectValue('2(3+4)', 14);
expectValue('3sin(30)', 1.5);
expectValue('sin(90)', 1);
expectValue('sin(pi/2)', 1, 'RAD');
expectValue('ncr(5,2)', 10);
expectValue('root(27,3)', 3);

// Regression: `fact` is the compact alias for `factorial`, but the evaluator only
// listed `factorial`, so the alias failed with "Unrecognized function: fact".
expectValue('fact(5)', 120);
expectValue('fact(0)', 1);
expectValue('factorial(5)', 120);
expectValue('5!', 120);

// Postfix *word* forms (`5 fact`, `5 sin`, `5 sqrt`) are uniformly unsupported because
// the tokeniser reads a bare word after a number as implicit multiplication. That is
// pre-existing, function-agnostic behaviour, not a factorial regression, and nothing
// in the codebase emits it.
assert.equal(calculateExpression('5 fact').display, 'Error');
assert.equal(calculateExpression('5 sin').display, 'Error');

expectError('1.2.3');
expectError('1e+');
expectError('1e-');
expectError('1e');
expectError('1/0');
expectError('sqrt(-1)');
expectError('tan(90)');
expectError('ncr(3,4)');

// Non-finite values must never become successful calculator results or carry a
// deterministic verification badge. Check both final overflow and literals that
// could otherwise be hidden by a later operation.
for (const expression of ['0^(-1)', '1e308 * 1e308', 'exp(1000)', '1e309 ^ 0']) {
  const calculation = calculateExpression(expression);
  assert.equal(calculation.display, 'Error', expression);
  assert.ok(calculation.error, `Expected non-finite result rejection for ${expression}`);
  assert.ok(Number.isNaN(calculation.value), `Rejected calculation exposes no numeric value for ${expression}`);

  const toolResult = toolCalculate({ expression });
  assert.equal(toolResult.success, false, expression);
  assert.equal(toolResult.result, '', expression);
  assert.equal(toolResult.verificationBadge.isVerified, false, expression);
}

assert.deepEqual(formatEngineeringNotation(Infinity), {
  display: 'Infinity',
  mantissa: 'Infinity',
  exponent: 0,
  prefix: '',
});
assert.deepEqual(formatEngineeringNotation(-Infinity), {
  display: '-Infinity',
  mantissa: '-Infinity',
  exponent: 0,
  prefix: '',
});

console.log('Math engine regression tests passed');
