/**
 * AI Provider Client & Math Handshake Verifier
 * Communicates with server-side /api/ai/math endpoint.
 * Enforces Phase 15 rule: AI + Deterministic Engine Handshake.
 * Deterministic engine is the source of truth for numerical calculations.
 */

import { AIMessage, QuizQuestion } from '../types';
import { calculateExpression } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';
import { generateCalculationExplanation } from '../engine/stepExplainer';

export interface AIResponse {
  answer: string;
  expression?: string | null;
  steps?: string[];
  formula?: string | null;
  isVerified?: boolean;
  verificationNote?: string;
  isOfflineFallback?: boolean;
}

/**
 * Handshake Verifier:
 * Validates AI proposed expression with deterministic engine
 */
export function verifyWithDeterministicEngine(expression?: string | null): {
  isVerified: boolean;
  verificationNote: string;
  verifiedResult?: string;
} {
  if (!expression || !expression.trim()) {
    return {
      isVerified: false,
      verificationNote: 'AI explanation — numerical result not independently verified',
    };
  }

  try {
    const calc = calculateExpression(expression);
    if (!calc.error && Number.isFinite(calc.value)) {
      return {
        isVerified: true,
        verificationNote: 'Verified by Calculator Engine',
        verifiedResult: calc.display,
      };
    }
  } catch {
    // fallback
  }

  return {
    isVerified: false,
    verificationNote: 'AI explanation — numerical result not independently verified',
  };
}

export async function askAIMathAssistant(
  prompt: string,
  conversation: AIMessage[] = [],
  currentExpression?: string,
  currentResult?: string,
  mode: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint' = 'explain'
): Promise<AIResponse> {
  try {
    const res = await fetch('/api/ai/math', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        conversation,
        currentExpression,
        currentResult,
        mode,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawExpr = data.expression || null;

    // Handshake check
    const handshake = verifyWithDeterministicEngine(rawExpr);

    return {
      answer: data.answer || 'Response received',
      expression: rawExpr,
      steps: data.steps || [],
      formula: data.formula || null,
      isVerified: handshake.isVerified,
      verificationNote: handshake.verificationNote,
      isOfflineFallback: Boolean(data.isOfflineFallback),
    };
  } catch (error: any) {
    console.warn('AI API call failed, falling back to local deterministic tutor:', error);
    return fallbackLocalMathTutor(prompt, currentExpression, currentResult);
  }
}

/**
 * Local Deterministic Math Tutor Fallback
 */
function fallbackLocalMathTutor(
  prompt: string,
  currentExpression?: string,
  currentResult?: string
): AIResponse {
  const p = prompt.trim();

  // Check if user is asking to solve an equation: e.g. "solve x^2 + 5x + 6 = 0"
  if (p.toLowerCase().includes('solve') || p.includes('=')) {
    const cleaned = p.replace(/solve/i, '').trim();
    const eqRes = solveEquation(cleaned);
    if (eqRes.isValid) {
      return {
        answer: eqRes.explanation,
        steps: eqRes.steps,
        formula: eqRes.type === 'quadratic' ? 'x = (-b ± √(b² - 4ac)) / (2a)' : 'ax + b = 0 ⇒ x = -b/a',
        isVerified: true,
        verificationNote: 'Verified by Calculator Engine',
        isOfflineFallback: true,
      };
    }
  }

  // Check if user is asking for percentage: e.g. "what is 15% of 850?"
  const pctMatch = p.match(/(\d+\.?\d*)\s*%\s*(?:of)?\s*(\d+\.?\d*)/i);
  if (pctMatch) {
    const exp = `${pctMatch[1]}% of ${pctMatch[2]}`;
    const expl = generateCalculationExplanation(exp);
    const mathExpr = `${pctMatch[1]} * ${pctMatch[2]} / 100`;
    const handshake = verifyWithDeterministicEngine(mathExpr);
    return {
      answer: expl.summary,
      steps: expl.steps.map((s) => `${s.operation} → ${s.result} (${s.note || ''})`),
      expression: mathExpr,
      isVerified: handshake.isVerified,
      verificationNote: handshake.verificationNote,
      isOfflineFallback: true,
    };
  }

  // Check if user is asking to explain current calculation
  if (
    p.toLowerCase().includes('explain') &&
    currentExpression &&
    currentExpression.trim()
  ) {
    const expl = generateCalculationExplanation(currentExpression);
    return {
      answer: `Explanation for ${currentExpression}:`,
      steps: expl.steps.map((s) => `${s.operation} → ${s.result}`),
      expression: currentExpression,
      isVerified: true,
      verificationNote: 'Verified by Calculator Engine',
      isOfflineFallback: true,
    };
  }

  // Check if expression directly evaluates
  const calc = calculateExpression(p);
  if (!calc.error && Number.isFinite(calc.value)) {
    return {
      answer: `Deterministic evaluation: ${p} = ${calc.display}`,
      expression: p,
      steps: [
        'Parsed mathematical tokens safely without eval()',
        'Evaluated via Reverse Polish Notation (Shunting-Yard)',
        `Final numerical value: ${calc.display}`,
      ],
      isVerified: true,
      verificationNote: 'Verified by Calculator Engine',
      isOfflineFallback: true,
    };
  }

  return {
    answer: `I am your digital mathematical copilot. You can ask me to solve equations, compute percentages, explain formulas, or derive mathematical proofs.`,
    steps: [
      'Example: "Calculate 15% of 850"',
      'Example: "Solve x² + 5x + 6 = 0"',
      'Example: "Derive quadratic formula"',
    ],
    formula: null,
    isVerified: false,
    verificationNote: 'AI explanation — numerical result not independently verified',
    isOfflineFallback: true,
  };
}

/**
 * Quiz and Practice Database (Phase 16)
 */
export const PRACTICE_QUIZZES: QuizQuestion[] = [
  {
    id: 'quiz-1',
    topic: 'Arithmetic',
    difficulty: 'beginner',
    question: 'What is the correct value of 2 + 3 × 4 according to standard operator precedence (PEMDAS)?',
    options: ['20', '14', '24', '18'],
    correctOptionIndex: 1,
    explanation: 'Multiplication has higher precedence than addition: 3 × 4 = 12, then 2 + 12 = 14.',
    hints: ['Remember order of operations: Multiplication precedes Addition.'],
  },
  {
    id: 'quiz-2',
    topic: 'Algebra',
    difficulty: 'intermediate',
    question: 'What are the real roots of the quadratic equation x² + 5x + 6 = 0?',
    options: ['x = 2, 3', 'x = -2, -3', 'x = -1, -6', 'x = 1, 6'],
    correctOptionIndex: 1,
    explanation: 'Factor as (x + 2)(x + 3) = 0, giving roots x = -2 and x = -3.',
    hints: ['Find two numbers that multiply to 6 and add to 5, then invert the signs.'],
  },
  {
    id: 'quiz-3',
    topic: 'Trigonometry',
    difficulty: 'intermediate',
    question: 'In a right triangle with acute angle 30°, what is sin(30°)?',
    options: ['√3/2', '0.5', '1/√2', '1.0'],
    correctOptionIndex: 1,
    explanation: 'In a 30°-60°-90° special triangle, the side opposite 30° is half the hypotenuse: sin(30°) = 1/2 = 0.5.',
    hints: ['Consider an equilateral triangle cut in half.'],
  },
  {
    id: 'quiz-4',
    topic: 'Calculus',
    difficulty: 'advanced',
    question: 'What is the derivative with respect to x of f(x) = x³ - 4x² + 7?',
    options: ['3x² - 8x', '3x² - 8x + 7', 'x² - 8x', '3x³ - 8x²'],
    correctOptionIndex: 0,
    explanation: 'Using power rule d/dx[xⁿ] = n·xⁿ⁻¹: d/dx[x³] = 3x², d/dx[-4x²] = -8x, and constant 7 vanishes.',
    hints: ['Apply the power rule to each term independently.'],
  },
  {
    id: 'quiz-5',
    topic: 'Statistics',
    difficulty: 'intermediate',
    question: 'For the dataset [10, 20, 20, 30, 40], what is the mean and median?',
    options: ['Mean: 24, Median: 20', 'Mean: 25, Median: 20', 'Mean: 24, Median: 25', 'Mean: 20, Median: 20'],
    correctOptionIndex: 0,
    explanation: 'Sum = 120 / 5 = 24 (mean). Middle value when sorted is 20 (median).',
    hints: ['Sum all 5 numbers and divide by 5.'],
  },
  {
    id: 'quiz-6',
    topic: 'Finance',
    difficulty: 'beginner',
    question: 'If an item costs $850 and is discounted by 15%, what is the discount amount?',
    options: ['$127.50', '$85.00', '$142.50', '$105.00'],
    correctOptionIndex: 0,
    explanation: 'Discount = 850 × 0.15 = $127.50.',
    hints: ['Multiply 850 by 0.15.'],
  },
];
