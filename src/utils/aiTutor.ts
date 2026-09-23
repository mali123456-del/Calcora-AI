/**
 * AI Mathematical Tutor Mode 2.0 Engine & Types
 * Implements Socratic guidance, progressive 5-level hint system, deterministic step checking,
 * topic detection, mistake analysis, and practice problem generation.
 */

import { calculateExpression, formatResult, sanitizeNumber } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';
import { generateCalculationExplanation } from '../engine/stepExplainer';

export type TutorMode = 'assistant' | 'tutor' | 'solver-review';

export type LearningObjective =
  | 'concept'
  | 'practice'
  | 'formula'
  | 'check-work'
  | 'exam'
  | 'review-mistakes';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type MathTopic =
  | 'Arithmetic'
  | 'Algebra'
  | 'Geometry'
  | 'Trigonometry'
  | 'Calculus'
  | 'Statistics'
  | 'Probability'
  | 'Physics'
  | 'Engineering'
  | 'Linear Algebra'
  | 'Number Theory';

export type HintLevel = 1 | 2 | 3 | 4 | 5;

export type StepCheckStatus =
  | 'mathematically_equivalent'
  | 'partially_correct'
  | 'incorrect'
  | 'invalid_transformation'
  | 'missing_condition';

export interface StepCheckResult {
  status: StepCheckStatus;
  statusLabel: string;
  feedback: string;
  isEquivalent: boolean;
  suggestedNextStep?: string;
  identifiedIssue?: string;
  deterministicVerified: boolean;
}

export type MistakeCategory =
  | 'arithmetic_mistake'
  | 'sign_error'
  | 'algebraic_manipulation_error'
  | 'formula_selection_error'
  | 'unit_error'
  | 'domain_restriction'
  | 'assumption_error'
  | 'conceptual_misunderstanding';

export interface MistakeAnalysis {
  errorType: MistakeCategory;
  errorTypeLabel: string;
  whyItIsWrong: string;
  correctPrinciple: string;
  correction: string;
  preventionTip: string;
  rawMistake?: string;
}

export interface TutoringMistakeItem {
  id: string;
  originalProblem: string;
  userAnswerOrStep: string;
  correctResult: string;
  mistakeCategory: MistakeCategory;
  explanation: string;
  preventionTip: string;
  timestamp: number;
  topic: MathTopic;
  difficulty: DifficultyLevel;
}

export interface PracticeProblem {
  id: string;
  topic: MathTopic;
  difficulty: DifficultyLevel;
  difficultyTier: 'easy' | 'medium' | 'hard';
  question: string;
  expression?: string;
  correctAnswer: string;
  acceptableAnswers: string[];
  hints: [string, string, string, string, string]; // Exactly 5 progressive hint levels
  solutionSteps: string[];
  latexFormula?: string;
  explanation: string;
}

export interface PracticeSessionState {
  isActive: boolean;
  isExamMode: boolean;
  currentIndex: number;
  problems: PracticeProblem[];
  userAnswers: Record<number, string>;
  problemResults: Record<
    number,
    { isCorrect: boolean; attempts: number; hintsUsed: number; timeSpentSec: number }
  >;
  startTime: number;
  elapsedSeconds: number;
  isFinished: boolean;
  score: number;
  totalProblems: number;
}

// ---------------------------------------------------------------------------
// 1. Topic Detection
// ---------------------------------------------------------------------------

const TOPIC_KEYWORDS: Record<MathTopic, RegExp[]> = {
  Calculus: [
    /\b(derivative|integral|integrate|differentiate|limit|dx|dy\/dx|gradient|partial|taylor|series)\b/i,
    /∫|∂|∑|lim/,
    /\bd\/dx\b/i,
  ],
  Trigonometry: [
    /\b(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|hypotenuse|radian|degree|pythagor)\b/i,
    /π|theta|θ/,
  ],
  'Linear Algebra': [
    /\b(matrix|matrices|determinant|vector|eigenvalue|eigenvector|dot product|cross product|cramer|transpose)\b/i,
  ],
  Statistics: [
    /\b(mean|median|mode|variance|standard deviation|sample|z-score|normal distribution|quartile|percentile|regression)\b/i,
  ],
  Probability: [
    /\b(probability|permutation|combination|binomial|coin|dice|urn|factorial|odds)\b/i,
    /ncr|npr/i,
  ],
  Physics: [
    /\b(velocity|acceleration|kinetic energy|potential energy|gravity|force|newton|work|friction|momentum|wave)\b/i,
    /\b(joule|watt|kg|m\/s|pascal|pressure)\b/i,
  ],
  Engineering: [
    /\b(ohm|voltage|current|resistance|power|impedance|circuit|capacitance|inductance|shear|stress|strain)\b/i,
    /Ω|µf|mhz/i,
  ],
  Geometry: [
    /\b(area|perimeter|volume|radius|diameter|circle|triangle|sphere|cylinder|cone|polygon|angle)\b/i,
  ],
  'Number Theory': [
    /\b(prime|gcd|lcm|divisor|modulo|congruence|modular|composite|coprime|euler|fermat)\b/i,
    /%|mod\b/i,
  ],
  Algebra: [
    /\b(solve|equation|polynomial|quadratic|linear|factor|roots|system|inequality|variable)\b/i,
    /[a-zA-Z]\s*[\^=+\-*\/]/,
    /x\^2|y\^2/,
  ],
  Arithmetic: [
    /\b(add|subtract|multiply|divide|percentage|percent|fraction|ratio|proportion|decimal)\b/i,
    /^[0-9+\-*\/().\s%]+$/,
  ],
};

export function detectMathTopic(input?: string, expression?: string): MathTopic {
  const combined = `${input || ''} ${expression || ''}`.trim();
  if (!combined) return 'Algebra';

  // Check in priority order
  for (const topic of [
    'Calculus',
    'Linear Algebra',
    'Physics',
    'Engineering',
    'Probability',
    'Statistics',
    'Trigonometry',
    'Geometry',
    'Number Theory',
    'Algebra',
    'Arithmetic',
  ] as MathTopic[]) {
    const matchers = TOPIC_KEYWORDS[topic];
    if (matchers.some((re) => re.test(combined))) {
      return topic;
    }
  }

  // Pure digits and operators -> Arithmetic
  if (/^[\d+\-*\/().,\s%^]+$/.test(combined)) {
    return 'Arithmetic';
  }

  return 'Algebra';
}

// ---------------------------------------------------------------------------
// 2. Progressive Hint System (5 Progressive Levels)
// ---------------------------------------------------------------------------

export const HINT_LEVEL_DESCRIPTIONS: Record<HintLevel, { title: string; intent: string }> = {
  1: {
    title: 'Level 1: Conceptual Direction',
    intent: 'General mathematical principle and overarching strategy without giving away formulas.',
  },
  2: {
    title: 'Level 2: Formula & Theorem',
    intent: 'The specific mathematical formula, theorem, or identity needed.',
  },
  3: {
    title: 'Level 3: Variable Substitution',
    intent: 'How to substitute known quantities or isolate the active term.',
  },
  4: {
    title: 'Level 4: Next Complete Step',
    intent: 'The immediate algebraic reduction or intermediate calculation.',
  },
  5: {
    title: 'Level 5: Complete Solution & Proof',
    intent: 'The full step-by-step resolution and final verified answer.',
  },
};

export function generateProgressiveHints(
  problem: string,
  expression?: string,
  solutionSteps: string[] = [],
  finalAnswer?: string
): [string, string, string, string, string] {
  const target = (problem || expression || '').trim();

  // 1. Equation pattern (e.g. 2x + 5 = 17 or x^2 + 5x + 6 = 0)
  if (target.includes('=')) {
    const eq = target.replace(/solve/i, '').trim();
    const isQuadratic = /x\^2|x²/i.test(eq);

    if (isQuadratic) {
      return [
        'Identify that this is a second-degree polynomial (quadratic) equation. First, rearrange all terms onto one side so the equation equals zero: $ax^2 + bx + c = 0$.',
        'Use factoring if coefficients allow, or apply the standard Quadratic Formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$',
        'Identify your coefficients $a$, $b$, and $c$, then calculate the discriminant $\\Delta = b^2 - 4ac$ to check the number and nature of roots.',
        solutionSteps[0] || 'Compute $\\sqrt{b^2 - 4ac}$ and substitute back into the numerator: $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.',
        finalAnswer
          ? `Complete solution: ${finalAnswer}. ${solutionSteps.join(' → ')}`
          : 'Complete solution: solve both branches ($+$ and $-$) to obtain the two roots.',
      ];
    }

    return [
      'Focus on isolating the variable on one side of the equals sign using inverse arithmetic operations.',
      'Reverse standard order of operations (reverse PEMDAS): first undo addition/subtraction, then undo multiplication/division.',
      'Group all variable terms on the left and all constant numbers on the right side.',
      solutionSteps[0] || 'Perform the immediate algebraic inverse operation on both sides equally.',
      finalAnswer
        ? `Complete solution: ${finalAnswer}. ${solutionSteps.join(' → ')}`
        : 'Complete solution: divide by the coefficient of the variable to find the exact value.',
    ];
  }

  // 2. Percentage problem (e.g. 15% of 850)
  const pctMatch = target.match(/(\d+\.?\d*)\s*%\s*(?:of)?\s*(\d+\.?\d*)/i);
  if (pctMatch) {
    const p = pctMatch[1];
    const b = pctMatch[2];
    return [
      'A percentage represents parts per hundred. Think of "percent" as a fraction with a denominator of 100.',
      'The formula for the percentage of a value is: $$\\text{Result} = \\left(\\frac{P}{100}\\right) \\times B$$',
      `Convert ${p}% to a decimal fraction by dividing by 100: $${p} \\div 100 = ${parseFloat(p) / 100}$.`,
      `Multiply this decimal fraction by the base quantity: $${parseFloat(p) / 100} \\times ${b}$.`,
      `Complete solution: $${parseFloat(p) / 100} \\times ${b} = ${(parseFloat(p) / 100) * parseFloat(b)}$.`,
    ];
  }

  // 3. General mathematical expression
  return [
    'Observe the overall structure of the expression. Look for parentheses, exponents, and multiplication/division hierarchy.',
    'Apply standard operator precedence (PEMDAS / BODMAS): Parentheses $\\rightarrow$ Exponents $\\rightarrow$ Multiplication/Division (left-to-right) $\\rightarrow$ Addition/Subtraction (left-to-right).',
    'Simplify inside the innermost grouping symbols first or factor out common terms.',
    solutionSteps[0] || 'Evaluate the highest-precedence operation next.',
    finalAnswer
      ? `Complete solution: ${finalAnswer}. ${solutionSteps.join(' → ')}`
      : 'Complete solution: carry out the final addition or subtraction to reach the verified numerical result.',
  ];
}

// ---------------------------------------------------------------------------
// 3. Deterministic Step Checking Engine
// ---------------------------------------------------------------------------

/**
 * Checks a user's proposed mathematical step against an active problem or previous step.
 * Uses deterministic engine calculations and algebraic sanity checks.
 */
export function checkUserStep(
  problem: string,
  userStep: string,
  previousStep?: string
): StepCheckResult {
  const cleanStep = userStep.trim();
  const cleanProblem = problem.trim();

  if (!cleanStep) {
    return {
      status: 'incorrect',
      statusLabel: 'Empty Step',
      feedback: 'Please enter a mathematical expression or equation step to verify.',
      isEquivalent: false,
      deterministicVerified: true,
    };
  }

  // Check for illegal transformation: division by zero
  if (/\/0(?![.\d])/i.test(cleanStep) || /divide\s+by\s+0/i.test(cleanStep)) {
    return {
      status: 'invalid_transformation',
      statusLabel: 'Invalid Transformation: Division by Zero',
      feedback: 'Division by zero is undefined in mathematics. This step violates arithmetic axioms.',
      isEquivalent: false,
      identifiedIssue: 'Division by 0',
      suggestedNextStep: 'Check whether the denominator can be non-zero or factor prior to division.',
      deterministicVerified: true,
    };
  }

  // Check for missing condition: taking square root without ±
  // e.g., x^2 = 9 -> x = 3 without acknowledging x = -3
  if (/x\^2\s*=\s*(\d+)/i.test(cleanProblem) || /x²\s*=\s*(\d+)/i.test(cleanProblem)) {
    const numMatch = cleanProblem.match(/=\s*(\d+)/);
    if (numMatch) {
      const val = parseFloat(numMatch[1]);
      const sqrtVal = Math.sqrt(val);
      if (new RegExp(`^x\\s*=\\s*${sqrtVal}$`, 'i').test(cleanStep)) {
        return {
          status: 'missing_condition',
          statusLabel: 'Missing Condition: Dual Root (±)',
          feedback: `Good instinct ($${sqrtVal}^2 = ${val}$), but remember that squaring a negative also produces a positive: $(-${sqrtVal})^2 = ${val}$. The full solution must include $\\pm${sqrtVal}$.`,
          isEquivalent: false,
          suggestedNextStep: `Write $x = \\pm ${sqrtVal}$ to capture both real branches.`,
          identifiedIssue: 'Omission of negative root branch',
          deterministicVerified: true,
        };
      }
    }
  }

  // Check linear equation step progression: e.g. 2x + 5 = 17
  // User says: 2x = 12
  const linearMatch = cleanProblem.match(/(\d*)x\s*([+-])\s*(\d+)\s*=\s*(\d+)/i);
  if (linearMatch) {
    const a = linearMatch[1] ? parseFloat(linearMatch[1]) : 1;
    const sign = linearMatch[2];
    const b = parseFloat(linearMatch[3]);
    const c = parseFloat(linearMatch[4]);
    const correctNextRhs = sign === '+' ? c - b : c + b;
    const signFlipRhs = sign === '+' ? c + b : c - b;

    // Check if user correctly subtracted/added: e.g. 2x = 12
    const stepMatch = cleanStep.match(/(\d*)x\s*=\s*(-?\d+\.?\d*)/i);
    if (stepMatch) {
      const stepA = stepMatch[1] ? parseFloat(stepMatch[1]) : 1;
      const stepVal = parseFloat(stepMatch[2]);

      if (stepA === a && Math.abs(stepVal - correctNextRhs) < 1e-6) {
        return {
          status: 'mathematically_equivalent',
          statusLabel: 'Mathematically Equivalent (Correct Step)',
          feedback: `Excellent! You correctly applied the inverse operation (${sign === '+' ? 'subtracted' : 'added'} ${b} on both sides), isolating the variable term: $${a !== 1 ? a : ''}x = ${correctNextRhs}$.`,
          isEquivalent: true,
          suggestedNextStep: a !== 1 ? `Now divide both sides by ${a} to solve for $x$.` : `The equation is solved: $x = ${correctNextRhs}$.`,
          deterministicVerified: true,
        };
      }

      // Check if user made a sign error
      if (stepA === a && Math.abs(stepVal - signFlipRhs) < 1e-6) {
        return {
          status: 'incorrect',
          statusLabel: 'Sign Error in Transformation',
          feedback: `Watch the signs! Since the original equation had $${sign} ${b}$, you must ${sign === '+' ? 'subtract' : 'add'} ${b} from ${c}, which gives $${correctNextRhs}$, not $${signFlipRhs}$.`,
          isEquivalent: false,
          suggestedNextStep: `Compute $${c} ${sign === '+' ? '-' : '+'} ${b} = ${correctNextRhs}$ instead.`,
          identifiedIssue: 'Inverse operation sign error',
          deterministicVerified: true,
        };
      }

      // Final step: x = solution
      const finalX = correctNextRhs / a;
      if (stepA === 1 && Math.abs(stepVal - finalX) < 1e-6) {
        return {
          status: 'mathematically_equivalent',
          statusLabel: 'Fully Solved & Correct',
          feedback: `Verified! $x = ${finalX}$ is the exact mathematical solution. Substituting back: $${a}(${finalX}) ${sign} ${b} = ${c}$.`,
          isEquivalent: true,
          deterministicVerified: true,
        };
      }
    }
  }

  // Pure arithmetic check (e.g. problem = "2 + 3 * 4", userStep = "2 + 12")
  try {
    const calcProblem = calculateExpression(cleanProblem);
    const calcStep = calculateExpression(cleanStep);

    if (
      !calcProblem.error &&
      !calcStep.error &&
      Number.isFinite(calcProblem.value) &&
      Number.isFinite(calcStep.value)
    ) {
      if (Math.abs(calcProblem.value - calcStep.value) < 1e-9) {
        return {
          status: 'mathematically_equivalent',
          statusLabel: 'Mathematically Equivalent',
          feedback: `Correct reduction! Both the original expression and your step evaluate to ${calcStep.display}. You correctly observed operator precedence.`,
          isEquivalent: true,
          suggestedNextStep: `Finalize remaining operations to reach ${calcStep.display}.`,
          deterministicVerified: true,
        };
      } else {
        return {
          status: 'incorrect',
          statusLabel: 'Arithmetic Inconsistency',
          feedback: `This transformation alters the value. Your step evaluates to ${calcStep.display}, whereas the target expression evaluates to ${calcProblem.display}.`,
          isEquivalent: false,
          suggestedNextStep: 'Check operator precedence (multiplication/division before addition/subtraction).',
          identifiedIssue: 'Order of operations / arithmetic discrepancy',
          deterministicVerified: true,
        };
      }
    }
  } catch {
    // Non-arithmetic fallback
  }

  // Fallback for symbolic steps
  return {
    status: 'partially_correct',
    statusLabel: 'Plausible Transformation',
    feedback: `Your step "${cleanStep}" appears to follow standard algebraic form. Verify that every term on the left underwent the identical transformation on the right.`,
    isEquivalent: true,
    suggestedNextStep: 'Continue simplifying towards isolating the principal term.',
    deterministicVerified: false,
  };
}

// ---------------------------------------------------------------------------
// 4. Structured Mistake Analysis
// ---------------------------------------------------------------------------

export function analyzeMistake(
  problem: string,
  userAttempt: string,
  expectedAnswer?: string
): MistakeAnalysis {
  const p = problem.toLowerCase();
  const u = userAttempt.toLowerCase().trim();

  // 1. Sign Error detection
  if (
    u.includes('-') &&
    expectedAnswer &&
    !expectedAnswer.includes('-') &&
    u.replace(/-/g, '').trim() === expectedAnswer.replace(/-/g, '').trim()
  ) {
    return {
      errorType: 'sign_error',
      errorTypeLabel: 'Sign Inversion Error',
      whyItIsWrong: `The magnitude (${expectedAnswer.replace('-', '')}) was correct, but the sign was inverted due to an unintended negation or misapplied negative multiplication.`,
      correctPrinciple: 'Multiplying or dividing two negative numbers yields a positive; subtracting a negative equals adding.',
      correction: `Change the sign from ${userAttempt} to ${expectedAnswer}.`,
      preventionTip: 'Track parentheses around negative terms and write out sign cancellations explicitly.',
      rawMistake: userAttempt,
    };
  }

  // 2. Order of operations / PEMDAS slip (e.g. 2 + 3 * 4 = 20 instead of 14)
  if (p.includes('+') && p.includes('*') && u === '20') {
    return {
      errorType: 'arithmetic_mistake',
      errorTypeLabel: 'Order of Operations (PEMDAS) Mistake',
      whyItIsWrong: 'Addition was performed before multiplication (2 + 3 = 5, then 5 * 4 = 20). Standard mathematical convention gives multiplication higher precedence.',
      correctPrinciple: 'Multiplication and Division must be computed before Addition and Subtraction: $3 \\times 4 = 12$, then $2 + 12 = 14$.',
      correction: 'Evaluate $3 \\times 4 = 12$ first, then add $2$ to obtain $14$.',
      preventionTip: 'Underline or enclose high-precedence multiplication groups: $2 + (3 \\times 4)$.',
      rawMistake: userAttempt,
    };
  }

  // 3. Domain restriction (e.g. division by 0, sqrt of negative, log of <= 0)
  if (u.includes('divide by 0') || u.includes('/0') || p.includes('1/x') || p.includes('sqrt(-')) {
    return {
      errorType: 'domain_restriction',
      errorTypeLabel: 'Domain Restriction Violation',
      whyItIsWrong: 'The operation falls outside the valid domain of real numbers (e.g. dividing by zero or taking the square root of a negative without complex numbers).',
      correctPrinciple: 'Expressions of the form $f(x)/g(x)$ are strictly undefined when $g(x) = 0$. Square roots $\\sqrt{x}$ require $x \\ge 0$ in the real domain.',
      correction: 'State the domain constraint $x \\neq 0$ or restrict the solution interval.',
      preventionTip: 'Identify domain boundaries before manipulating algebraic denominators or roots.',
      rawMistake: userAttempt,
    };
  }

  // 4. Missing ± condition in quadratic roots
  if ((p.includes('x^2') || p.includes('x²')) && expectedAnswer?.includes('±')) {
    return {
      errorType: 'algebraic_manipulation_error',
      errorTypeLabel: 'Omission of Dual Roots (±)',
      whyItIsWrong: 'Taking the square root of both sides yields both a positive and negative root ($x^2 = k \\implies x = \\pm \\sqrt{k}$), but only the positive branch was recorded.',
      correctPrinciple: 'Every non-zero real number squared is positive, so both $(+k)^2$ and $(-k)^2$ satisfy the equation.',
      correction: `State both roots: ${expectedAnswer}.`,
      preventionTip: 'Whenever taking $\\sqrt{\\dots}$ of both sides of an equation, write $\\pm$ immediately.',
      rawMistake: userAttempt,
    };
  }

  // General fallback
  return {
    errorType: 'conceptual_misunderstanding',
    errorTypeLabel: 'Algebraic Derivation Discrepancy',
    whyItIsWrong: `The result "${userAttempt}" diverged from the mathematically verified result "${expectedAnswer || 'expected value'}".`,
    correctPrinciple: 'Algebraic operations must preserve equality across both sides of the equation simultaneously.',
    correction: expectedAnswer ? `The correct value is ${expectedAnswer}.` : 'Re-evaluate with verified steps.',
    preventionTip: 'Substitute your final answer back into the original problem to verify both sides equal.',
    rawMistake: userAttempt,
  };
}

// ---------------------------------------------------------------------------
// 5. Curated Practice Problem Generator (Deterministic Verification)
// ---------------------------------------------------------------------------

const PRACTICE_BANK: Record<MathTopic, PracticeProblem[]> = {
  Arithmetic: [
    {
      id: 'p-arith-1',
      topic: 'Arithmetic',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'Calculate $15\\%$ of $850$.',
      expression: '15 * 850 / 100',
      correctAnswer: '127.5',
      acceptableAnswers: ['127.5', '127.50', '255/2'],
      hints: [
        'Recall that "percent" means per hundred ($15\\% = \\frac{15}{100}$).',
        'Formula: $\\text{Percentage} = \\frac{P}{100} \\times B$.',
        'Convert $15\\%$ to $0.15$.',
        'Compute $0.15 \\times 850$.',
        'Complete solution: $15 \\times 8.5 = 127.5$.',
      ],
      solutionSteps: [
        '$15\\% = \\frac{15}{100} = 0.15$',
        '$0.15 \\times 850 = 127.5$',
      ],
      latexFormula: '\\text{Value} = \\left(\\frac{P}{100}\\right) \\times B',
      explanation: 'Multiply the base value 850 by the decimal representation 0.15 to obtain 127.5.',
    },
    {
      id: 'p-arith-2',
      topic: 'Arithmetic',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Evaluate the expression: $24 - 4 \\times (3 + 2) + 18 \\div 3$.',
      expression: '24 - 4 * (3 + 2) + 18 / 3',
      correctAnswer: '10',
      acceptableAnswers: ['10'],
      hints: [
        'Apply the standard order of operations: Parentheses first.',
        'Evaluate $(3 + 2) = 5$.',
        'Next, perform multiplication and division left to right: $4 \\times 5 = 20$ and $18 \\div 3 = 6$.',
        'Substitute into expression: $24 - 20 + 6$.',
        'Complete solution: $4 + 6 = 10$.',
      ],
      solutionSteps: [
        'Parentheses: $3 + 2 = 5$',
        'Multiplication: $4 \\times 5 = 20$',
        'Division: $18 \\div 3 = 6$',
        'Addition & Subtraction: $24 - 20 + 6 = 10$',
      ],
      latexFormula: '\\text{PEMDAS / BODMAS Order of Precedence}',
      explanation: 'Evaluate parentheses first, then multiplication and division, then addition and subtraction.',
    },
    {
      id: 'p-arith-3',
      topic: 'Arithmetic',
      difficulty: 'advanced',
      difficultyTier: 'hard',
      question: 'Simplify the compound fraction: $\\frac{\\frac{3}{4} + \\frac{2}{5}}{\\frac{7}{10} - \\frac{1}{6}}$.',
      expression: '(3/4 + 2/5) / (7/10 - 1/6)',
      correctAnswer: '69/32',
      acceptableAnswers: ['69/32', '2.15625'],
      hints: [
        'Simplify numerator and denominator separately using common denominators.',
        'Common denominator for numerator is $20$: $\\frac{15}{20} + \\frac{8}{20} = \\frac{23}{20}$.',
        'Common denominator for denominator is $30$: $\\frac{21}{30} - \\frac{5}{30} = \\frac{16}{30} = \\frac{8}{15}$.',
        'Divide fractions by multiplying by reciprocal: $\\frac{23}{20} \\times \\frac{15}{8}$.',
        'Complete solution: $\\frac{23 \\times 3}{4 \\times 8} = \\frac{69}{32} = 2.15625$.',
      ],
      solutionSteps: [
        'Numerator: $\\frac{15 + 8}{20} = \\frac{23}{20}$',
        'Denominator: $\\frac{21 - 5}{30} = \\frac{16}{30} = \\frac{8}{15}$',
        'Quotient: $\\frac{23}{20} \\times \\frac{15}{8} = \\frac{69}{32}$',
      ],
      latexFormula: '\\frac{a/b}{c/d} = \\frac{a}{b} \\times \\frac{d}{c}',
      explanation: 'Reduce both terms to single fractions, then multiply by the reciprocal of the denominator.',
    },
  ],
  Algebra: [
    {
      id: 'p-alg-1',
      topic: 'Algebra',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'Solve the linear equation for $x$: $3x + 7 = 22$.',
      expression: '(22 - 7) / 3',
      correctAnswer: '5',
      acceptableAnswers: ['5', 'x=5', 'x = 5'],
      hints: [
        'Isolate the variable term $3x$ by subtracting the constant from both sides.',
        'Subtract $7$ from both sides: $3x = 22 - 7$.',
        'Simplify the right-hand side: $3x = 15$.',
        'Divide both sides by $3$: $x = \\frac{15}{3}$.',
        'Complete solution: $x = 5$.',
      ],
      solutionSteps: [
        'Subtract 7: $3x = 15$',
        'Divide by 3: $x = 5$',
      ],
      latexFormula: 'ax + b = c \\implies x = \\frac{c - b}{a}',
      explanation: 'Subtract the constant 7 from both sides to get 3x = 15, then divide by 3 to find x = 5.',
    },
    {
      id: 'p-alg-2',
      topic: 'Algebra',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Find the real roots of the quadratic equation: $x^2 - 5x + 6 = 0$.',
      expression: 'x^2 - 5x + 6 = 0',
      correctAnswer: '2, 3',
      acceptableAnswers: ['2, 3', '2,3', 'x=2, 3', 'x=2, x=3', '3, 2', '3,2'],
      hints: [
        'Look for two numbers that multiply to $+6$ and add up to $-5$.',
        'Factor form: $(x - p)(x - q) = 0$.',
        'Notice $(-2) \\times (-3) = 6$ and $(-2) + (-3) = -5$.',
        'Write as $(x - 2)(x - 3) = 0$.',
        'Complete solution: $x = 2$ or $x = 3$.',
      ],
      solutionSteps: [
        'Factor: $(x - 2)(x - 3) = 0$',
        'Set each factor to zero: $x - 2 = 0 \\implies x = 2$',
        '$x - 3 = 0 \\implies x = 3$',
      ],
      latexFormula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      explanation: 'Factoring gives (x - 2)(x - 3) = 0, producing roots x = 2 and x = 3.',
    },
    {
      id: 'p-alg-3',
      topic: 'Algebra',
      difficulty: 'advanced',
      difficultyTier: 'hard',
      question: 'Solve the system of equations for $(x, y)$:\n$2x + 3y = 13$ and $x - y = -1$.',
      expression: '2x + 3y = 13, x - y = -1',
      correctAnswer: 'x=2, y=3',
      acceptableAnswers: ['x=2, y=3', 'x=2,y=3', '(2, 3)', '(2,3)', '2, 3', '2,3'],
      hints: [
        'Use substitution or elimination. The second equation expresses $x$ easily in terms of $y$.',
        'From equation 2: $x = y - 1$.',
        'Substitute into equation 1: $2(y - 1) + 3y = 13$.',
        'Expand and combine: $2y - 2 + 3y = 13 \\implies 5y = 15 \\implies y = 3$.',
        'Complete solution: substitute $y = 3$ back to get $x = 3 - 1 = 2$. Solution: $(2, 3)$.',
      ],
      solutionSteps: [
        'Express $x$: $x = y - 1$',
        'Substitute: $2(y - 1) + 3y = 13 \\implies 5y = 15 \\implies y = 3$',
        'Find $x$: $x = 3 - 1 = 2$',
      ],
      latexFormula: '\\text{Cramer\'s Rule or Substitution Method}',
      explanation: 'Substitute x = y - 1 into 2x + 3y = 13 to find y = 3, then x = 2.',
    },
  ],
  Trigonometry: [
    {
      id: 'p-trig-1',
      topic: 'Trigonometry',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'What is the exact value of $\\sin(30^\\circ)$?',
      expression: 'sin(30 deg)',
      correctAnswer: '0.5',
      acceptableAnswers: ['0.5', '1/2'],
      hints: [
        'Consider a $30^\\circ-60^\\circ-90^\\circ$ special right triangle.',
        'Definition: $\\sin(\\theta) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}$.',
        'In an equilateral triangle with sides of length 2 cut in half, the opposite side to $30^\\circ$ has length 1.',
        'The hypotenuse has length 2.',
        'Complete solution: $\\sin(30^\\circ) = \\frac{1}{2} = 0.5$.',
      ],
      solutionSteps: [
        'Use standard 30-60-90 triangle ratios (1 : $\\sqrt{3}$ : 2)',
        'Opposite / Hypotenuse = 1 / 2 = 0.5',
      ],
      latexFormula: '\\sin(30^\\circ) = \\frac{1}{2}',
      explanation: 'By standard 30-60-90 special right triangle definition, sin(30°) = 1/2.',
    },
    {
      id: 'p-trig-2',
      topic: 'Trigonometry',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Using the Pythagorean identity, if $\\cos(\\theta) = \\frac{3}{5}$ and $\\theta$ is in Quadrant I, find $\\sin(\\theta)$.',
      expression: 'sqrt(1 - (3/5)^2)',
      correctAnswer: '4/5',
      acceptableAnswers: ['4/5', '0.8'],
      hints: [
        'Recall the fundamental Pythagorean identity connecting sine and cosine.',
        'Identity: $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$.',
        'Substitute $\\cos(\\theta) = \\frac{3}{5}$: $\\sin^2(\\theta) + \\left(\\frac{3}{5}\\right)^2 = 1$.',
        'Compute: $\\sin^2(\\theta) = 1 - \\frac{9}{25} = \\frac{16}{25}$.',
        'Complete solution: Since $\\theta$ is in Quadrant I, take the positive square root: $\\sin(\\theta) = \\frac{4}{5} = 0.8$.',
      ],
      solutionSteps: [
        '$\\sin^2(\\theta) = 1 - \\cos^2(\\theta)$',
        '$\\sin^2(\\theta) = 1 - \\frac{9}{25} = \\frac{16}{25}$',
        '$\\sin(\\theta) = \\sqrt{\\frac{16}{25}} = \\frac{4}{5}$',
      ],
      latexFormula: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
      explanation: 'Use the Pythagorean identity sin^2(θ) + cos^2(θ) = 1 to find sin(θ) = 4/5.',
    },
  ],
  Calculus: [
    {
      id: 'p-calc-1',
      topic: 'Calculus',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Find the derivative with respect to $x$ of $f(x) = 3x^4 - 5x^2 + 7$.',
      expression: 'd/dx (3x^4 - 5x^2 + 7)',
      correctAnswer: '12x^3 - 10x',
      acceptableAnswers: ['12x^3 - 10x', '12x³ - 10x', '12*x^3 - 10*x'],
      hints: [
        'Use the Power Rule for derivatives term by term.',
        'Power Rule: $\\frac{d}{dx}[x^n] = n x^{n-1}$.',
        'Differentiate $3x^4$: $3 \\times 4 x^3 = 12x^3$.',
        'Differentiate $-5x^2$: $-5 \\times 2 x^1 = -10x$, and the constant 7 drops to 0.',
        'Complete solution: $f\'(x) = 12x^3 - 10x$.',
      ],
      solutionSteps: [
        '$\\frac{d}{dx}[3x^4] = 12x^3$',
        '$\\frac{d}{dx}[-5x^2] = -10x$',
        '$\\frac{d}{dx}[7] = 0$',
        'Sum: $12x^3 - 10x$',
      ],
      latexFormula: '\\frac{d}{dx}[x^n] = n x^{n-1}',
      explanation: 'Apply the power rule term by term to obtain 12x^3 - 10x.',
    },
    {
      id: 'p-calc-2',
      topic: 'Calculus',
      difficulty: 'advanced',
      difficultyTier: 'hard',
      question: 'Evaluate the definite integral: $\\int_{0}^{3} (2x + 1)\\,dx$.',
      expression: 'integrate 2x + 1 from 0 to 3',
      correctAnswer: '12',
      acceptableAnswers: ['12'],
      hints: [
        'Find the antiderivative (indefinite integral) first using the reverse power rule.',
        'Antiderivative: $\\int (2x + 1)\\,dx = x^2 + x + C$.',
        'Apply the Fundamental Theorem of Calculus: $\\left[ x^2 + x \\right]_{0}^{3}$.',
        'Evaluate at upper bound $x = 3$: $3^2 + 3 = 9 + 3 = 12$.',
        'Complete solution: subtract evaluation at $x = 0$ ($0 + 0 = 0$): $12 - 0 = 12$.',
      ],
      solutionSteps: [
        'Antiderivative: $F(x) = x^2 + x$',
        '$F(3) = 3^2 + 3 = 12$',
        '$F(0) = 0$',
        'Integral: $F(3) - F(0) = 12$',
      ],
      latexFormula: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)',
      explanation: 'Integrate term by term to get x^2 + x, then evaluate between 0 and 3 to yield 12.',
    },
  ],
  Statistics: [
    {
      id: 'p-stat-1',
      topic: 'Statistics',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'Find the arithmetic mean of the dataset: $[10, 15, 20, 25, 30]$.',
      expression: '(10 + 15 + 20 + 25 + 30) / 5',
      correctAnswer: '20',
      acceptableAnswers: ['20'],
      hints: [
        'The mean is the sum of all elements divided by the count of elements.',
        'Formula: $\\bar{x} = \\frac{\\sum x_i}{N}$.',
        'Sum: $10 + 15 + 20 + 25 + 30 = 100$.',
        'Count: $N = 5$.',
        'Complete solution: $\\frac{100}{5} = 20$.',
      ],
      solutionSteps: [
        'Sum: $100$',
        'Count: $5$',
        'Mean: $100 / 5 = 20$',
      ],
      latexFormula: '\\bar{x} = \\frac{1}{N}\\sum_{i=1}^{N} x_i',
      explanation: 'Sum the 5 values to get 100, then divide by 5 to obtain 20.',
    },
  ],
  Probability: [
    {
      id: 'p-prob-1',
      topic: 'Probability',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Calculate the number of combinations: $\\binom{6}{2} = C(6, 2)$.',
      expression: '6! / (2! * 4!)',
      correctAnswer: '15',
      acceptableAnswers: ['15'],
      hints: [
        'Combinations count selections where order does NOT matter.',
        'Formula: $\\binom{n}{r} = \\frac{n!}{r!(n - r)!}$.',
        'Substitute $n = 6, r = 2$: $\\frac{6!}{2! \\times 4!}$.',
        'Cancel $4!$: $\\frac{6 \\times 5}{2 \\times 1} = \\frac{30}{2}$.',
        'Complete solution: $\\binom{6}{2} = 15$.',
      ],
      solutionSteps: [
        'Formula: $\\frac{6 \\times 5}{2 \\times 1}$',
        'Compute: $30 / 2 = 15$',
      ],
      latexFormula: '\\binom{n}{r} = \\frac{n!}{r!(n - r)!}',
      explanation: 'Evaluate C(6, 2) = (6 * 5) / (2 * 1) = 15.',
    },
  ],
  Physics: [
    {
      id: 'p-phys-1',
      topic: 'Physics',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'A vehicle of mass $1200\\text{ kg}$ accelerates at $2.5\\text{ m/s}^2$. What is the net force acting on it in Newtons?',
      expression: '1200 * 2.5',
      correctAnswer: '3000',
      acceptableAnswers: ['3000', '3000 N', '3000N'],
      hints: [
        'Use Newton\'s Second Law of Motion relating force, mass, and acceleration.',
        'Formula: $F = m \\times a$.',
        'Identify values: $m = 1200\\text{ kg}$, $a = 2.5\\text{ m/s}^2$.',
        'Compute: $1200 \\times 2.5$.',
        'Complete solution: $F = 3000\\text{ N}$.',
      ],
      solutionSteps: [
        'Identify: $m = 1200\\text{ kg}, a = 2.5\\text{ m/s}^2$',
        'Multiply: $F = 1200 \\times 2.5 = 3000\\text{ N}$',
      ],
      latexFormula: 'F = m \\cdot a',
      explanation: 'Multiply mass 1200 kg by acceleration 2.5 m/s^2 to get 3000 N.',
    },
  ],
  Engineering: [
    {
      id: 'p-eng-1',
      topic: 'Engineering',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'A resistor of $240\\,\\Omega$ has a potential difference of $12\\text{ V}$ across it. Calculate the current in Amperes.',
      expression: '12 / 240',
      correctAnswer: '0.05',
      acceptableAnswers: ['0.05', '0.05 A', '50 mA'],
      hints: [
        'Apply Ohm\'s Law relating voltage, current, and resistance.',
        'Formula: $V = I \\times R \\implies I = \\frac{V}{R}$.',
        'Substitute: $V = 12\\text{ V}$, $R = 240\\,\\Omega$.',
        'Compute: $\\frac{12}{240} = \\frac{1}{20}$.',
        'Complete solution: $I = 0.05\\text{ A}$ ($50\\text{ mA}$).',
      ],
      solutionSteps: [
        'Formula: $I = V / R$',
        'Substitute: $I = 12 / 240 = 0.05\\text{ A}$',
      ],
      latexFormula: 'I = \\frac{V}{R}',
      explanation: 'Divide voltage 12 V by resistance 240 ohms to get 0.05 A.',
    },
  ],
  Geometry: [
    {
      id: 'p-geom-1',
      topic: 'Geometry',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'Find the area of a right triangle with base $8\\text{ cm}$ and height $6\\text{ cm}$.',
      expression: '0.5 * 8 * 6',
      correctAnswer: '24',
      acceptableAnswers: ['24', '24 cm^2', '24 cm²'],
      hints: [
        'Recall the area formula for any planar triangle.',
        'Formula: $A = \\frac{1}{2} \\times b \\times h$.',
        'Substitute: $b = 8, h = 6$.',
        'Compute: $\\frac{1}{2} \\times 48$.',
        'Complete solution: $A = 24\\text{ cm}^2$.',
      ],
      solutionSteps: [
        'Formula: $A = \\frac{1}{2} b h$',
        'Compute: $0.5 \\times 8 \\times 6 = 24$',
      ],
      latexFormula: 'A = \\frac{1}{2} b h',
      explanation: 'Multiply 0.5 * 8 * 6 to obtain 24 cm^2.',
    },
  ],
  'Linear Algebra': [
    {
      id: 'p-linalg-1',
      topic: 'Linear Algebra',
      difficulty: 'intermediate',
      difficultyTier: 'medium',
      question: 'Calculate the determinant of the $2 \\times 2$ matrix: $\\begin{pmatrix} 4 & 2 \\\\ 1 & 3 \\end{pmatrix}$.',
      expression: '4 * 3 - 2 * 1',
      correctAnswer: '10',
      acceptableAnswers: ['10'],
      hints: [
        'Recall the standard formula for the determinant of a $2 \\times 2$ matrix.',
        'Formula: $\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$.',
        'Substitute: $a=4, b=2, c=1, d=3$.',
        'Compute diagonal product: $4 \\times 3 = 12$, and off-diagonal product: $2 \\times 1 = 2$.',
        'Complete solution: $12 - 2 = 10$.',
      ],
      solutionSteps: [
        'Formula: $ad - bc$',
        '$(4 \\times 3) - (2 \\times 1) = 12 - 2 = 10$',
      ],
      latexFormula: '\\det(A) = ad - bc',
      explanation: 'Compute main diagonal minus anti-diagonal: 4*3 - 2*1 = 10.',
    },
  ],
  'Number Theory': [
    {
      id: 'p-num-1',
      topic: 'Number Theory',
      difficulty: 'beginner',
      difficultyTier: 'easy',
      question: 'Find the Greatest Common Divisor (GCD) of $48$ and $18$.',
      expression: 'gcd(48, 18)',
      correctAnswer: '6',
      acceptableAnswers: ['6'],
      hints: [
        'Use prime factorization or the Euclidean algorithm.',
        'Prime factors: $48 = 2^4 \\times 3$, $18 = 2 \\times 3^2$.',
        'Take the lowest power of each common prime factor.',
        'Common factors: $2^1 \\times 3^1 = 6$.',
        'Complete solution: $\\gcd(48, 18) = 6$.',
      ],
      solutionSteps: [
        '$48 = 2^4 \\times 3$',
        '$18 = 2 \\times 3^2$',
        'GCD = $2^1 \\times 3^1 = 6$',
      ],
      latexFormula: '\\gcd(a, b) = \\gcd(b, a \\pmod b)',
      explanation: 'The greatest common divisor of 48 and 18 is 6.',
    },
  ],
};

export function generatePracticeProblems(
  topic: MathTopic = 'Algebra',
  difficulty: DifficultyLevel = 'intermediate',
  count: number = 3
): PracticeProblem[] {
  const bank = PRACTICE_BANK[topic] || PRACTICE_BANK['Algebra'];
  // Prefer questions matching difficulty
  const matched = bank.filter((p) => p.difficulty === difficulty);
  const pool = matched.length > 0 ? matched : bank;

  // Duplicate or slice to requested count
  const results: PracticeProblem[] = [];
  for (let i = 0; i < count; i++) {
    const item = pool[i % pool.length];
    results.push({
      ...item,
      id: `${item.id}-${i + 1}-${Date.now()}`,
    });
  }
  return results;
}

export function evaluatePracticeAnswer(
  problem: PracticeProblem,
  userAnswer: string
): { isCorrect: boolean; feedback: string } {
  const normUser = userAnswer.trim().toLowerCase().replace(/\s+/g, '');
  const normCorrect = problem.correctAnswer.trim().toLowerCase().replace(/\s+/g, '');

  // Exact or accepted list match
  const matchesAcceptable = problem.acceptableAnswers.some(
    (ans) => ans.trim().toLowerCase().replace(/\s+/g, '') === normUser
  );

  if (normUser === normCorrect || matchesAcceptable) {
    return {
      isCorrect: true,
      feedback: `Correct! ${problem.explanation}`,
    };
  }

  // Floating point numerical tolerance check
  const numUser = parseFloat(normUser);
  const numCorrect = parseFloat(normCorrect);
  if (!isNaN(numUser) && !isNaN(numCorrect)) {
    if (Math.abs(numUser - numCorrect) < 1e-4) {
      return {
        isCorrect: true,
        feedback: `Correct within numerical precision! Value: ${problem.correctAnswer}.`,
      };
    }
  }

  return {
    isCorrect: false,
    feedback: `Not quite. Expected "${problem.correctAnswer}". Check the hints if you need guidance.`,
  };
}
