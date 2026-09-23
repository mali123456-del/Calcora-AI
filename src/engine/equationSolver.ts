/**
 * Deterministic Equation Solver
 * Solves linear and quadratic equations analytically with step-by-step mathematical proofs.
 */

import { EquationSolution } from '../types';
import { sanitizeNumber, formatResult } from './mathEngine';

export function solveEquation(rawEq: string): EquationSolution {
  if (!rawEq || !rawEq.trim()) {
    return {
      equation: rawEq,
      type: 'unsupported',
      variables: [],
      solutions: [],
      steps: [],
      explanation: 'Please enter an algebraic equation.',
      isValid: false,
      error: 'Empty equation',
    };
  }

  // Normalize equation characters
  const eq = rawEq
    .replace(/\s+/g, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  // Detect variable (letter)
  const varMatches = eq.match(/[a-zA-Z]/g);
  if (!varMatches) {
    return {
      equation: rawEq,
      type: 'unsupported',
      variables: [],
      solutions: [],
      steps: [],
      explanation: 'No variable detected in the equation (e.g. x).',
      isValid: false,
      error: 'Missing variable',
    };
  }

  // Verify single variable
  const variable = varMatches[0];
  const uniqueVars = Array.from(new Set(varMatches));
  if (uniqueVars.length > 1) {
    return {
      equation: rawEq,
      type: 'unsupported',
      variables: uniqueVars,
      solutions: [],
      steps: [],
      explanation: `System detected multiple variables: ${uniqueVars.join(', ')}. Currently, single-variable equations are supported.`,
      isValid: false,
      error: 'Multi-variable equations require system solver',
    };
  }

  // Must have an '=' sign, or assume '= 0'
  let leftSide = eq;
  let rightSide = '0';
  if (eq.includes('=')) {
    const parts = eq.split('=');
    if (parts.length !== 2) {
      return {
        equation: rawEq,
        type: 'unsupported',
        variables: [variable],
        solutions: [],
        steps: [],
        explanation: 'Invalid equation: multiple equals signs detected.',
        isValid: false,
        error: 'Multiple equals signs',
      };
    }
    leftSide = parts[0];
    rightSide = parts[1];
  }

  // Bring everything to the left side: Left - (Right) = 0
  // Parse polynomial terms: ax^2 + bx + c = 0
  try {
    const leftCoeffs = parsePolynomialSide(leftSide, variable);
    const rightCoeffs = parsePolynomialSide(rightSide, variable);

    // Combine: left - right
    const a = (leftCoeffs[2] || 0) - (rightCoeffs[2] || 0);
    const b = (leftCoeffs[1] || 0) - (rightCoeffs[1] || 0);
    const c = (leftCoeffs[0] || 0) - (rightCoeffs[0] || 0);

    // Check degree higher than 2
    for (const deg of Object.keys(leftCoeffs).concat(Object.keys(rightCoeffs))) {
      const d = parseInt(deg, 10);
      if (d > 2 && ((leftCoeffs[d] || 0) - (rightCoeffs[d] || 0)) !== 0) {
        return {
          equation: rawEq,
          type: 'polynomial',
          variables: [variable],
          solutions: [],
          steps: [],
          explanation: `Equations of degree ${d} are not yet analytically solved. Try our AI Math Assistant for higher-degree approximations.`,
          isValid: false,
          error: `Unsupported degree: ${d}`,
        };
      }
    }

    // Case 1: Quadratic (a !== 0)
    if (Math.abs(a) > 1e-12) {
      return solveQuadratic(rawEq, variable, a, b, c);
    }

    // Case 2: Linear (a === 0, b !== 0)
    if (Math.abs(b) > 1e-12) {
      return solveLinear(rawEq, variable, b, c);
    }

    // Case 3: Constant equation (e.g. 5 = 5 or 5 = 0)
    if (Math.abs(c) < 1e-12) {
      return {
        equation: rawEq,
        type: 'linear',
        variables: [variable],
        solutions: [],
        steps: ['0 = 0 (identity)'],
        explanation: 'Identity equation: true for all real values of ' + variable + '.',
        isValid: true,
      };
    } else {
      return {
        equation: rawEq,
        type: 'linear',
        variables: [variable],
        solutions: [],
        steps: [`${c} = 0 is a contradiction`],
        explanation: 'Inconsistent equation: no real solution exists.',
        isValid: true,
        error: 'No solution',
      };
    }
  } catch (err: any) {
    return {
      equation: rawEq,
      type: 'unsupported',
      variables: [variable],
      solutions: [],
      steps: [],
      explanation: `Could not parse equation: ${err.message || 'Syntax error'}. Make sure it is formatted like "2x + 5 = 15" or "x^2 + 5x + 6 = 0".`,
      isValid: false,
      error: err.message,
    };
  }
}

/**
 * Helper to parse one side of a polynomial expression into degree -> coefficient map
 */
function parsePolynomialSide(side: string, variable: string): Record<number, number> {
  const coeffs: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  if (!side || side === '0') return coeffs;

  // Split into signed terms while respecting unary signs at start
  const regex = /([+-]?[^+-]+)/g;
  const terms = side.match(regex);
  if (!terms) return coeffs;

  for (let term of terms) {
    term = term.trim();
    if (!term) continue;

    let sign = 1;
    if (term.startsWith('+')) {
      term = term.slice(1);
    } else if (term.startsWith('-')) {
      sign = -1;
      term = term.slice(1);
    }

    // Quadratic term: e.g. x^2, 3x^2, 2.5x^2, x*x
    const quadRegex = new RegExp(`^(\\d*\\.?\\d*)?\\*?${variable}\\^2$`, 'i');
    const quadMatch = term.match(quadRegex);
    if (quadMatch) {
      const coeffStr = quadMatch[1];
      const coeffVal = coeffStr === '' || coeffStr === undefined ? 1 : parseFloat(coeffStr);
      coeffs[2] = (coeffs[2] || 0) + sign * coeffVal;
      continue;
    }

    // Linear term: e.g. x, 5x, 2.5*x
    const linRegex = new RegExp(`^(\\d*\\.?\\d*)?\\*?${variable}$`, 'i');
    const linMatch = term.match(linRegex);
    if (linMatch) {
      const coeffStr = linMatch[1];
      const coeffVal = coeffStr === '' || coeffStr === undefined ? 1 : parseFloat(coeffStr);
      coeffs[1] = (coeffs[1] || 0) + sign * coeffVal;
      continue;
    }

    // Constant number: e.g. 5, 12.3
    const num = parseFloat(term);
    if (!Number.isNaN(num)) {
      coeffs[0] = (coeffs[0] || 0) + sign * num;
      continue;
    }

    throw new Error(`Unrecognized term '${term}'`);
  }

  return coeffs;
}

/**
 * Solve Linear Equation: bx + c = 0 => x = -c / b
 */
function solveLinear(
  rawEq: string,
  variable: string,
  b: number,
  c: number
): EquationSolution {
  const x = -c / b;
  const sanitizedX = sanitizeNumber(x);

  const steps = [
    `Standard Form: ${b !== 1 ? b : ''}${variable} ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`} = 0`,
    `Subtract constant from both sides: ${b !== 1 ? b : ''}${variable} = ${sanitizeNumber(-c)}`,
    b !== 1 ? `Divide both sides by ${b}: ${variable} = ${sanitizeNumber(-c)} ÷ ${b}` : null,
    `Final Solution: ${variable} = ${formatResult(sanitizedX)}`,
  ].filter(Boolean) as string[];

  return {
    equation: rawEq,
    type: 'linear',
    variables: [variable],
    solutions: [sanitizedX],
    steps,
    explanation: `Linear equation with single root: ${variable} = ${formatResult(sanitizedX)}`,
    isValid: true,
  };
}

/**
 * Solve Quadratic Equation: ax^2 + bx + c = 0 via discriminant D = b^2 - 4ac
 */
function solveQuadratic(
  rawEq: string,
  variable: string,
  a: number,
  b: number,
  c: number
): EquationSolution {
  const D = b * b - 4 * a * c;
  const sanitizedD = sanitizeNumber(D);

  const aStr = a === 1 ? '' : a === -1 ? '-' : `${a}`;
  const bStr = b === 0 ? '' : b > 0 ? `+ ${b === 1 ? '' : b}${variable}` : `- ${Math.abs(b) === 1 ? '' : Math.abs(b)}${variable}`;
  const cStr = c === 0 ? '' : c > 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
  const standardForm = `${aStr}${variable}² ${bStr} ${cStr} = 0`.replace(/\s+/g, ' ').trim();

  const steps: string[] = [
    `Standard Quadratic Form: ${standardForm}`,
    `Identify coefficients: a = ${a}, b = ${b}, c = ${c}`,
    `Compute Discriminant (Δ = b² - 4ac):`,
    `Δ = (${b})² - 4(${a})(${c}) = ${b * b} - (${4 * a * c}) = ${sanitizedD}`,
  ];

  if (sanitizedD > 0) {
    const sqrtD = Math.sqrt(sanitizedD);
    const x1 = sanitizeNumber((-b + sqrtD) / (2 * a));
    const x2 = sanitizeNumber((-b - sqrtD) / (2 * a));

    steps.push(
      `Since Δ > 0, there are two distinct real roots:`,
      `${variable} = (-b ± √Δ) / 2a`,
      `${variable}₁ = (-(${b}) + √${sanitizedD}) / (2 × ${a}) = (${-b} + ${sanitizeNumber(sqrtD)}) / ${2 * a} = ${formatResult(x1)}`,
      `${variable}₂ = (-(${b}) - √${sanitizedD}) / (2 × ${a}) = (${-b} - ${sanitizeNumber(sqrtD)}) / ${2 * a} = ${formatResult(x2)}`
    );

    return {
      equation: rawEq,
      type: 'quadratic',
      variables: [variable],
      solutions: [x1, x2].sort((n1, n2) => n1 - n2),
      steps,
      discriminant: sanitizedD,
      explanation: `Two real roots: ${variable} = ${formatResult(x1)} and ${variable} = ${formatResult(x2)}`,
      isValid: true,
    };
  }

  if (Math.abs(sanitizedD) < 1e-12) {
    const x = sanitizeNumber(-b / (2 * a));
    steps.push(
      `Since Δ = 0, there is exactly one repeated real root:`,
      `${variable} = -b / (2a) = -(${b}) / (2 × ${a}) = ${formatResult(x)}`
    );

    return {
      equation: rawEq,
      type: 'quadratic',
      variables: [variable],
      solutions: [x],
      steps,
      discriminant: 0,
      explanation: `One repeated real root: ${variable} = ${formatResult(x)}`,
      isValid: true,
    };
  }

  // Complex roots
  const realPart = sanitizeNumber(-b / (2 * a));
  const imagPart = sanitizeNumber(Math.sqrt(-sanitizedD) / (2 * Math.abs(a)));
  steps.push(
    `Since Δ < 0, there are no real roots (two complex conjugate roots):`,
    `${variable} = ${formatResult(realPart)} ± ${formatResult(imagPart)}i`
  );

  return {
    equation: rawEq,
    type: 'quadratic',
    variables: [variable],
    solutions: [],
    steps,
    discriminant: sanitizedD,
    explanation: `No real solutions. Complex conjugate roots: ${variable} = ${formatResult(realPart)} ± ${formatResult(imagPart)}i`,
    isValid: true,
    error: 'Complex solutions (no real roots)',
  };
}
