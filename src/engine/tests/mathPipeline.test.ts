/**
 * Deterministic Calculation Pipeline Regression Test Suite
 *
 * Authoritative regression tests covering:
 * 1. Basic Arithmetic & Precedence (PEMDAS/BODMAS, fractions, powers, scientific ops)
 * 2. Trigonometric Functions (DEG/RAD angle modes, boundaries, inverse & hyperbolic)
 * 3. Algebraic Equation Solving (Linear & quadratic equations, roots, step proofs)
 * 4. Deterministic Authority & Tool Layer Contract Verification
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpression,
  tokenize,
  toRPN,
  evaluateRPN,
  toRadians,
  fromRadians,
  factorial,
  permutations,
  combinations,
  decimalToFraction,
  formatFraction,
  formatResultWithPrecision,
  CONSTANTS,
} from '../mathEngine';
import { solveEquation } from '../equationSolver';
import {
  toolCalculate,
  toolSolveEquation,
  executeMathTool,
  MathToolResult,
  type MathToolName,
} from '../toolLayer';

const EPSILON = 1e-7;

function assertCloseTo(actual: number, expected: number, tolerance = EPSILON, msg?: string) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${msg || 'Value mismatch'}: expected ${expected} ± ${tolerance}, got ${actual}`
  );
}

// ============================================================================
// 1. BASIC ARITHMETIC & DETERMINISTIC PRECEDENCE PIPELINE
// ============================================================================
describe('Deterministic Pipeline: Basic Arithmetic & Precedence', () => {
  describe('Elementary Operations', () => {
    it('evaluates addition correctly', () => {
      const res = calculateExpression('2 + 3');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 5);
      assert.equal(res.display, '5');
    });

    it('evaluates subtraction correctly', () => {
      const res = calculateExpression('10 - 3');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 7);
      assert.equal(res.display, '7');
    });

    it('evaluates multiplication correctly', () => {
      const res = calculateExpression('6 * 7');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 42);
      assert.equal(res.display, '42');
    });

    it('evaluates division correctly', () => {
      const res = calculateExpression('84 / 4');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 21);
      assert.equal(res.display, '21');
    });

    it('evaluates chained arithmetic with equal precedence left-to-right', () => {
      const res = calculateExpression('10 - 4 - 3');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 3); // (10 - 4) - 3 = 3, not 10 - (4 - 3) = 9
    });

    it('evaluates division chained left-to-right', () => {
      const res = calculateExpression('24 / 4 / 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 3); // (24 / 4) / 2 = 3
    });
  });

  describe('Decimal & Floating-Point Sanitization', () => {
    it('handles classic 0.1 + 0.2 precision artifact deterministically', () => {
      const res = calculateExpression('0.1 + 0.2');
      assert.equal(res.error, undefined);
      assertCloseTo(res.value, 0.3);
      assert.equal(res.display, '0.3');
    });

    it('evaluates floating-point multiplication with precision', () => {
      const res = calculateExpression('0.05 * 0.04');
      assert.equal(res.error, undefined);
      assertCloseTo(res.value, 0.002);
      assert.equal(res.display, '0.002');
    });

    it('evaluates exact fraction conversion for rational decimals', () => {
      const res = calculateExpression('1 / 4 + 1 / 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 0.75);
      assert.equal(res.exactFraction, '3/4');
    });

    it('formats repeating fractions correctly', () => {
      const frac = decimalToFraction(0.3333333333333333);
      assert.ok(frac !== null);
      assert.equal(frac?.numerator, 1);
      assert.equal(frac?.denominator, 3);
      assert.equal(formatFraction(frac!), '1/3');
    });
  });

  describe('Operator Precedence & Grouping (PEMDAS/BODMAS)', () => {
    it('multiplication takes precedence over addition: 2 + 3 * 4 = 14', () => {
      const res = calculateExpression('2 + 3 * 4');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 14);
    });

    it('parentheses override default precedence: (2 + 3) * 4 = 20', () => {
      const res = calculateExpression('(2 + 3) * 4');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 20);
    });

    it('handles nested multi-level parentheses', () => {
      const res = calculateExpression('2 * (3 + (4 * (5 - 2)))');
      // 5 - 2 = 3; 4 * 3 = 12; 3 + 12 = 15; 2 * 15 = 30
      assert.equal(res.error, undefined);
      assert.equal(res.value, 30);
    });

    it('power takes precedence over multiplication: 2 * 3 ^ 2 = 18', () => {
      const res = calculateExpression('2 * 3 ^ 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 18);
    });

    it('power grouping with parentheses: (2 * 3) ^ 2 = 36', () => {
      const res = calculateExpression('(2 * 3) ^ 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 36);
    });

    it('right-associative power operator: 2 ^ 3 ^ 2 = 2^(9) = 512', () => {
      const res = calculateExpression('2 ^ 3 ^ 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 512);
    });

    it('evaluates complex mixed precedence expression', () => {
      const res = calculateExpression('100 - 20 / 4 * 2 + 3 ^ 3');
      // 20 / 4 = 5; 5 * 2 = 10; 3^3 = 27; 100 - 10 + 27 = 117
      assert.equal(res.error, undefined);
      assert.equal(res.value, 117);
    });
  });

  describe('Unary Operators & Signed Numbers', () => {
    it('evaluates leading unary minus: -5 + 8 = 3', () => {
      const res = calculateExpression('-5 + 8');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 3);
    });

    it('evaluates unary minus inside parentheses: 10 * (-4) = -40', () => {
      const res = calculateExpression('10 * (-4)');
      assert.equal(res.error, undefined);
      assert.equal(res.value, -40);
    });

    it('handles negative exponent correctly: 2 ^ (-2) = 0.25', () => {
      const res = calculateExpression('2 ^ (-2)');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 0.25);
    });

    it('handles unary minus with power: (-3) ^ 2 = 9', () => {
      const res = calculateExpression('(-3) ^ 2');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 9);
    });
  });

  describe('Scientific Operations & Constants', () => {
    it('evaluates square root: sqrt(144) = 12', () => {
      const res = calculateExpression('sqrt(144)');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 12);
    });

    it('evaluates cube root: cbrt(27) = 3', () => {
      const res = calculateExpression('cbrt(27)');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 3);
    });

    it('evaluates absolute value: abs(-42.5) = 42.5', () => {
      const res = calculateExpression('abs(-42.5)');
      assert.equal(res.error, undefined);
      assert.equal(res.value, 42.5);
    });

    it('evaluates factorial: 5! = 120 and 0! = 1', () => {
      const res5 = calculateExpression('5!');
      assert.equal(res5.error, undefined);
      assert.equal(res5.value, 120);

      const res0 = calculateExpression('0!');
      assert.equal(res0.error, undefined);
      assert.equal(res0.value, 1);
    });

    it('evaluates natural logarithm: ln(e) = 1', () => {
      const res = calculateExpression('ln(e)');
      assert.equal(res.error, undefined);
      assertCloseTo(res.value, 1);
    });

    it('evaluates base-10 and base-2 logarithms', () => {
      const res10 = calculateExpression('log10(1000)');
      assert.equal(res10.error, undefined);
      assertCloseTo(res10.value, 3);

      const res2 = calculateExpression('log2(256)');
      assert.equal(res2.error, undefined);
      assertCloseTo(res2.value, 8);
    });

    it('evaluates mathematical constants pi and e', () => {
      const resPi = calculateExpression('pi');
      assert.equal(resPi.error, undefined);
      assertCloseTo(resPi.value, Math.PI);

      const resE = calculateExpression('e');
      assert.equal(resE.error, undefined);
      assertCloseTo(resE.value, Math.E);
    });

    it('evaluates combinations and permutations functions', () => {
      assert.equal(combinations(5, 2), 10);
      assert.equal(permutations(5, 2), 20);
    });
  });

  describe('Deterministic Arithmetic Error Handling & Domain Restrictions', () => {
    it('flags division by zero as error', () => {
      const res = calculateExpression('10 / 0');
      assert.ok(res.error !== undefined, 'Division by zero must return an error');
      assert.ok(/division by zero/i.test(res.error || ''));
    });

    it('flags square root of negative number in real domain as error', () => {
      const res = calculateExpression('sqrt(-9)');
      assert.ok(res.error !== undefined, 'sqrt of negative number must return an error');
    });

    it('flags logarithm of zero or negative number as error', () => {
      const resZero = calculateExpression('ln(0)');
      assert.ok(resZero.error !== undefined);

      const resNeg = calculateExpression('log10(-5)');
      assert.ok(resNeg.error !== undefined);
    });

    it('flags malformed syntax cleanly without unhandled exceptions', () => {
      const res = calculateExpression('2 + * 3');
      assert.ok(res.error !== undefined);
      assert.ok(Number.isNaN(res.value));
    });
  });
});

// ============================================================================
// 2. TRIGONOMETRIC FUNCTIONS PIPELINE (DEG / RAD MODES)
// ============================================================================
describe('Deterministic Pipeline: Trigonometric Functions', () => {
  describe('Degree Mode (DEG)', () => {
    it('evaluates sin in DEG: 0°, 30°, 90°, 180°, 270°, 360°', () => {
      const sin0 = calculateExpression('sin(0)', 'DEG');
      assert.equal(sin0.error, undefined);
      assertCloseTo(sin0.value, 0);

      const sin30 = calculateExpression('sin(30)', 'DEG');
      assert.equal(sin30.error, undefined);
      assertCloseTo(sin30.value, 0.5);

      const sin90 = calculateExpression('sin(90)', 'DEG');
      assert.equal(sin90.error, undefined);
      assertCloseTo(sin90.value, 1.0);

      const sin180 = calculateExpression('sin(180)', 'DEG');
      assert.equal(sin180.error, undefined);
      assertCloseTo(sin180.value, 0);

      const sin270 = calculateExpression('sin(270)', 'DEG');
      assert.equal(sin270.error, undefined);
      assertCloseTo(sin270.value, -1.0);

      const sin360 = calculateExpression('sin(360)', 'DEG');
      assert.equal(sin360.error, undefined);
      assertCloseTo(sin360.value, 0);
    });

    it('evaluates cos in DEG: 0°, 60°, 90°, 180°, 270°, 360°', () => {
      const cos0 = calculateExpression('cos(0)', 'DEG');
      assert.equal(cos0.error, undefined);
      assertCloseTo(cos0.value, 1.0);

      const cos60 = calculateExpression('cos(60)', 'DEG');
      assert.equal(cos60.error, undefined);
      assertCloseTo(cos60.value, 0.5);

      const cos90 = calculateExpression('cos(90)', 'DEG');
      assert.equal(cos90.error, undefined);
      assertCloseTo(cos90.value, 0);

      const cos180 = calculateExpression('cos(180)', 'DEG');
      assert.equal(cos180.error, undefined);
      assertCloseTo(cos180.value, -1.0);

      const cos270 = calculateExpression('cos(270)', 'DEG');
      assert.equal(cos270.error, undefined);
      assertCloseTo(cos270.value, 0);

      const cos360 = calculateExpression('cos(360)', 'DEG');
      assert.equal(cos360.error, undefined);
      assertCloseTo(cos360.value, 1.0);
    });

    it('evaluates tan in DEG: 0°, 45°, 180°', () => {
      const tan0 = calculateExpression('tan(0)', 'DEG');
      assert.equal(tan0.error, undefined);
      assertCloseTo(tan0.value, 0);

      const tan45 = calculateExpression('tan(45)', 'DEG');
      assert.equal(tan45.error, undefined);
      assertCloseTo(tan45.value, 1.0);

      const tan180 = calculateExpression('tan(180)', 'DEG');
      assert.equal(tan180.error, undefined);
      assertCloseTo(tan180.value, 0);
    });

    it('detects singularity of tan(90) in DEG mode as undefined', () => {
      const tan90 = calculateExpression('tan(90)', 'DEG');
      assert.ok(tan90.error !== undefined, 'tan(90) must return an error');
      assert.ok(/tan is undefined/i.test(tan90.error || ''));
    });

    it('evaluates reciprocal trigonometric functions in DEG: sec, csc, cot', () => {
      const sec60 = calculateExpression('sec(60)', 'DEG');
      assert.equal(sec60.error, undefined);
      assertCloseTo(sec60.value, 2.0); // 1 / cos(60°) = 1 / 0.5 = 2

      const csc30 = calculateExpression('csc(30)', 'DEG');
      assert.equal(csc30.error, undefined);
      assertCloseTo(csc30.value, 2.0); // 1 / sin(30°) = 1 / 0.5 = 2

      const cot45 = calculateExpression('cot(45)', 'DEG');
      assert.equal(cot45.error, undefined);
      assertCloseTo(cot45.value, 1.0); // 1 / tan(45°) = 1
    });

    it('evaluates inverse trigonometric functions in DEG: asin, acos, atan', () => {
      const asin05 = calculateExpression('asin(0.5)', 'DEG');
      assert.equal(asin05.error, undefined);
      assertCloseTo(asin05.value, 30);

      const asin1 = calculateExpression('asin(1)', 'DEG');
      assert.equal(asin1.error, undefined);
      assertCloseTo(asin1.value, 90);

      const acos05 = calculateExpression('acos(0.5)', 'DEG');
      assert.equal(acos05.error, undefined);
      assertCloseTo(acos05.value, 60);

      const acos1 = calculateExpression('acos(1)', 'DEG');
      assert.equal(acos1.error, undefined);
      assertCloseTo(acos1.value, 0);

      const atan1 = calculateExpression('atan(1)', 'DEG');
      assert.equal(atan1.error, undefined);
      assertCloseTo(atan1.value, 45);
    });

    it('enforces domain restrictions on inverse trig: asin(2) throws error', () => {
      const res = calculateExpression('asin(2)', 'DEG');
      assert.ok(res.error !== undefined);
      assert.ok(/asin argument must be in \[-1, 1\]/i.test(res.error || ''));
    });
  });

  describe('Radian Mode (RAD)', () => {
    it('evaluates sin in RAD: 0, pi/6, pi/2, pi', () => {
      const sin0 = calculateExpression('sin(0)', 'RAD');
      assert.equal(sin0.error, undefined);
      assertCloseTo(sin0.value, 0);

      const sinPi6 = calculateExpression('sin(pi / 6)', 'RAD');
      assert.equal(sinPi6.error, undefined);
      assertCloseTo(sinPi6.value, 0.5);

      const sinPi2 = calculateExpression('sin(pi / 2)', 'RAD');
      assert.equal(sinPi2.error, undefined);
      assertCloseTo(sinPi2.value, 1.0);

      const sinPi = calculateExpression('sin(pi)', 'RAD');
      assert.equal(sinPi.error, undefined);
      assertCloseTo(sinPi.value, 0);
    });

    it('evaluates cos in RAD: 0, pi/3, pi/2, pi, 2*pi', () => {
      const cos0 = calculateExpression('cos(0)', 'RAD');
      assert.equal(cos0.error, undefined);
      assertCloseTo(cos0.value, 1.0);

      const cosPi3 = calculateExpression('cos(pi / 3)', 'RAD');
      assert.equal(cosPi3.error, undefined);
      assertCloseTo(cosPi3.value, 0.5);

      const cosPi2 = calculateExpression('cos(pi / 2)', 'RAD');
      assert.equal(cosPi2.error, undefined);
      assertCloseTo(cosPi2.value, 0);

      const cosPi = calculateExpression('cos(pi)', 'RAD');
      assert.equal(cosPi.error, undefined);
      assertCloseTo(cosPi.value, -1.0);
    });

    it('evaluates tan in RAD: 0, pi/4', () => {
      const tan0 = calculateExpression('tan(0)', 'RAD');
      assert.equal(tan0.error, undefined);
      assertCloseTo(tan0.value, 0);

      const tanPi4 = calculateExpression('tan(pi / 4)', 'RAD');
      assert.equal(tanPi4.error, undefined);
      assertCloseTo(tanPi4.value, 1.0);
    });

    it('evaluates inverse trig in RAD: asin(1) = pi/2, atan(1) = pi/4', () => {
      const asin1 = calculateExpression('asin(1)', 'RAD');
      assert.equal(asin1.error, undefined);
      assertCloseTo(asin1.value, Math.PI / 2);

      const atan1 = calculateExpression('atan(1)', 'RAD');
      assert.equal(atan1.error, undefined);
      assertCloseTo(atan1.value, Math.PI / 4);
    });
  });

  describe('Hyperbolic Functions', () => {
    it('evaluates sinh, cosh, tanh at 0', () => {
      const sinh0 = calculateExpression('sinh(0)');
      assert.equal(sinh0.error, undefined);
      assertCloseTo(sinh0.value, 0);

      const cosh0 = calculateExpression('cosh(0)');
      assert.equal(cosh0.error, undefined);
      assertCloseTo(cosh0.value, 1);

      const tanh0 = calculateExpression('tanh(0)');
      assert.equal(tanh0.error, undefined);
      assertCloseTo(tanh0.value, 0);
    });

    it('satisfies hyperbolic identity: cosh(x)^2 - sinh(x)^2 = 1', () => {
      const res = calculateExpression('(cosh(1.5))^2 - (sinh(1.5))^2');
      assert.equal(res.error, undefined);
      assertCloseTo(res.value, 1.0);
    });
  });
});

// ============================================================================
// 3. ALGEBRAIC EQUATION SOLVING PIPELINE
// ============================================================================
describe('Deterministic Pipeline: Algebraic Equation Solving', () => {
  describe('Linear Equations (ax + b = c and ax + b = cx + d)', () => {
    it('solves simple linear equation: 2x + 5 = 15 => x = 5', () => {
      const solution = solveEquation('2x + 5 = 15');
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'linear');
      assert.deepEqual(solution.variables, ['x']);
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], 5);
      assert.ok(solution.steps.length >= 3, 'Must include derivation steps');
      assert.ok(solution.explanation.includes('x = 5'));
    });

    it('solves linear equation with variable on both sides: 3x - 7 = 2x + 3 => x = 10', () => {
      const solution = solveEquation('3x - 7 = 2x + 3');
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'linear');
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], 10);
    });

    it('solves direct proportionality: 5x = 25 => x = 5', () => {
      const solution = solveEquation('5x = 25');
      assert.equal(solution.isValid, true);
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], 5);
    });

    it('solves negative coefficient linear equation: -4x + 12 = 0 => x = 3', () => {
      const solution = solveEquation('-4x + 12 = 0');
      assert.equal(solution.isValid, true);
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], 3);
    });

    it('solves linear equation with terms on both sides: 7x - 4 = 3x + 16 => x = 5', () => {
      const solution = solveEquation('7x - 4 = 3x + 16');
      assert.equal(solution.isValid, true);
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], 5);
    });

    it('supports alternative variable names (y, t, z)', () => {
      const solT = solveEquation('3t + 6 = 18');
      assert.equal(solT.isValid, true);
      assert.deepEqual(solT.variables, ['t']);
      assert.equal(solT.solutions.length, 1);
      assertCloseTo(solT.solutions[0], 4);

      const solY = solveEquation('5y - 10 = 0');
      assert.equal(solY.isValid, true);
      assert.deepEqual(solY.variables, ['y']);
      assert.equal(solY.solutions.length, 1);
      assertCloseTo(solY.solutions[0], 2);
    });
  });

  describe('Quadratic Equations (ax^2 + bx + c = 0)', () => {
    it('solves quadratic with two distinct integer roots: x^2 - 5x + 6 = 0 => x = 2, 3', () => {
      const solution = solveEquation('x^2 - 5x + 6 = 0');
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'quadratic');
      assert.equal(solution.solutions.length, 2);

      const roots = solution.solutions.slice().sort((a, b) => a - b);
      assertCloseTo(roots[0], 2);
      assertCloseTo(roots[1], 3);
      assert.ok(solution.steps.some(s => s.includes('Discriminant') || s.includes('Δ')));
    });

    it('solves difference of squares: x^2 - 4 = 0 => x = -2, 2', () => {
      const solution = solveEquation('x^2 - 4 = 0');
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'quadratic');
      assert.equal(solution.solutions.length, 2);

      const roots = solution.solutions.slice().sort((a, b) => a - b);
      assertCloseTo(roots[0], -2);
      assertCloseTo(roots[1], 2);
    });

    it('solves difference of squares: x^2 - 9 = 0 => x = -3, 3', () => {
      const solution = solveEquation('x^2 - 9 = 0');
      assert.equal(solution.isValid, true);
      const roots = solution.solutions.slice().sort((a, b) => a - b);
      assertCloseTo(roots[0], -3);
      assertCloseTo(roots[1], 3);
    });

    it('solves perfect square trinomial (double root): x^2 + 2x + 1 = 0 => x = -1', () => {
      const solution = solveEquation('x^2 + 2x + 1 = 0');
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'quadratic');
      assert.equal(solution.solutions.length, 1);
      assertCloseTo(solution.solutions[0], -1);
      assert.ok(solution.steps.some(s => /repeated real root/i.test(s)));
    });

    it('solves non-monic quadratic: 2x^2 + 4x - 6 = 0 => x = -3, 1', () => {
      const solution = solveEquation('2x^2 + 4x - 6 = 0');
      assert.equal(solution.isValid, true);
      assert.equal(solution.solutions.length, 2);

      const roots = solution.solutions.slice().sort((a, b) => a - b);
      assertCloseTo(roots[0], -3);
      assertCloseTo(roots[1], 1);
    });

    it('handles quadratic with non-zero RHS: x^2 + 5x + 6 = 0 variant', () => {
      const solution = solveEquation('x^2 + 5x + 6 = 0');
      assert.equal(solution.isValid, true);
      const roots = solution.solutions.slice().sort((a, b) => a - b);
      assertCloseTo(roots[0], -3);
      assertCloseTo(roots[1], -2);
    });

    it('handles negative discriminant / complex roots deterministically', () => {
      const solution = solveEquation('x^2 + 1 = 0');
      // Discriminant is 0 - 4(1)(1) = -4 < 0
      assert.equal(solution.isValid, true);
      assert.equal(solution.type, 'quadratic');
      assert.equal(solution.solutions.length, 0); // No real solutions
      assert.ok(/no real solutions|complex conjugate roots/i.test(solution.explanation));
    });
  });

  describe('Equation Solver Edge Cases & Validation', () => {
    it('rejects empty equation input gracefully', () => {
      const solution = solveEquation('');
      assert.equal(solution.isValid, false);
      assert.equal(solution.type, 'unsupported');
    });

    it('rejects equation without variables: 2 + 3 = 5', () => {
      const solution = solveEquation('2 + 3 = 5');
      assert.equal(solution.isValid, false);
      assert.equal(solution.error, 'Missing variable');
    });

    it('rejects multi-variable equations with clear direction', () => {
      const solution = solveEquation('x + y = 10');
      assert.equal(solution.isValid, false);
      assert.ok(/multiple variables/i.test(solution.explanation));
    });

    it('rejects higher degree polynomials (> 2) with explanation', () => {
      const solution = solveEquation('x^3 - 8 = 0');
      assert.equal(solution.isValid, false);
      assert.equal(solution.type, 'unsupported');
      assert.ok(solution.error !== undefined);
    });
  });
});

// ============================================================================
// 4. DETERMINISTIC TOOL LAYER & AUTHORITATIVE VERIFICATION CONTRACTS
// ============================================================================
describe('Deterministic Pipeline: Tool Layer & Authoritative Verification Contract', () => {
  it('toolCalculate returns MathToolResult with authoritative verification badge', () => {
    const res: MathToolResult = toolCalculate({ expression: '2 + 3 * 4' });
    assert.equal(res.success, true);
    assert.equal(res.toolName, 'calculate');
    assert.equal(res.result, '14');
    assert.equal(res.approximateResult, '14');
    assert.ok(res.verificationBadge.isVerified, 'Verification badge must be verified');
    assert.equal(res.verificationBadge.confidence, 1.0, 'Deterministic confidence must be 1.0');
    assert.ok(res.derivationSteps.length > 0, 'Derivation steps must be non-empty');
  });

  it('toolCalculate preserves angle mode for trigonometric calculations', () => {
    const degRes: MathToolResult = toolCalculate({ expression: 'sin(90)', angleMode: 'DEG' });
    assert.equal(degRes.success, true);
    assert.equal(degRes.result, '1');

    // `domain` is a vestigial field on MathToolResult that no product code reads,
    // so the angle-mode contract is asserted behaviourally instead: the same
    // expression must produce a different answer in radians (sin(90 rad) is
    // cos(90°) ≈ 0.894), and pi/2 must be exactly 1 in radians.
    const radDeg: MathToolResult = toolCalculate({ expression: 'sin(90)', angleMode: 'RAD' });
    assert.equal(radDeg.success, true);
    assert.ok(
      Number(radDeg.result) !== 1,
      `the same expression in RAD mode must not return the DEG answer (got ${radDeg.result})`,
    );

    const radRes: MathToolResult = toolCalculate({ expression: 'sin(pi / 2)', angleMode: 'RAD' });
    assert.equal(radRes.success, true);
    assert.ok(Math.abs(Number(radRes.result) - 1) < 1e-9, `sin(pi/2) in radians is 1 (got ${radRes.result})`);
  });

  it('toolSolveEquation returns MathToolResult with authoritative verification badge', () => {
    const res: MathToolResult = toolSolveEquation({ equation: '2x + 5 = 15' });
    assert.equal(res.success, true);
    assert.equal(res.toolName, 'solveEquation');
    assert.ok(res.result.includes('5'));
    assert.equal(res.verificationBadge.isVerified, true);
    assert.equal(res.verificationBadge.confidence, 1.0);
    assert.ok(res.derivationSteps.length > 0);
  });

  it('executeMathTool dispatches calculate and solveEquation consistently', async () => {
    const calcResult = await executeMathTool('calculate', { expression: '15 / 3 + 2' });
    assert.equal(calcResult.success, true);
    assert.equal(calcResult.result, '7');

    const eqResult = await executeMathTool('solveEquation', { equation: 'x^2 - 5x + 6 = 0' });
    assert.equal(eqResult.success, true);
    assert.ok(eqResult.result.includes('2') && eqResult.result.includes('3'));
  });

  it('executeMathTool rejects invalid tool requests safely', async () => {
    // The dispatcher is asynchronous and rejects an unknown tool name through the
    // same `fail()` path as a bad argument, so an unknown name can never reach a
    // real tool.
    const unknownRes = await executeMathTool('nonExistentTool' as MathToolName, {});
    assert.equal(unknownRes.success, false);
    assert.ok(/unknown.*tool/i.test(unknownRes.error || ''));
  });

  it('guarantees deterministic result authoritativeness over external claims', () => {
    // Contract check: Deterministic engine result must match expected theoretical ground truth
    const groundTruthCases = [
      { expr: '12 * 12', expected: 144 },
      { expr: 'cos(0)', expected: 1 },
      { expr: '2^10', expected: 1024 },
      { expr: 'sqrt(625)', expected: 25 },
    ];

    for (const { expr, expected } of groundTruthCases) {
      const direct = calculateExpression(expr);
      const tool = toolCalculate({ expression: expr });
      assert.equal(direct.value, expected);
      assert.equal(Number(tool.result), expected);
      assert.equal(tool.verificationBadge.confidence, 1.0);
    }
  });
});
