/**
 * Symbolic differentiation — RED test.
 *
 * The engine previously reported the numerical derivative AT a point (f'(0) = 0)
 * as if it were the derivative function. These assertions define the required
 * symbolic behaviour: d/dx must return f'(x), never a point value.
 *
 * Rules required: constants, variables, powers, +, -, *, /, sin, cos, tan, exp,
 * ln/log, product rule, quotient rule, chain rule. Unsupported forms must be
 * reported as unsupported, never approximated silently.
 */
import assert from 'node:assert/strict';
import {
  differentiate,
  parseExpression,
  printExpression,
  UnsupportedExpressionError,
} from '../src/engine/symbolicDerivative';
import { toolDerivative } from '../src/engine/toolLayer';
import { verifyDerivative } from '../src/verification/independentVerifier';
import { evaluateFunctionAt } from '../src/engine/calculusEngine';

let passed = 0;
function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Symbolic derivative failed: ${message}`);
  passed += 1;
}

function d(expression: string, variable = 'x'): string {
  const outcome = differentiate(expression, variable);
  check(outcome.supported, `expected "${expression}" to be differentiable, got reason: ${outcome.reason}`);
  return outcome.derivative ?? '';
}

function checkUnsupported(expression: string, label: string): void {
  const outcome = differentiate(expression, 'x');
  check(!outcome.supported, `${label} must report unsupported, but got "${outcome.derivative}"`);
  check(
    typeof outcome.reason === 'string' && outcome.reason.length > 0,
    `${label} must explain why it is unsupported`,
  );
}

async function main() {
  // -------------------------------------------------------------------------
  // Required reference results
  // -------------------------------------------------------------------------
  check(d('x^2') === '2x', `d/dx(x^2) must be 2x, got "${d('x^2')}"`);
  check(d('x^3 + 2x') === '3x^2 + 2', `d/dx(x^3 + 2x) must be 3x^2 + 2, got "${d('x^3 + 2x')}"`);
  check(d('sin(x)') === 'cos(x)', `d/dx(sin(x)) must be cos(x), got "${d('sin(x)')}"`);
  check(d('cos(x)') === '-sin(x)', `d/dx(cos(x)) must be -sin(x), got "${d('cos(x)')}"`);

  // -------------------------------------------------------------------------
  // Constants, variables, linearity
  // -------------------------------------------------------------------------
  check(d('5') === '0', `constant derivative must be 0, got "${d('5')}"`);
  check(d('3x') === '3', `d/dx(3x) must be 3, got "${d('3x')}"`);
  check(d('x') === '1', `d/dx(x) must be 1, got "${d('x')}"`);
  check(d('2x + 7') === '2', `d/dx(2x + 7) must be 2, got "${d('2x + 7')}"`);
  check(d('x^3') === '3x^2', `d/dx(x^3) must be 3x^2, got "${d('x^3')}"`);
  check(d('1/x') === '-1/x^2', `d/dx(1/x) must be -1/x^2, got "${d('1/x')}"`);

  // -------------------------------------------------------------------------
  // Product and quotient rules
  // -------------------------------------------------------------------------
  check(
    d('x*sin(x)') === 'sin(x) + x*cos(x)',
    `product rule: got "${d('x*sin(x)')}"`,
  );
  check(
    d('sin(x)/x') === '(x*cos(x) - sin(x))/x^2',
    `quotient rule: got "${d('sin(x)/x')}"`,
  );

  // -------------------------------------------------------------------------
  // Chain rule and the remaining required functions
  // -------------------------------------------------------------------------
  check(
    d('sin(x^2)') === '2x*cos(x^2)',
    `chain rule: got "${d('sin(x^2)')}"`,
  );
  check(d('exp(x)') === 'exp(x)', `d/dx(exp(x)) must be exp(x), got "${d('exp(x)')}"`);
  check(d('ln(x)') === '1/x', `d/dx(ln(x)) must be 1/x, got "${d('ln(x)')}"`);
  check(d('cos(2x)') === '-2sin(2x)', `chain rule on cos(2x): got "${d('cos(2x)')}"`);
  check(d('tan(x)') === 'sec(x)^2', `d/dx(tan(x)) must be sec(x)^2, got "${d('tan(x)')}"`);
  check(d('sqrt(x)') === '1/(2sqrt(x))', `d/dx(sqrt(x)) must be 1/(2sqrt(x)), got "${d('sqrt(x)')}"`);

  // -------------------------------------------------------------------------
  // Normalization: printing must round-trip through the real parser
  // -------------------------------------------------------------------------
  const roundTrip = ['x^2', 'x^3 + 2x', 'sin(x)', 'x*sin(x)', 'sin(x)/x', 'sin(x^2)', 'ln(x)', '2x + 7'];
  for (const expression of roundTrip) {
    const derivative = d(expression);
    const parsed = parseExpression(derivative);
    check(
      printExpression(parsed) === derivative,
      `printed derivative "${derivative}" must round-trip through the parser`,
    );
  }

  // -------------------------------------------------------------------------
  // Numerical equivalence: symbolic derivative must match central difference
  // -------------------------------------------------------------------------
  const spotCheckable = [
    'x^2',
    'x^3 + 2x',
    'sin(x)',
    'cos(x)',
    'tan(x)',
    'exp(x)',
    'ln(x)',
    'x*sin(x)',
    'sin(x)/x',
    'sin(x^2)',
    '3x + 5',
    'x^4 - 2x^2',
  ];
  for (const expression of spotCheckable) {
    const derivative = d(expression);
    let evaluated = 0;
    for (const point of [0.7, 1.3, -1.1]) {
      // Points outside the domain of the expression are skipped, not failed.
      let symbolic: number;
      let approx: number;
      try {
        symbolic = evaluateFunctionAt(derivative, point);
        const h = 1e-4;
        approx = (evaluateFunctionAt(expression, point + h) - evaluateFunctionAt(expression, point - h)) / (2 * h);
      } catch {
        continue;
      }
      if (!Number.isFinite(symbolic) || !Number.isFinite(approx)) continue;
      evaluated += 1;
      check(
        Math.abs(symbolic - approx) <= 1e-4 * Math.max(1, Math.abs(approx)),
        `d/dx(${expression}) at ${point}: symbolic ${symbolic} vs numerical ${approx}`,
      );
    }
    check(evaluated > 0, `d/dx(${expression}) must be spot-checkable at at least one sample point`);
  }

  // -------------------------------------------------------------------------
  // Unsupported forms are reported honestly, never approximated as f'(x0)
  // -------------------------------------------------------------------------
  checkUnsupported('abs(x)', 'abs');
  checkUnsupported('floor(x)', 'floor');
  checkUnsupported('x!', 'factorial postfix');
  assert.throws(() => parseExpression('x!'), UnsupportedExpressionError, 'factorial must throw at parse time');
  assert.throws(() => parseExpression('x mod 3'), UnsupportedExpressionError, 'modulo must throw at parse time');

  // -------------------------------------------------------------------------
  // toolDerivative integration: symbolic result, honest fallback
  // -------------------------------------------------------------------------
  const symbolicTool = toolDerivative({ expression: 'x^2' });
  check(symbolicTool.success, 'toolDerivative(x^2) must succeed');
  check(symbolicTool.result === '2x', `toolDerivative(x^2) must report 2x, got "${symbolicTool.result}"`);
  check(
    !/f'\(0\)|f\(0\)/.test(symbolicTool.result),
    'toolDerivative must not present a point value as the derivative function',
  );

  const unsupportedTool = toolDerivative({ expression: 'abs(x)' });
  check(
    unsupportedTool.success || unsupportedTool.result.length > 0,
    'an unsupported derivative must still respond honestly',
  );
  check(
    !unsupportedTool.result.includes('2x'),
    'unsupported derivative must not fabricate a result',
  );

  // -------------------------------------------------------------------------
  // Independent verification of derivative claims
  // -------------------------------------------------------------------------
  const goodClaim = verifyDerivative('x^2', '2x');
  check(goodClaim.state === 'VERIFIED', `correct derivative claim must be VERIFIED, got ${goodClaim.state}`);

  const badClaim = verifyDerivative('x^2', '3x');
  check(badClaim.state === 'FAILED', `wrong derivative claim must FAILED, got ${badClaim.state}`);

  const wrongShape = verifyDerivative('sin(x)', 'cos(x)*2');
  check(wrongShape.state === 'FAILED', `wrong derivative shape must FAILED, got ${wrongShape.state}`);

  const unparseable = verifyDerivative('x^2', 'not a derivative');
  check(
    unparseable.state !== 'VERIFIED',
    `an unparseable claim must never be VERIFIED, got ${unparseable.state}`,
  );

  console.log(`Symbolic derivative tests passed: ${passed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
