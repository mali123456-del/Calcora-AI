/**
 * Scientific Engine Utilities
 * High-level operations, scientific keypad actions, and transformations.
 */

import { AngleMode } from '../types';
import { calculateExpression, CONSTANTS, sanitizeNumber } from './mathEngine';

export interface ScientificOperation {
  id: string;
  label: string;
  subLabel?: string;
  tooltip?: string;
  category: 'trig' | 'log' | 'power' | 'root' | 'constant' | 'calc';
  actionType: 'insertFunction' | 'insertOperator' | 'insertConstant' | 'applyImmediate';
  value: string;
}

export const SCIENTIFIC_FUNCTIONS: ScientificOperation[] = [
  // Trigonometry
  { id: 'sin', label: 'sin', category: 'trig', actionType: 'insertFunction', value: 'sin(' },
  { id: 'cos', label: 'cos', category: 'trig', actionType: 'insertFunction', value: 'cos(' },
  { id: 'tan', label: 'tan', category: 'trig', actionType: 'insertFunction', value: 'tan(' },
  { id: 'asin', label: 'sin⁻¹', category: 'trig', actionType: 'insertFunction', value: 'asin(' },
  { id: 'acos', label: 'cos⁻¹', category: 'trig', actionType: 'insertFunction', value: 'acos(' },
  { id: 'atan', label: 'tan⁻¹', category: 'trig', actionType: 'insertFunction', value: 'atan(' },
  { id: 'sinh', label: 'sinh', category: 'trig', actionType: 'insertFunction', value: 'sinh(' },
  { id: 'cosh', label: 'cosh', category: 'trig', actionType: 'insertFunction', value: 'cosh(' },
  { id: 'tanh', label: 'tanh', category: 'trig', actionType: 'insertFunction', value: 'tanh(' },

  // Logarithms
  { id: 'ln', label: 'ln', category: 'log', actionType: 'insertFunction', value: 'ln(' },
  { id: 'log', label: 'log₁₀', category: 'log', actionType: 'insertFunction', value: 'log10(' },

  // Powers & Roots
  { id: 'sqr', label: 'x²', category: 'power', actionType: 'insertOperator', value: '^2' },
  { id: 'cube', label: 'x³', category: 'power', actionType: 'insertOperator', value: '^3' },
  { id: 'pow', label: 'xʸ', category: 'power', actionType: 'insertOperator', value: '^' },
  { id: 'exp10', label: '10ˣ', category: 'power', actionType: 'insertFunction', value: '10^(' },
  { id: 'expe', label: 'eˣ', category: 'power', actionType: 'insertFunction', value: 'exp(' },
  { id: 'sqrt', label: '√x', category: 'root', actionType: 'insertFunction', value: 'sqrt(' },
  { id: 'cbrt', label: '∛x', category: 'root', actionType: 'insertFunction', value: 'cbrt(' },
  { id: 'recip', label: '1/x', category: 'calc', actionType: 'insertFunction', value: 'recip(' },
  { id: 'fact', label: 'n!', category: 'calc', actionType: 'insertOperator', value: '!' },
  { id: 'abs', label: '|x|', category: 'calc', actionType: 'insertFunction', value: 'abs(' },

  // Constants
  { id: 'pi', label: 'π', category: 'constant', actionType: 'insertConstant', value: 'π' },
  { id: 'e', label: 'e', category: 'constant', actionType: 'insertConstant', value: 'e' },
  { id: 'phi', label: 'φ', category: 'constant', actionType: 'insertConstant', value: 'φ' },
];

/**
 * Perform percentage calculations
 * Handles both "15% of 850" style and standard additions
 */
export function calculatePercentage(
  base: number,
  percentage: number,
  mode: 'of' | 'add' | 'subtract' = 'of'
): { result: number; stepExplanation: string } {
  const fraction = percentage / 100;
  const value = base * fraction;

  if (mode === 'of') {
    return {
      result: sanitizeNumber(value),
      stepExplanation: `Step 1: ${percentage} ÷ 100 = ${fraction}\nStep 2: ${base} × ${fraction} = ${sanitizeNumber(value)}`,
    };
  }

  if (mode === 'add') {
    const finalVal = base + value;
    return {
      result: sanitizeNumber(finalVal),
      stepExplanation: `Step 1: Calculate ${percentage}% of ${base} = ${value}\nStep 2: ${base} + ${value} = ${sanitizeNumber(finalVal)}`,
    };
  }

  const finalVal = base - value;
  return {
    result: sanitizeNumber(finalVal),
    stepExplanation: `Step 1: Calculate ${percentage}% of ${base} = ${value}\nStep 2: ${base} - ${value} = ${sanitizeNumber(finalVal)}`,
  };
}
