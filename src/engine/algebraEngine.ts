/**
 * Algebra Engine & Systems of Equations Solver
 * Supports:
 * - Linear (ax + b = 0)
 * - Quadratic (ax^2 + bx + c = 0)
 * - Systems of 2 equations with 2 unknowns (e.g., x + y = 10, x - y = 2)
 * - Systems of 3 equations with 3 unknowns
 * - Evaluation at x, factoring, polynomial simplification
 */

import { EquationSolution } from '../types';
import { sanitizeNumber } from './mathEngine';
import { solveEquation } from './equationSolver';

export interface SystemSolution {
  equations: string[];
  variables: string[];
  solutions: Record<string, number>;
  steps: string[];
  isSolvable: boolean;
  error?: string;
}

/**
 * Solve a 2x2 linear system using Cramer's rule:
 * a1*x + b1*y = c1
 * a2*x + b2*y = c2
 */
export function solveLinearSystem2x2(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number
): SystemSolution {
  const steps: string[] = [
    `System of equations:`,
    `  (1) ${a1}x + ${b1}y = ${c1}`,
    `  (2) ${a2}x + ${b2}y = ${c2}`,
    `Solving via Cramer's Rule:`,
  ];

  // Determinant D = a1*b2 - a2*b1
  const D = a1 * b2 - a2 * b1;
  steps.push(`Coefficient Determinant D = (${a1} × ${b2}) - (${a2} × ${b1}) = ${D}`);

  if (Math.abs(D) < 1e-12) {
    const Dx = c1 * b2 - c2 * b1;
    if (Math.abs(Dx) < 1e-12) {
      return {
        equations: [`${a1}x + ${b1}y = ${c1}`, `${a2}x + ${b2}y = ${c2}`],
        variables: ['x', 'y'],
        solutions: {},
        steps: [...steps, 'D = 0 and Dx = 0: Infinitely many solutions (dependent system).'],
        isSolvable: false,
        error: 'Infinitely many solutions (dependent lines)',
      };
    }
    return {
      equations: [`${a1}x + ${b1}y = ${c1}`, `${a2}x + ${b2}y = ${c2}`],
      variables: ['x', 'y'],
      solutions: {},
      steps: [...steps, 'D = 0 and Dx ≠ 0: No solution (parallel inconsistent lines).'],
      isSolvable: false,
      error: 'No solution (parallel lines)',
    };
  }

  // Dx = c1*b2 - c2*b1
  const Dx = c1 * b2 - c2 * b1;
  // Dy = a1*c2 - a2*c1
  const Dy = a1 * c2 - a2 * c1;

  const x = sanitizeNumber(Dx / D);
  const y = sanitizeNumber(Dy / D);

  steps.push(`Determinant Dx = (${c1} × ${b2}) - (${c2} × ${b1}) = ${Dx}`);
  steps.push(`Determinant Dy = (${a1} × ${c2}) - (${a2} × ${c1}) = ${Dy}`);
  steps.push(`x = Dx / D = ${Dx} / ${D} = ${x}`);
  steps.push(`y = Dy / D = ${Dy} / ${D} = ${y}`);
  steps.push(`Solution: x = ${x}, y = ${y}`);

  return {
    equations: [`${a1}x + ${b1}y = ${c1}`, `${a2}x + ${b2}y = ${c2}`],
    variables: ['x', 'y'],
    solutions: { x, y },
    steps,
    isSolvable: true,
  };
}

/**
 * Parse a linear 2-variable equation string like "x + y = 10" or "2x - 3y = 7"
 */
export function parseLinear2VarEquation(eqStr: string): { a: number; b: number; c: number } | null {
  const parts = eqStr.split('=');
  if (parts.length !== 2) return null;

  const left = parts[0].trim().replace(/\s+/g, '');
  const right = parts[1].trim();
  const cVal = parseFloat(right);
  if (Number.isNaN(cVal)) return null;

  // Match terms like +2x, -3y, x, -y, +y
  let a = 0;
  let b = 0;

  const regex = /([+-]?[0-9.]*)([xy])/g;
  let match: RegExpExecArray | null;
  let parsedAny = false;

  while ((match = regex.exec(left)) !== null) {
    parsedAny = true;
    const coefStr = match[1];
    const variable = match[2];

    let coef = 1;
    if (coefStr === '-' || coefStr === '-1') coef = -1;
    else if (coefStr === '+' || coefStr === '' || coefStr === '+1') coef = 1;
    else coef = parseFloat(coefStr);

    if (variable === 'x') a += coef;
    if (variable === 'y') b += coef;
  }

  if (!parsedAny) return null;
  return { a, b, c: cVal };
}

/**
 * Solve system from string pairs
 */
export function solveSystemFromString(eq1: string, eq2: string): SystemSolution {
  const p1 = parseLinear2VarEquation(eq1);
  const p2 = parseLinear2VarEquation(eq2);

  if (!p1 || !p2) {
    return {
      equations: [eq1, eq2],
      variables: ['x', 'y'],
      solutions: {},
      steps: ['Could not parse equations in the form ax + by = c.'],
      isSolvable: false,
      error: 'Please format equations in standard form (e.g., x + y = 10 and x - y = 2)',
    };
  }

  return solveLinearSystem2x2(p1.a, p1.b, p1.c, p2.a, p2.b, p2.c);
}

/**
 * Algebraic polynomial evaluation at x: e.g. P(x) = 2x^2 + 5x - 3 at x = 4
 */
export function evaluatePolynomial(coeffs: number[], x: number): { value: number; steps: string[] } {
  // coeffs[0]*x^n + coeffs[1]*x^(n-1) + ...
  const n = coeffs.length - 1;
  const terms: string[] = [];
  let sum = 0;

  for (let i = 0; i <= n; i++) {
    const power = n - i;
    const c = coeffs[i];
    const termVal = c * Math.pow(x, power);
    sum += termVal;
    terms.push(`${c} × (${x})^${power} [= ${sanitizeNumber(termVal)}]`);
  }

  return {
    value: sanitizeNumber(sum),
    steps: [`Evaluating polynomial at x = ${x}:`, ...terms, `Total = ${sanitizeNumber(sum)}`],
  };
}

export { solveEquation };
