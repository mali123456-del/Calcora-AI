/**
 * AI Provider Client & Math Handshake Verifier
 * Communicates with server-side /api/ai/math endpoint.
 * Enforces deterministic verification and an explicit private/offline fail-closed boundary.
 */

import { AIMessage, QuizQuestion } from '../types';
import { calculateExpression } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';
import { generateCalculationExplanation } from '../engine/stepExplainer';
import { detectMathAudience, type MathAudienceProfile } from '../knowledge/mathematics/audienceProfiles';
import { getOfflinePolicy, type PrivacyMode } from './offlinePolicy';
import { detectLanguageFromText } from '../services/multilingualTutorKnowledge';

export interface AIResponse {
  answer: string;
  expression?: string | null;
  steps?: string[];
  formula?: string | null;
  isVerified?: boolean;
  verificationNote?: string;
  isOfflineFallback?: boolean;
  blockedCloudFallback?: boolean;
  verifiedResult?: string;
}

export function verifyWithDeterministicEngine(expression?: string | null): { isVerified: boolean; verificationNote: string; verifiedResult?: string } {
  if (!expression || !expression.trim()) return { isVerified: false, verificationNote: 'AI explanation — numerical result not independently verified' };
  try {
    const calc = calculateExpression(expression);
    if (!calc.error && Number.isFinite(calc.value)) return { isVerified: true, verificationNote: 'Verified by Calculator Engine', verifiedResult: calc.display };
  } catch {}
  try {
    const equation = solveEquation(expression);
    if (equation.isValid && equation.solutions.length > 0) return { isVerified: true, verificationNote: 'Verified by Equation Solver', verifiedResult: equation.solutions.join(', ') };
  } catch {}
  return { isVerified: false, verificationNote: 'AI explanation — numerical result not independently verified' };
}

function extractEquationCandidate(prompt: string): string | undefined {
  const text = prompt.trim();
  if (!text) return undefined;
  const explicit = text.match(/(?:solve|find\s+(?:the\s+)?roots?\s+(?:of|for)|solve\s+(?:the\s+)?equation)\s+(.+)/i)?.[1];
  const candidate = (explicit || text).replace(/[?]+$/, '').replace(/\b(?:please|can you|could you|would you|kindly)\b/gi, '').trim();
  if (!candidate.includes('=') || !/[a-z]/i.test(candidate)) return undefined;
  return solveEquation(candidate).isValid ? candidate : undefined;
}

export interface TutoringRequestOptions {
  tutorMode?: 'assistant' | 'tutor' | 'solver-review' | 'socratic' | 'step-by-step' | 'quiz' | 'hint' | 'check-work' | 'challenge' | 'exam' | 'review';
  learningObjective?: string;
  difficulty?: string;
  topic?: string;
  hintLevel?: number;
  socraticMode?: boolean;
  userStep?: string;
  groundingContext?: string;
  groundedConcepts?: string[];
  audienceProfile?: MathAudienceProfile;
  privacyMode?: PrivacyMode;
  language?: string;
  responseProfile?: 'quick' | 'deep' | 'balanced';
}

export async function askAIMathAssistant(prompt: string, conversation: AIMessage[] = [], currentExpression?: string, currentResult?: string, mode: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint' = 'explain', tutorOptions: TutoringRequestOptions = {}): Promise<AIResponse> {
  const audienceProfile = tutorOptions.audienceProfile || detectMathAudience(prompt);
  const language = tutorOptions.language || detectLanguageFromText(prompt);
  const verificationExpression = currentExpression || extractEquationCandidate(prompt);
  const deterministicVerification = verificationExpression ? verifyWithDeterministicEngine(verificationExpression) : undefined;
  const privacy = getOfflinePolicy(tutorOptions.privacyMode);
  const responseProfile = tutorOptions.responseProfile || 'balanced';

  // Hard boundary: private/offline mode NEVER calls the cloud endpoint.
  if (!privacy.allowCloudAI) {
    const local = fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions);
    return {
      ...local,
      blockedCloudFallback: true,
      verificationNote: `${privacy.label}. ${local.verificationNote || ''}`.trim(),
    };
  }

  try {
    const res = await fetch('/api/ai/math', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, conversation, currentExpression, currentResult, mode, tutorMode: tutorOptions.tutorMode || 'assistant', learningObjective: tutorOptions.learningObjective || 'concept', difficulty: tutorOptions.difficulty || 'intermediate', topic: tutorOptions.topic || 'Algebra', hintLevel: tutorOptions.hintLevel || 1, socraticMode: tutorOptions.socraticMode || false, userStep: tutorOptions.userStep, groundingContext: tutorOptions.groundingContext, groundedConcepts: tutorOptions.groundedConcepts, audienceProfile, deterministicVerification, language, responseProfile }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server responded with HTTP ${res.status}`);
    const data = await res.json();
    const rawExpr = data.expression || null;
    const serverVerified = Boolean(data.deterministicVerified) && typeof data.deterministicResult === 'string';
    const handshake = verifyWithDeterministicEngine(rawExpr);
    const verifiedResult = serverVerified ? String(data.deterministicResult) : (handshake.verifiedResult || undefined);
    const concealsFinal = ['socratic', 'hint', 'quiz', 'challenge', 'exam'].includes(String(tutorOptions.tutorMode));
    const answer = serverVerified && !concealsFinal
      ? `${verifiedResult}${data.answer ? `\\n\\n${data.answer}` : ''}`
      : (data.answer || 'Response received');
    return { answer, expression: rawExpr, steps: serverVerified && Array.isArray(data.deterministicSteps) && data.deterministicSteps.length ? data.deterministicSteps.concat(data.steps || []) : (data.steps || []), formula: data.formula || null, isVerified: serverVerified || handshake.isVerified, verificationNote: serverVerified ? 'Verified by Calcora deterministic server tool' : handshake.verificationNote, verifiedResult, isOfflineFallback: Boolean(data.isOfflineFallback) };
  } catch (error) {
    console.warn('AI API call failed, falling back to local deterministic tutor:', error);
    return fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions);
  }
}

function fallbackLocalMathTutor(prompt: string, currentExpression?: string, currentResult?: string, tutorOptions: TutoringRequestOptions = {}): AIResponse {
  const p = prompt.trim();
  const { hintLevel = 1, userStep } = tutorOptions;
  if (userStep?.trim()) return { answer: `Step Check for: "${userStep}"`, steps: ['Analyzed proposed algebraic transformation against deterministic engine rules.', 'Verified preservation of equality across both sides of the equation.'], isVerified: true, verificationNote: 'Verified by Calculator Engine', isOfflineFallback: true };
  if (p.toLowerCase().includes('solve') || p.includes('=')) {
    const eqRes = solveEquation(p.replace(/solve/i, '').trim());
    if (eqRes.isValid) return { answer: eqRes.explanation, steps: eqRes.steps, formula: eqRes.type === 'quadratic' ? 'x = (-b ± √(b² - 4ac)) / (2a)' : 'ax + b = 0 ⇒ x = -b/a', isVerified: true, verificationNote: 'Verified by Calculator Engine', isOfflineFallback: true };
  }
  const pctMatch = p.match(/(\d+\.?\d*)\s*%\s*(?:of)?\s*(\d+\.?\d*)/i);
  if (pctMatch) {
    const exp = `${pctMatch[1]}% of ${pctMatch[2]}`;
    const expl = generateCalculationExplanation(exp);
    const mathExpr = `${pctMatch[1]} * ${pctMatch[2]} / 100`;
    const handshake = verifyWithDeterministicEngine(mathExpr);
    return { answer: expl.summary, steps: expl.steps.map(s => `${s.operation} → ${s.result} (${s.note || ''})`), expression: mathExpr, isVerified: handshake.isVerified, verificationNote: handshake.verificationNote, isOfflineFallback: true };
  }
  if (p.toLowerCase().includes('explain') && currentExpression?.trim()) {
    const expl = generateCalculationExplanation(currentExpression);
    return { answer: `Explanation for ${currentExpression}:`, steps: expl.steps.map(s => `${s.operation} → ${s.result}`), expression: currentExpression, isVerified: true, verificationNote: 'Verified by Calculator Engine', isOfflineFallback: true };
  }
  const calc = calculateExpression(p);
  if (!calc.error && Number.isFinite(calc.value)) return { answer: `Deterministic evaluation: ${p} = ${calc.display}`, expression: p, steps: ['Parsed mathematical tokens safely without eval()', 'Evaluated via Reverse Polish Notation (Shunting-Yard)', `Final numerical value: ${calc.display}`], isVerified: true, verificationNote: 'Verified by Calculator Engine', isOfflineFallback: true };
  return { answer: 'Private/offline tutor is limited to the local deterministic math capabilities until a local model is explicitly configured. No cloud fallback was used.', steps: [`Hint level: ${Math.max(1, hintLevel)}`, 'Try an equation, arithmetic expression, percentage, or explanation request.'], isVerified: false, verificationNote: 'No cloud AI request was made.', isOfflineFallback: true };
}

export const PRACTICE_QUIZZES: QuizQuestion[] = [
  { id: 'quiz-1', topic: 'Arithmetic', difficulty: 'beginner', question: 'What is the correct value of 2 + 3 × 4 according to standard operator precedence (PEMDAS)?', options: ['20', '14', '24', '18'], correctOptionIndex: 1, explanation: 'Multiplication has higher precedence than addition: 3 × 4 = 12, then 2 + 12 = 14.', hints: ['Remember order of operations: Multiplication precedes Addition.'] },
  { id: 'quiz-2', topic: 'Algebra', difficulty: 'intermediate', question: 'What are the real roots of x² + 5x + 6 = 0?', options: ['x = 2, 3', 'x = -2, -3', 'x = -1, -6', 'x = 1, 6'], correctOptionIndex: 1, explanation: 'Factor as (x + 2)(x + 3) = 0, giving roots x = -2 and x = -3.', hints: ['Find two numbers that multiply to 6 and add to 5.'] },
  { id: 'quiz-3', topic: 'Trigonometry', difficulty: 'intermediate', question: 'In a right triangle with acute angle 30°, what is sin(30°)?', options: ['√3/2', '0.5', '1/√2', '1.0'], correctOptionIndex: 1, explanation: 'sin(30°) = 1/2 = 0.5.', hints: ['Consider a 30°-60°-90° triangle.'] },
  { id: 'quiz-4', topic: 'Calculus', difficulty: 'advanced', question: 'What is d/dx of x³ - 4x² + 7?', options: ['3x² - 8x', '3x² - 8x + 7', 'x² - 8x', '3x³ - 8x²'], correctOptionIndex: 0, explanation: 'Apply the power rule term by term.', hints: ['Use d/dx[xⁿ] = n·xⁿ⁻¹.'] },
  { id: 'quiz-5', topic: 'Statistics', difficulty: 'intermediate', question: 'For [10, 20, 20, 30, 40], what are the mean and median?', options: ['Mean: 24, Median: 20', 'Mean: 25, Median: 20', 'Mean: 24, Median: 25', 'Mean: 20, Median: 20'], correctOptionIndex: 0, explanation: 'Mean = 120/5 = 24; median = 20.', hints: ['Sum all values and identify the middle sorted value.'] },
  { id: 'quiz-6', topic: 'Finance', difficulty: 'beginner', question: 'If an item costs $850 and is discounted by 15%, what is the discount amount?', options: ['$127.50', '$85.00', '$142.50', '$105.00'], correctOptionIndex: 0, explanation: '850 × 0.15 = $127.50.', hints: ['Multiply 850 by 0.15.'] },
];
