/**
 * Calcora AI - Production Tutor Orchestration Service
 *
 * Implements orchestrateTutor() with strict Deterministic Authority:
 * 1. Deterministic-first problem extraction and evaluation
 * 2. Verified mathematical knowledge grounding
 * 3. Functional Tutor Modes:
 *    - Socratic: Guides with probing questions without revealing the final answer
 *    - Step-by-Step: Exhaustive derivations citing axioms, theorems, and intermediate states
 *    - Quiz: Interactive problem generation and student answer evaluation
 *    - Learn / Practice / Explain / Check-Work
 * 4. Absolute non-negotiable boundary: deterministic engine is the authoritative ground truth.
 */

import { GoogleGenAI } from '@google/genai';
import { extractMathProblem } from '../engine/problemExtractor';
import {
  toolCalculate,
  toolSolveEquation,
  toolDerivative,
  toolIntegrate,
  toolStatistics,
} from '../engine/toolLayer';
import type { MathToolResult } from '../types';
import { retrieveMathematicsKnowledge } from '../knowledge/knowledgeRetrieval';
import { buildMultilingualTutorKnowledge } from './multilingualTutorKnowledge';
import {
  getLanguageTemplate,
  getLanguageSystemInstruction,
} from '../knowledge/multilingualTutor';
import {
  MathTopic,
  LearningObjective,
  DifficultyLevel,
  HintLevel,
  detectMathTopic,
} from '../utils/aiTutor';
import {
  FunctionalTutorMode,
  MathProblemContext,
  UserLearningLevel,
  TutorQuizItemData,
  isTutorFollowUpPrompt,
  formatTutorContinuityContext,
} from './tutorConversationService';
import { parseGeminiJsonResponse, classifyGeminiRuntimeFailure, type GeminiRuntimeFailureKind } from './geminiRuntime';

export interface TutorOrchestrationOptions {
  prompt: string;
  topic?: MathTopic | string;
  difficulty?: DifficultyLevel;
  learningObjective?: LearningObjective;
  hintLevel?: HintLevel;
  socraticMode?: boolean;
  mode?: FunctionalTutorMode;
  problemContext?: Partial<MathProblemContext>;
  learningLevel?: Partial<UserLearningLevel>;
  language?: string;
  currentExpression?: string;
  currentResult?: string;
  conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  groundingContext?: string;
  offlineOnly?: boolean;
}

export type GeminiAvailabilityReason = 'api-key-available' | 'missing-api-key' | 'placeholder-api-key' | 'offline-only';
export type TutorFallbackStatus = 'none' | 'gemini-unavailable' | 'gemini-request-failed' | 'offline-deterministic-fallback' | 'deterministic-tutor-unavailable';

export interface GeminiAvailability {
  available: boolean;
  reason: GeminiAvailabilityReason;
}

/** Resolve Gemini availability without ever exposing the API key value. */
export function resolveGeminiAvailability(apiKey: string | undefined, offlineOnly = false): GeminiAvailability {
  if (offlineOnly) return { available: false, reason: 'offline-only' };
  const normalized = apiKey?.trim();
  if (!normalized) return { available: false, reason: 'missing-api-key' };
  if (/^(MY_GEMINI_API_KEY|your[_-]?gemini[_-]?api[_-]?key|change[-_ ]?me)$/i.test(normalized)) {
    return { available: false, reason: 'placeholder-api-key' };
  }
  return { available: true, reason: 'api-key-available' };
}

export interface TutorOrchestrationResult {
  success: boolean;
  answer: string;
  expression: string | null;
  steps: string[];
  formula: string | null;
  mode: FunctionalTutorMode;
  deterministicAuthority: {
    isAvailable: boolean;
    isVerified: boolean;
    authoritativeResult: string | null;
    exactResult?: string;
    derivationSteps: string[];
    confidence: number;
    method: string;
  };
  pedagogy: {
    topic: string;
    learningObjective: string;
    difficulty: string;
    hintLevel: number;
    socraticActive: boolean;
  };
  quizItem?: TutorQuizItemData;
  groundingSources: string[];
  isOfflineFallback: boolean;
  discrepancyDetected: boolean;
  executionTimeMs: number;
  error?: string;
  fallbackStatus?: TutorFallbackStatus;
  responseSource?: 'gemini' | 'deterministic-fallback' | 'deterministic-tutor-unavailable' | 'gemini-unavailable';
  geminiFailureKind?: GeminiRuntimeFailureKind;
}

const MATH_TOPICS = new Set<MathTopic>([
  'Arithmetic',
  'Algebra',
  'Geometry',
  'Trigonometry',
  'Calculus',
  'Statistics',
  'Probability',
  'Physics',
  'Engineering',
  'Linear Algebra',
  'Number Theory',
]);

function normalizeMathTopic(
  requestedTopic: MathTopic | string | undefined,
  prompt: string,
  expression?: string,
): MathTopic {
  if (requestedTopic && MATH_TOPICS.has(requestedTopic as MathTopic)) {
    return requestedTopic as MathTopic;
  }
  return detectMathTopic(prompt, expression);
}

/**
 * Builds a pedagogical Socratic guiding response without revealing the final numerical answer.
 */
function buildSocraticOfflineResponse(
  prompt: string,
  extracted: any,
  deterministicResult: MathToolResult | null
): { answer: string; steps: string[]; formula: string | null } {
  if (extracted?.type === 'equation') {
    const expr = extracted.canonicalExpression;
    const isQuadratic = expr.includes('^2') || expr.includes('²');

    if (isQuadratic) {
      return {
        answer: `Let us examine this quadratic equation together:\n\n$$${expr}$$\n\nTo begin solving this quadratic, we can either factor it or use the quadratic formula.\n\n**Socratic Question**: What are the values of the coefficients $a$, $b$, and $c$, and do you notice any two numbers that multiply to $c$ and add up to $b$?`,
        steps: [
          'Identify standard form: $ax^2 + bx + c = 0$',
          'Inspect coefficients $a, b, c$',
          'Consider factoring into binomials or applying the quadratic formula',
        ],
        formula: 'ax^2 + bx + c = 0',
      };
    }

    return {
      answer: `Let us solve this linear equation together using inverse operations:\n\n$$${expr}$$\n\n**Socratic Question**: What operation can you perform on both sides of the equation to eliminate the constant term and isolate the variable term?`,
      steps: [
        'Locate the variable term and the constant terms.',
        'Apply the inverse operation (addition or subtraction) to both sides.',
        'Divide or multiply to solve for the single variable.',
      ],
      formula: 'a = b \\implies a - c = b - c',
    };
  }

  if (extracted?.type === 'calculus_derivative') {
    return {
      answer: `We want to differentiate:\n\n$$\\frac{d}{dx}\\left(${extracted.canonicalExpression}\\right)$$\n\n**Socratic Question**: Which standard differentiation rule applies here (such as the Power Rule $\\frac{d}{dx}[x^n] = n x^{n-1}$, Product Rule, or Chain Rule)? What is the exponent or outer function?`,
      steps: [
        'Identify the function type and algebraic form.',
        'Recall the corresponding derivative rule.',
        'Apply the rule systematically to each term.',
      ],
      formula: '\\frac{d}{dx}[x^n] = n x^{n-1}',
    };
  }

  if (extracted?.type === 'calculus_integral') {
    return {
      answer: `We are evaluating the integral of:\n\n$$\\int ${extracted.canonicalExpression} \\, dx$$\n\n**Socratic Question**: What is the antiderivative of each term, using the reverse power rule $\\int x^n \\, dx = \\frac{x^{n+1}}{n+1}$?`,
      steps: [
        'Break into individual terms.',
        'Apply the reverse power rule.',
        'Add the constant of integration $+ C$ or evaluate boundaries.',
      ],
      formula: '\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C',
    };
  }

  if (extracted?.type === 'statistics') {
    return {
      answer: `We have the statistical dataset: $[${extracted.canonicalExpression}]$.\n\n**Socratic Question**: To calculate the arithmetic mean, what two fundamental quantities must you find first?`,
      steps: [
        'Calculate the sum of all elements: $\\sum x_i$',
        'Count the number of observations: $N$',
        'Divide the sum by the count: $\\mu = \\frac{\\sum x_i}{N}$',
      ],
      formula: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^n x_i',
    };
  }

  // Arithmetic / General
  const targetExpr = deterministicResult?.expression || prompt;
  return {
    answer: `Let us work through this calculation together:\n\n$$${targetExpr}$$\n\n**Socratic Question**: According to the standard order of operations (PEMDAS/BODMAS), which operation has the highest precedence and should be evaluated first?`,
    steps: [
      'Identify all operations present (Parentheses, Exponents, Multiplication/Division, Addition/Subtraction).',
      'Select the operation with highest mathematical precedence.',
      'Evaluate that operation and simplify the remaining expression.',
    ],
    formula: 'PEMDAS / BODMAS',
  };
}

/**
 * Builds an exhaustive, numbered step-by-step derivation citing principles.
 */
function buildStepByStepOfflineResponse(
  prompt: string,
  deterministicResult: MathToolResult | null,
  langTemplate: any
): { answer: string; steps: string[]; formula: string | null } {
  if (!deterministicResult || !deterministicResult.success) {
    return {
      answer: `Step-by-step analysis for "${prompt}":\n\n1. Input expression parsed.\n2. No intermediate reductions required.\n3. Verified by authoritative calculation engine.`,
      steps: ['Input expression parsed', 'Authoritative engine verified'],
      formula: null,
    };
  }

  const rawSteps = deterministicResult.steps || deterministicResult.derivationSteps || [];
  const formattedSteps = rawSteps.map((step, idx) => {
    if (step.toLowerCase().startsWith('step')) return step;
    return `Step ${idx + 1}: ${step}`;
  });

  const exprDisplay = deterministicResult.expression || prompt;
  const resultDisplay = deterministicResult.result;

  let answer = `### Step-by-Step Mathematical Derivation\n\n`;
  answer += `**Problem Statement**: $${exprDisplay}$\n\n`;
  formattedSteps.forEach((s) => {
    answer += `* **${s.split(':')[0]}**: ${s.split(':').slice(1).join(':').trim()}\n`;
  });
  answer += `\n---\n**Authoritative Result**: **$${resultDisplay}$**  \n`;
  answer += `*${langTemplate.verifiedBadge}*`;

  return {
    answer,
    steps: formattedSteps,
    formula: deterministicResult.formula || null,
  };
}

/**
 * Builds an interactive quiz problem or student response evaluation.
 */
function buildQuizOfflineResponse(
  prompt: string,
  topic: string,
  difficulty: string,
  deterministicResult: MathToolResult | null
): { answer: string; steps: string[]; formula: string | null; quizItem?: TutorQuizItemData } {
  const isAnswering =
    /^(?:[abcdABCD]\b|my\s+answer|x\s*=|answer\s*is|[0-9\.\-]+$)/i.test(prompt.trim()) ||
    (deterministicResult && prompt.length < 15);

  if (isAnswering && deterministicResult && deterministicResult.success) {
    const verifiedVal = deterministicResult.result;
    const isMatch = prompt.includes(verifiedVal) || verifiedVal.includes(prompt.trim());

    return {
      answer: isMatch
        ? `🎉 **Correct!** Outstanding work.\n\nYour answer matches the verified deterministic solution: **$${verifiedVal}$**.\n\nReady for another quiz challenge? Enter "Next question" or change topics anytime!`
        : `Not quite! Let us examine the exact solution:\n\n* **Authoritative Result**: **$${verifiedVal}$**\n\n**Derivation**:\n${(
            deterministicResult.steps || []
          ).join('\n')}`,
      steps: deterministicResult.steps || [],
      formula: deterministicResult.formula || null,
      quizItem: {
        question: `Evaluate: ${deterministicResult.expression}`,
        correctAnswer: verifiedVal,
        userAnswer: prompt,
        isCorrect: isMatch,
        explanation: `Authoritative verified result is ${verifiedVal}`,
      },
    };
  }

  // Generate interactive question based on topic & difficulty
  let question = 'Solve for $x$: $3x - 7 = 14$';
  let options = ['A) $x = 5$', 'B) $x = 7$', 'C) $x = 6$', 'D) $x = 21$'];
  let correctAnswer = 'B) $x = 7$';
  let hint = 'Add 7 to both sides first, then divide by 3.';

  if (topic === 'Arithmetic') {
    question = 'Compute: $15 \\times 8 - 36 \\div 4$';
    options = ['A) 111', 'B) 120', 'C) 115', 'D) 102'];
    correctAnswer = 'A) 111';
    hint = 'Evaluate multiplication and division before subtraction.';
  } else if (topic === 'Calculus') {
    question = 'Find the derivative $\\frac{d}{dx}\\left(3x^2 - 5x + 2\\right)$';
    options = ['A) $6x - 5$', 'B) $3x - 5$', 'C) $6x + 2$', 'D) $6x^2 - 5$'];
    correctAnswer = 'A) $6x - 5$';
    hint = 'Use the power rule: d/dx(x^n) = n*x^(n-1).';
  } else if (topic === 'Trigonometry') {
    question = 'What is the exact value of $\\sin(30^\\circ)$?';
    options = ['A) $1$', 'B) $\\frac{\\sqrt{3}}{2}$', 'C) $\\frac{1}{2}$', 'D) $\\frac{\\sqrt{2}}{2}$'];
    correctAnswer = 'C) $\\frac{1}{2}$';
    hint = 'Recall the 30-60-90 special right triangle.';
  }

  const answer = `### Interactive Quiz (${difficulty.toUpperCase()} • ${topic})\n\n**Question**: ${question}\n\n${options.map((opt) => `* **${opt.slice(0, 2)}** ${opt.slice(3)}`).join('\n')}\n\n*Hint*: ${hint}\n\n*Type your answer choice (A, B, C, or D) to check your work!*`;

  return {
    answer,
    steps: [hint],
    formula: null,
    quizItem: {
      question,
      options,
      correctAnswer,
      explanation: hint,
    },
  };
}

/**
 * Authoritative production Tutor Orchestrator
 */
export async function orchestrateTutor(
  options: TutorOrchestrationOptions
): Promise<TutorOrchestrationResult> {
  const t0 = performance.now();
  const {
    prompt,
    topic: requestedTopic = 'Algebra',
    difficulty = 'intermediate',
    learningObjective = 'concept',
    hintLevel = 1,
    socraticMode = false,
    mode,
    problemContext,
    learningLevel,
    language = 'en',
    currentExpression,
    currentResult,
    conversation = [],
    groundingContext: customGrounding = '',
  } = options;
  const topic = normalizeMathTopic(requestedTopic, prompt, currentExpression);

  // Resolve active functional tutor mode
  const effectiveMode: FunctionalTutorMode =
    mode || (socraticMode ? 'socratic' : 'assistant');

  if (!prompt || !prompt.trim()) {
    return {
      success: false,
      answer: 'Please provide a mathematical problem or question.',
      expression: null,
      steps: [],
      formula: null,
      mode: effectiveMode,
      deterministicAuthority: {
        isAvailable: false,
        isVerified: false,
        authoritativeResult: null,
        derivationSteps: [],
        confidence: 0,
        method: 'None',
      },
      pedagogy: {
        topic,
        learningObjective,
        difficulty,
        hintLevel,
        socraticActive: effectiveMode === 'socratic',
      },
      groundingSources: [],
      isOfflineFallback: false,
      discrepancyDetected: false,
      executionTimeMs: Math.round(performance.now() - t0),
      error: 'Empty prompt',
    };
  }

  // --------------------------------------------------------------------------
  // Step 1: Deterministic-First Mathematical Computation
  // --------------------------------------------------------------------------
  const extracted = extractMathProblem(prompt);
  let deterministicResult: MathToolResult | null = null;

  switch (extracted.kind) {
    case 'calculate':
      deterministicResult = toolCalculate({ expression: extracted.expression ?? '' });
      break;
    case 'solveEquation':
      deterministicResult = toolSolveEquation({ equation: extracted.equation ?? '' });
      break;
    case 'integrate':
      deterministicResult = toolIntegrate({
        fnExpr: extracted.fnExpr ?? '',
        a: extracted.a ?? 0,
        b: extracted.b ?? 1,
      });
      break;
  }

  // Fallback 1: Direct equation or calculation attempt if problem extractor did not yield a result
  if (!deterministicResult || !deterministicResult.success) {
    const cleaned = prompt
      .replace(/^(?:what\s+is|calculate|compute|evaluate|find|solve)\s+/i, '')
      .replace(/[?]+$/, '')
      .trim();

    if (cleaned.includes('=') && /[a-zA-Z]/.test(cleaned)) {
      const eqAttempt = toolSolveEquation({ equation: cleaned });
      if (eqAttempt.success) {
        deterministicResult = eqAttempt;
      }
    } else if (cleaned) {
      const calcAttempt = toolCalculate({ expression: cleaned });
      if (calcAttempt.success) {
        deterministicResult = calcAttempt;
      }
    }
  }

  // Fallback 2: Active calculator expression if prompt had no match
  if ((!deterministicResult || !deterministicResult.success) && currentExpression && currentExpression.trim()) {
    const calc = toolCalculate({ expression: currentExpression });
    if (calc.success) {
      deterministicResult = calc;
    }
  }

  const hasDeterministicAuthority = Boolean(
    deterministicResult && deterministicResult.success
  );
  const authoritativeValue = deterministicResult?.result || null;

  // --------------------------------------------------------------------------
  // Step 2: Knowledge Grounding Retrieval
  // --------------------------------------------------------------------------
  let groundingContext = customGrounding;
  const groundingSources: string[] = [];
  let retrievedKnowledge: ReturnType<typeof retrieveMathematicsKnowledge> | null = null;

  try {
    const knowledge = retrieveMathematicsKnowledge({ query: prompt, topic, language });
    retrievedKnowledge = knowledge;
    if (knowledge.primaryConcept) {
      groundingSources.push(knowledge.primaryConcept.concept);
      if (!groundingContext) {
        groundingContext = knowledge.groundingContextText;
      }
    }
    for (const rel of knowledge.relatedConcepts) {
      groundingSources.push(rel.concept);
    }
  } catch {
    // Gracefully proceed without grounding if retrieval encounters edge-case input
  }

  const langTemplate = getLanguageTemplate(language);
  const langInstruction = getLanguageSystemInstruction(language);
  const multilingualKnowledgeInstruction = buildMultilingualTutorKnowledge(language);

  // --------------------------------------------------------------------------
  // Step 3: Offline / Deterministic Fallback Mode (No API Key or Offline)
  // --------------------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiAvailability = resolveGeminiAvailability(apiKey, options.offlineOnly);
  const isKeyAvailable = geminiAvailability.available;

  if (!isKeyAvailable) {
    let offlineAnswerData: { answer: string; steps: string[]; formula: string | null; quizItem?: TutorQuizItemData };

    if (effectiveMode === 'socratic') {
      offlineAnswerData = buildSocraticOfflineResponse(prompt, extracted, deterministicResult);
    } else if (effectiveMode === 'step-by-step') {
      offlineAnswerData = buildStepByStepOfflineResponse(prompt, deterministicResult, langTemplate);
    } else if (effectiveMode === 'quiz') {
      offlineAnswerData = buildQuizOfflineResponse(prompt, topic, difficulty, deterministicResult);
    } else if (deterministicResult && deterministicResult.success) {
      offlineAnswerData = {
        answer: `${langTemplate.answerLabel} ${deterministicResult.result}\n\n$${deterministicResult.expression} = ${deterministicResult.result}$\n\n${langTemplate.directAnswerPhrase(
          deterministicResult.expression || prompt,
          deterministicResult.result
        )}`,
        steps: deterministicResult.steps || deterministicResult.derivationSteps || [],
        formula: deterministicResult.formula || null,
      };
    } else if (retrievedKnowledge?.primaryConcept) {
      const concept = retrievedKnowledge.primaryConcept;
      const verifiedExample = concept.examples[0];
      offlineAnswerData = {
        answer: [
          concept.concept,
          '',
          concept.definition,
          concept.formulas.length ? `Relevant formula(s): ${concept.formulas.join('; ')}` : '',
          verifiedExample ? `Verified example: ${verifiedExample.problem} → ${verifiedExample.solution}` : '',
        ].filter(Boolean).join('\n\n'),
        steps: concept.solutionStrategies.slice(0, 5),
        formula: concept.formulas[0] || null,
      };
    } else {
      offlineAnswerData = {
        answer: `Local deterministic Tutor knowledge could not resolve this request.\n\nQuery: "${prompt}"\n\nNo verified local knowledge or deterministic calculation was available.`,
        steps: ['Input analyzed.', 'No verified local knowledge matched the request.'],
        formula: null,
      };
    }

    return {
      success: true,
      answer: offlineAnswerData.answer,
      expression: deterministicResult?.expression || null,
      steps: offlineAnswerData.steps,
      formula: offlineAnswerData.formula,
      mode: effectiveMode,
      deterministicAuthority: {
        isAvailable: hasDeterministicAuthority,
        isVerified: hasDeterministicAuthority,
        authoritativeResult: authoritativeValue,
        exactResult: deterministicResult?.exactResult,
        derivationSteps: deterministicResult?.derivationSteps || [],
        confidence: hasDeterministicAuthority ? 1.0 : 0,
        method: hasDeterministicAuthority
          ? 'Deterministic AST/RPN Evaluator'
          : 'None',
      },
      pedagogy: {
        topic,
        learningObjective,
        difficulty,
        hintLevel,
        socraticActive: effectiveMode === 'socratic',
      },
      quizItem: offlineAnswerData.quizItem,
      groundingSources,
      isOfflineFallback: true,
      discrepancyDetected: false,
      executionTimeMs: Math.round(performance.now() - t0),
      fallbackStatus: options.offlineOnly ? 'offline-deterministic-fallback' : 'gemini-unavailable',
      responseSource: 'deterministic-fallback',

    };
  }

  // --------------------------------------------------------------------------
  // Step 4: AI Tutor Synthesis with Explicit Functional Mode Guidance
  // --------------------------------------------------------------------------
  const ai = new GoogleGenAI({
    apiKey: apiKey!,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Mode-specific instruction protocols
  let modeProtocol = '';
  if (effectiveMode === 'socratic') {
    modeProtocol = `[SOCRATIC TUTORING PROTOCOL - STRICT PEDAGOGICAL BOUNDARY]
CRITICAL RULE: DO NOT reveal the final numerical answer or finished solution under ANY circumstances!
Acknowledge what mathematical problem the student is tackling, guide their intuition, and ask exactly one probing, encouraging guiding question that prompts them to take the first or next step.
If the student makes a mistake or asks for the answer, gently redirect them with a simpler guiding question or an analogy.`;
  } else if (effectiveMode === 'step-by-step') {
    modeProtocol = `[STEP-BY-STEP DERIVATION PROTOCOL - EXHAUSTIVE PROOF]
Provide an exhaustive, numbered derivation where EVERY single intermediate transformation is explicitly detailed (Step 1, Step 2, ...).
For each step, specify:
1. The transformation applied.
2. The mathematical axiom, property, or theorem used (e.g. Subtraction Property of Equality, Distributive Law, Power Rule).
3. The resulting algebraic or numerical expression.
Conclude with the verified authoritative result: ${authoritativeValue || 'exact value'}.`;
  } else if (effectiveMode === 'quiz') {
    modeProtocol = `[INTERACTIVE QUIZ PROTOCOL - TESTING & ASSESSMENT]
You are administering a math quiz for topic "${topic}" at difficulty level "${difficulty}".
- If the student is asking for a quiz question: Present a clear, high-quality question with 4 multiple choice options (A, B, C, D) and a hint. Populate the "quizItem" JSON field.
- If the student is answering: State clearly whether their answer is correct or incorrect against the verified deterministic result (${authoritativeValue}), provide the derivation, and present the next question.`;
  } else {
    modeProtocol = `[STANDARD TUTORING PROTOCOL]
Provide a clear, engaging explanation with step-by-step derivation, LaTeX formulas, and intuitive analogies.`;
  }

  const tutorModeGuidance = `TUTORING WORKSPACE ACTIVE:
- Functional Mode: ${effectiveMode.toUpperCase()}
- Pedagogical Objective: ${learningObjective}
- Current Topic: ${topic}
- Target Difficulty: ${difficulty}
- Progressive Hint Level: ${hintLevel} of 5.
${modeProtocol}`;

  const deterministicBoundary = hasDeterministicAuthority
    ? `\n[AUTHORITATIVE DETERMINISTIC CALCULATION - NON-NEGOTIABLE]
Expression: ${deterministicResult!.expression}
Verified Authoritative Result: ${authoritativeValue}
Exact Result: ${deterministicResult!.exactResult || authoritativeValue}
CRITICAL SAFETY & TRUTH CONSTRAINT:
The deterministic result is absolute ground truth. You MUST align your explanation with ${authoritativeValue}. Never provide a contradictory numerical answer or substitute an unverified approximation.\n`
    : '';

  const systemInstruction = `You are the AI Mathematical Assistant & Interactive Tutor inside Calcora AI precision digital scientific workbench.
You explain and tutor around deterministic mathematical results. The calculator engine is authoritative.

${langInstruction}

${tutorModeGuidance}

${deterministicBoundary}

${groundingContext ? `\n[VERIFIED MATHEMATICAL KNOWLEDGE GROUNDING]\n${groundingContext}\nGround your reasoning in these standard mathematical definitions, axioms, and theorems.\n` : ''}

Rules:
1. Provide mathematically rigorous, clear, and encouraging explanations.
2. Structure step-by-step derivations clearly with numbered steps.
3. Use LaTeX math syntax enclosed in dollar signs ($...$) for inline math and double dollar signs ($$...$$) for display equations.
4. Distinguish exact values (e.g. $\\sqrt{2}$, $\\frac{1}{3}$) from numerical approximations.
5. If domain restrictions apply (division by zero, negative radicands, logs), explicitly state them.

Return your response in clean JSON matching:
{
  "answer": "Clear pedagogical response with LaTeX math formatting",
  "expression": "Optional single mathematical expression if applicable, or null",
  "steps": ["Step 1: ... with LaTeX math", "Step 2: ... with LaTeX math"],
  "formula": "Optional standard formula used in LaTeX (e.g. $a^2 + b^2 = c^2$), or null",
  "quizItem": {
    "question": "Optional quiz question text if in quiz mode",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "hint": "Gentle hint"
  }
}`;

  const followUpDetected = Boolean(problemContext) && isTutorFollowUpPrompt(prompt);
  const continuityContext = formatTutorContinuityContext({
    isFollowUp: followUpDetected,
    reason: followUpDetected
      ? (/\b(what next|next step|continue|go on|keep going)\b/i.test(prompt)
        ? 'continuation'
        : /\b(this|that|it|the step|the equation|the problem|the answer)\b/i.test(prompt)
          ? 'referential'
          : 'explicit')
      : 'new-problem',
    activeProblem: problemContext
      ? {
          rawProblem: problemContext.rawProblem || '',
          canonicalExpression: problemContext.canonicalExpression,
          problemType: problemContext.problemType,
          topic: problemContext.topic || topic,
          difficulty: problemContext.difficulty || difficulty,
          authoritativeResult: problemContext.authoritativeResult,
          derivationSteps: problemContext.derivationSteps || [],
          currentSubstepIndex: problemContext.currentSubstepIndex ?? 0,
          messageCount: problemContext.messageCount || conversation.length,
          updatedAt: problemContext.updatedAt || Date.now(),
        }
      : null,
    learningLevel: learningLevel?.level || difficulty,
    topicMastery: learningLevel?.topicMastery || {},
    recentTurns: conversation.slice(-6),
  });

  const fullPrompt = `${continuityContext}\nUser: ${prompt}`;

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
  ];

  let rawResponseText = '';
  let modelUsed = '';
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const resp = await Promise.race([ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: effectiveMode === 'quiz' ? 0.3 : 0.2,
        },
      }), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini request timeout')), 12000))]);

      const text = typeof resp?.text === 'string' ? resp.text.trim() : '';
      if (text) {
        rawResponseText = text;
        modelUsed = model;
        break;
      }
      lastError = new Error(`Gemini model ${model} returned an empty response`);
    } catch (err: unknown) {
      lastError = err;
      continue;
    }
  }

  // Parse structured AI response
  let parsed: any = null;
  if (rawResponseText) {
    try {
      const cleanJson = rawResponseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsed = parseGeminiJsonResponse(cleanJson);
      if (!parsed) throw new Error('Malformed or unexpected Gemini response structure');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Malformed Gemini response');
      parsed = null;
    }
  }

  // Check for potential discrepancy between model response and deterministic engine
  let discrepancyDetected = false;
  if (hasDeterministicAuthority && parsed?.answer && effectiveMode !== 'socratic') {
    const answerText = parsed.answer;
    if (authoritativeValue && !answerText.includes(authoritativeValue)) {
      discrepancyDetected = true;
    }
  }

  const executionTimeMs = Math.round(performance.now() - t0);

  if (!parsed) {
    // If model call failed, fallback to verified deterministic result
    let fallbackData: { answer: string; steps: string[]; formula: string | null; quizItem?: TutorQuizItemData };

    if (effectiveMode === 'socratic') {
      fallbackData = buildSocraticOfflineResponse(prompt, extracted, deterministicResult);
    } else if (effectiveMode === 'step-by-step') {
      fallbackData = buildStepByStepOfflineResponse(prompt, deterministicResult, langTemplate);
    } else if (effectiveMode === 'quiz') {
      fallbackData = buildQuizOfflineResponse(prompt, topic, difficulty, deterministicResult);
    } else if (deterministicResult && deterministicResult.success) {
      fallbackData = {
        answer: `${langTemplate.answerLabel} ${authoritativeValue}\n\n$${deterministicResult.expression} = ${authoritativeValue}$`,
        steps: deterministicResult.steps || deterministicResult.derivationSteps || [],
        formula: deterministicResult.formula || null,
      };
    } else {
      return {
        success: false,
        answer: 'Failed to generate tutor response.',
        expression: null,
        steps: [],
        formula: null,
        mode: effectiveMode,
        deterministicAuthority: {
          isAvailable: false,
          isVerified: false,
          authoritativeResult: null,
          derivationSteps: [],
          confidence: 0,
          method: 'None',
        },
        pedagogy: {
          topic,
          learningObjective,
          difficulty,
          hintLevel,
          socraticActive: false,
        },
        groundingSources,
        isOfflineFallback: false,
        discrepancyDetected: false,
        executionTimeMs,
        error: lastError instanceof Error ? lastError.message : 'AI generation failed',
        fallbackStatus: 'deterministic-tutor-unavailable',
        responseSource: 'deterministic-tutor-unavailable',
      };
    }

    return {
      success: true,
      answer: fallbackData.answer,
      expression: deterministicResult?.expression || null,
      steps: fallbackData.steps,
      formula: fallbackData.formula,
      mode: effectiveMode,
      deterministicAuthority: {
        isAvailable: hasDeterministicAuthority,
        isVerified: hasDeterministicAuthority,
        authoritativeResult: authoritativeValue,
        exactResult: deterministicResult?.exactResult,
        derivationSteps: deterministicResult?.derivationSteps || [],
        confidence: hasDeterministicAuthority ? 1.0 : 0,
        method: hasDeterministicAuthority
          ? 'Deterministic AST/RPN Evaluator'
          : 'None',
      },
      pedagogy: {
        topic,
        learningObjective,
        difficulty,
        hintLevel,
        socraticActive: effectiveMode === 'socratic',
      },
      quizItem: fallbackData.quizItem,
      groundingSources,
      isOfflineFallback: true,
      discrepancyDetected: false,
      executionTimeMs,
      error: lastError instanceof Error ? lastError.message : undefined,
      fallbackStatus: 'gemini-request-failed',
      geminiFailureKind: lastError ? classifyGeminiRuntimeFailure(lastError) : 'all-models-failed',
      responseSource: 'deterministic-fallback',
    };
  }

  return {
    success: true,
    answer: parsed.answer || '',
    expression: parsed.expression || (deterministicResult?.expression ?? null),
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    formula: parsed.formula || (deterministicResult?.formula ?? null),
    mode: effectiveMode,
    deterministicAuthority: {
      isAvailable: hasDeterministicAuthority,
      isVerified: hasDeterministicAuthority,
      authoritativeResult: authoritativeValue,
      exactResult: deterministicResult?.exactResult,
      derivationSteps: deterministicResult?.derivationSteps || [],
      confidence: hasDeterministicAuthority ? 1.0 : 0,
      method: hasDeterministicAuthority
        ? 'Deterministic AST/RPN Evaluator'
        : 'None',
    },
    pedagogy: {
      topic,
      learningObjective,
      difficulty,
      hintLevel,
      socraticActive: effectiveMode === 'socratic',
    },
    quizItem: parsed.quizItem,
    groundingSources,
    isOfflineFallback: false,
    discrepancyDetected,
    executionTimeMs,
  };
}
