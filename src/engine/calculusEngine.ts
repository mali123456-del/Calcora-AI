/**
 * Calculus Toolkit Engine
 * Deterministic numerical differentiation, integration (Composite Simpson's 1/3 rule),
 * limits, and symbolic tangent line derivations.
 */

import { calculateExpression, sanitizeNumber } from './mathEngine';

/**
 * Safely evaluate a math function string f(x) at a specific numerical value of x
 */
export function evaluateFunctionAt(expr: string, xVal: number): number {
  // Replace standalone variable 'x' with (xVal)
  const safeExpr = expr.replace(/(?<![a-zA-Z])x(?![a-zA-Z])/g, `(${xVal})`);
  const calc = calculateExpression(safeExpr, 'RAD');
  if (calc.error || Number.isNaN(calc.value)) {
    throw new Error(`Failed to evaluate f(${xVal}): ${calc.error || 'invalid value'}`);
  }
  return calc.value;
}

export interface DerivativeResult {
  value: number;
  tangentLine?: string;
  steps: string[];
}

export interface IntegralResult {
  value: number;
  intervals: number;
  steps: string[];
}

export interface LimitResult {
  value: number | string;
  exists: boolean;
  steps: string[];
}

/**
 * Numerical Derivative using central difference formulas:
 * 1st order: f'(x) ≈ (f(x + h) - f(x - h)) / (2h)
 * 2nd order: f''(x) ≈ (f(x + h) - 2f(x) + f(x - h)) / h²
 */
export function numericalDerivative(
  fnExpr: string,
  x0: number,
  order: 1 | 2 = 1,
  h = 1e-5
): DerivativeResult {
  const fX0 = evaluateFunctionAt(fnExpr, x0);
  const fPlus = evaluateFunctionAt(fnExpr, x0 + h);
  const fMinus = evaluateFunctionAt(fnExpr, x0 - h);

  if (order === 1) {
    const deriv = (fPlus - fMinus) / (2 * h);
    const cleanDeriv = sanitizeNumber(deriv);

    // Tangent line: y - y0 = m(x - x0) => y = m*x + (y0 - m*x0)
    const intercept = sanitizeNumber(fX0 - cleanDeriv * x0);
    const sign = intercept >= 0 ? '+' : '-';
    const absIntercept = Math.abs(intercept);
    const tangentLine = `y = ${cleanDeriv}x ${sign} ${absIntercept}`;

    const steps = [
      `Function: f(x) = ${fnExpr}`,
      `Point of tangency: x₀ = ${x0}, f(x₀) = ${sanitizeNumber(fX0)}`,
      `Central Difference Formula (step size h = ${h}):`,
      `f'(x) ≈ [f(x₀ + h) - f(x₀ - h)] / (2h)`,
      `f(${x0} + ${h}) = ${sanitizeNumber(fPlus)}`,
      `f(${x0} - ${h}) = ${sanitizeNumber(fMinus)}`,
      `f'(${x0}) ≈ (${sanitizeNumber(fPlus)} - ${sanitizeNumber(fMinus)}) / ${2 * h} = ${cleanDeriv}`,
      `Tangent line equation at (${x0}, ${sanitizeNumber(fX0)}): ${tangentLine}`,
    ];

    return {
      value: cleanDeriv,
      tangentLine,
      steps,
    };
  } else {
    // 2nd Derivative
    const secondDeriv = (fPlus - 2 * fX0 + fMinus) / (h * h);
    const cleanSecond = sanitizeNumber(secondDeriv);

    const steps = [
      `Function: f(x) = ${fnExpr}`,
      `Second Derivative Formula (Central Difference):`,
      `f''(x) ≈ [f(x₀ + h) - 2f(x₀) + f(x₀ - h)] / h²`,
      `f(${x0} + ${h}) = ${sanitizeNumber(fPlus)}`,
      `f(${x0}) = ${sanitizeNumber(fX0)}`,
      `f(${x0} - ${h}) = ${sanitizeNumber(fMinus)}`,
      `f''(${x0}) ≈ (${sanitizeNumber(fPlus)} - 2(${sanitizeNumber(fX0)}) + ${sanitizeNumber(fMinus)}) / (${h}²) = ${cleanSecond}`,
    ];

    return {
      value: cleanSecond,
      steps,
    };
  }
}

/**
 * Definite Integral using Composite Simpson's 1/3 Rule:
 * ∫[a to b] f(x) dx ≈ (h/3) * [f(x0) + 4Σf(x_odd) + 2Σf(x_even) + f(xn)]
 */
export function numericalDefiniteIntegral(
  fnExpr: string,
  a: number,
  b: number,
  n = 1000
): IntegralResult {
  if (a === b) {
    return {
      value: 0,
      intervals: 0,
      steps: ['Limits of integration are identical: ∫[a to a] f(x) dx = 0.'],
    };
  }

  // Ensure n is even
  const intervals = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / intervals;

  const fA = evaluateFunctionAt(fnExpr, a);
  const fB = evaluateFunctionAt(fnExpr, b);
  let sum = fA + fB;

  for (let i = 1; i < intervals; i++) {
    const x_i = a + i * h;
    const f_i = evaluateFunctionAt(fnExpr, x_i);
    if (i % 2 === 1) {
      sum += 4 * f_i;
    } else {
      sum += 2 * f_i;
    }
  }

  const integralVal = sanitizeNumber((h / 3) * sum);

  const steps = [
    `Integral: ∫[${a} to ${b}] (${fnExpr}) dx`,
    `Approximated via Composite Simpson's 1/3 Rule with ${intervals} subintervals:`,
    `Step width h = (${b} - ${a}) / ${intervals} = ${sanitizeNumber(h)}`,
    `Formula: (h/3) × [f(a) + 4Σf(x_odd) + 2Σf(x_even) + f(b)]`,
    `f(${a}) = ${sanitizeNumber(fA)}, f(${b}) = ${sanitizeNumber(fB)}`,
    `Accumulated weighted sum = ${sanitizeNumber(sum)}`,
    `Definite Integral Result = (${sanitizeNumber(h)} / 3) × ${sanitizeNumber(sum)} = ${integralVal}`,
  ];

  return {
    value: integralVal,
    intervals,
    steps,
  };
}

export const definiteIntegral = (fnExpr: string, a: number, b: number, n = 1000) => {
  const res = numericalDefiniteIntegral(fnExpr, a, b, n);
  return {
    type: 'integral' as const,
    expression: fnExpr,
    variable: 'x',
    resultDisplay: String(res.value),
    numericValue: res.value,
    steps: res.steps,
    explanation: `Definite integral from ${a} to ${b} is ${res.value}.`,
  };
};

export function simpsonsRuleDefiniteIntegral(
  fnExpr: string,
  a: number,
  b: number,
  n = 100
): number {
  return numericalDefiniteIntegral(fnExpr, a, b, n).value;
}

/**
 * Numerical Limit: lim_{x -> c} f(x)
 * Supports two-sided limit, left-hand (x -> c⁻), and right-hand (x -> c⁺)
 */
export function evaluateLimit(
  fnExpr: string,
  c: number,
  direction: 'both' | 'left' | 'right' = 'both'
): LimitResult {
  const deltas = [1e-3, 1e-4, 1e-5, 1e-6];

  if (direction === 'left') {
    const leftVals = deltas.map((d) => evaluateFunctionAt(fnExpr, c - d));
    const leftLimit = sanitizeNumber(leftVals[leftVals.length - 1]);
    const steps = [
      `Left-hand limit: lim(x -> ${c}⁻) [${fnExpr}]`,
      ...deltas.map((d, i) => `  f(${c} - ${d}) = ${sanitizeNumber(leftVals[i])}`),
      `Approaching value: ${leftLimit}`,
    ];
    return { value: leftLimit, exists: true, steps };
  }

  if (direction === 'right') {
    const rightVals = deltas.map((d) => evaluateFunctionAt(fnExpr, c + d));
    const rightLimit = sanitizeNumber(rightVals[rightVals.length - 1]);
    const steps = [
      `Right-hand limit: lim(x -> ${c}⁺) [${fnExpr}]`,
      ...deltas.map((d, i) => `  f(${c} + ${d}) = ${sanitizeNumber(rightVals[i])}`),
      `Approaching value: ${rightLimit}`,
    ];
    return { value: rightLimit, exists: true, steps };
  }

  // Two-sided limit
  const leftVals = deltas.map((d) => evaluateFunctionAt(fnExpr, c - d));
  const rightVals = deltas.map((d) => evaluateFunctionAt(fnExpr, c + d));

  const leftLimit = leftVals[leftVals.length - 1];
  const rightLimit = rightVals[rightVals.length - 1];
  const diff = Math.abs(leftLimit - rightLimit);

  const steps = [
    `Evaluating two-sided limit: lim(x -> ${c}) [${fnExpr}]`,
    `Left-hand approach (x -> ${c}⁻): ${sanitizeNumber(leftLimit)}`,
    `Right-hand approach (x -> ${c}⁺): ${sanitizeNumber(rightLimit)}`,
  ];

  if (diff < 1e-4) {
    const limitVal = sanitizeNumber((leftLimit + rightLimit) / 2);
    steps.push(`Left and right limits agree: lim(x -> ${c}) = ${limitVal}`);
    return {
      value: limitVal,
      exists: true,
      steps,
    };
  } else {
    steps.push(`Left limit (${sanitizeNumber(leftLimit)}) ≠ Right limit (${sanitizeNumber(rightLimit)})`);
    return {
      value: 'Does not exist (DNE)',
      exists: false,
      steps,
    };
  }
}

export const numericalLimit = evaluateLimit;
