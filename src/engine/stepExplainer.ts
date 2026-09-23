/**
 * Step-by-Step Mathematical Explanation Engine
 * Generates transparent derivations for user calculations without exposing internal engine details.
 */

import { AngleMode } from '../types';
import { calculateExpression, formatResult, sanitizeNumber } from './mathEngine';

export interface MathStep {
  stepNumber: number;
  operation: string;
  result: string;
  note?: string;
}

export function generateCalculationExplanation(
  expr: string,
  angleMode: AngleMode = 'DEG'
): { steps: MathStep[]; finalAnswer: string; summary: string } {
  const trimmed = expr.trim();
  const calc = calculateExpression(trimmed, angleMode);

  if (calc.error) {
    return {
      steps: [
        {
          stepNumber: 1,
          operation: `Evaluate "${trimmed}"`,
          result: 'Error',
          note: calc.error,
        },
      ],
      finalAnswer: 'Error',
      summary: `Calculation failed: ${calc.error}`,
    };
  }

  const steps: MathStep[] = [];

  // Percentage pattern: "X% of Y" or "X% * Y" or "X * Y%"
  const percentMatch = trimmed.match(/^(\d+\.?\d*)\s*(?:%|percent)\s*(?:of|\*)\s*(\d+\.?\d*)$/i);
  if (percentMatch) {
    const p = parseFloat(percentMatch[1]);
    const b = parseFloat(percentMatch[2]);
    const fraction = p / 100;
    const ans = b * fraction;

    steps.push({
      stepNumber: 1,
      operation: `Convert percentage to decimal: ${p} ÷ 100`,
      result: `${fraction}`,
      note: 'Divide by 100 to get decimal ratio',
    });
    steps.push({
      stepNumber: 2,
      operation: `Multiply by base value: ${b} × ${fraction}`,
      result: `${formatResult(sanitizeNumber(ans))}`,
      note: 'Obtain fractional share of base',
    });

    return {
      steps,
      finalAnswer: formatResult(sanitizeNumber(ans)),
      summary: `${p}% of ${b} is ${formatResult(sanitizeNumber(ans))}`,
    };
  }

  // Trigonometric function pattern: "sin(30)" etc.
  const trigMatch = trimmed.match(/^(sin|cos|tan|asin|acos|atan)\(([^)]+)\)$/i);
  if (trigMatch) {
    const fn = trigMatch[1].toLowerCase();
    const argStr = trigMatch[2];
    const argVal = parseFloat(argStr);

    steps.push({
      stepNumber: 1,
      operation: `Identify function and angle mode: ${fn}(${argStr}) in ${angleMode} mode`,
      result: `${argStr} ${angleMode}`,
      note: `Calculator is configured to ${angleMode}`,
    });

    if (['sin', 'cos', 'tan'].includes(fn)) {
      steps.push({
        stepNumber: 2,
        operation: `Apply ${fn.toUpperCase()} trigonometric definition`,
        result: calc.display,
        note: `Exact evaluated value: ${calc.display}`,
      });
    } else {
      steps.push({
        stepNumber: 2,
        operation: `Compute inverse trigonometric angle ${fn}(${argVal})`,
        result: `${calc.display}°/rad`,
        note: `Output in ${angleMode}`,
      });
    }

    return {
      steps,
      finalAnswer: calc.display,
      summary: `${fn}(${argStr}) in ${angleMode} = ${calc.display}`,
    };
  }

  // Power / Root pattern: "sqrt(144)" or "5^2"
  const sqrtMatch = trimmed.match(/^sqrt\(([^)]+)\)$/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    steps.push({
      stepNumber: 1,
      operation: `Find principal square root √${val}`,
      result: calc.display,
      note: `Since (${calc.display})² = ${val}`,
    });
    return {
      steps,
      finalAnswer: calc.display,
      summary: `√${val} = ${calc.display}`,
    };
  }

  // Standard multi-operator expression
  steps.push({
    stepNumber: 1,
    operation: `Parse expression respecting algebraic order of operations (PEMDAS)`,
    result: trimmed,
    note: 'Parentheses → Exponents → Multiplication/Division → Addition/Subtraction',
  });

  steps.push({
    stepNumber: 2,
    operation: `Evaluate operators and simplify terms`,
    result: calc.display,
    note: 'Computed deterministically with 12-digit scientific precision',
  });

  return {
    steps,
    finalAnswer: calc.display,
    summary: `${trimmed} = ${calc.display}`,
  };
}
