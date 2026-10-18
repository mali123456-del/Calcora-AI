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
import { classifyMathematicalIntent } from '../knowledge/mathematics/intent';
import { getLocalizedTermsForConcept, resolveMultilingualConceptIds } from '../knowledge/multilingualMathConcepts';
import { detectLanguage } from './languageDetection';
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
  TutorQuizItemData,
  isTutorFollowUpPrompt,
  formatTutorContinuityContext,
} from './tutorConversationService';
import { parseGeminiJsonResponse, classifyGeminiRuntimeFailure, type GeminiRuntimeFailureKind } from './geminiRuntime';
import {
  verifyCalculation,
  verifyEquation,
  verifyDerivative,
  verifyUnsupported,
} from '../verification/independentVerifier';
import {
  classifyMisconception,
  createMisconceptionState,
  selectTargetedHint,
  type MisconceptionState,
} from './misconceptionModel';
import {
  unavailable,
  type VerificationOutcome,
} from '../verification/verificationStates';
import {
  selectRelevantChunks,
  formatDocumentContext,
  describeDocumentProvenance,
  MAX_DOCUMENT_CONTEXT_CHARS,
  type DocumentContext,
} from './documentContext';

export interface TutorOrchestrationOptions {
  prompt: string;
  topic?: MathTopic | string;
  difficulty?: DifficultyLevel;
  learningObjective?: LearningObjective;
  hintLevel?: HintLevel;
  socraticMode?: boolean;
  mode?: FunctionalTutorMode;
  problemContext?: Partial<MathProblemContext>;
  learningLevel?: {
    level?: DifficultyLevel;
    topicMastery?: Partial<Record<MathTopic, number>>;
  };
  /** The learner's submitted answer or working, used by check-work / review modes. */
  userAnswer?: string;
  language?: string;
  currentExpression?: string;
  currentResult?: string;
  conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  groundingContext?: string;
  offlineOnly?: boolean;
  /** Page-aware text extracted from a user document (e.g. a PDF). Untrusted input. */
  documentContext?: DocumentContext | null;
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
    /**
     * True only when `verification.state === 'VERIFIED'`, i.e. a second, independent
     * code path re-derived the same value. This is deliberately NOT an alias for
     * `isAvailable`.
     */
    isVerified: boolean;
    authoritativeResult: string | null;
    exactResult?: string;
    derivationSteps: string[];
    confidence: number;
    method: string;
    /**
     * The canonical four-state verification outcome. This is the field the UI must
     * render. `isVerified` above is a derived convenience for older call sites.
     */
    verification: VerificationOutcome;
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
  /** Present when a hint classified the learner's submitted work. */
  misconception?: MisconceptionState | null;
  executionTimeMs: number;
  error?: string;
  fallbackStatus?: TutorFallbackStatus;
  responseSource?: 'gemini' | 'local-model' | 'deterministic-fallback' | 'deterministic-tutor-unavailable' | 'gemini-unavailable'
    | 'document-grounded' | 'document-insufficient-evidence';
  /** Provenance of the document evidence used, for inspectability. */
  documentProvenance?: string;
  /** Pages actually cited in the answer. */
  documentPagesUsed?: number[];
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

/**
 * Leading natural-language filler that can precede the equation itself. Restricted to
 * unambiguous words so a legitimate variable-only equation such as "x + 5 = 15" is never
 * truncated.
 */
const EQUATION_FILLER_WORDS = new Set([
  'for', 'in', 'if', 'the', 'value', 'of', 'unknown', 'variable', 'solve', 'find',
  'when', 'where', 'given', 'that', 'let', 'x', 'equals', 'equal', 'answer', 'root',
]);

/**
 * Recovers the equation-shaped substring from natural-language phrasing such as
 * "solve for x in 2x + 5 = 15" or "find the value of x where 3x + 2 = 11".
 * Returns null when the text contains no equality to solve.
 */
function extractEquationCandidate(text: string): string | null {
  if (!text.includes('=')) return null;
  const trimmed = text.trim();
  if (toolSolveEquation({ equation: trimmed }).success) return trimmed;

  // Drop leading filler words, then retry on the remainder.
  const tokens = trimmed.split(/\s+/);
  while (tokens.length && EQUATION_FILLER_WORDS.has(tokens[0].toLowerCase())) {
    tokens.shift();
  }
  const withoutFiller = tokens.join(' ').trim();
  if (withoutFiller && withoutFiller !== trimmed && toolSolveEquation({ equation: withoutFiller }).success) {
    return withoutFiller;
  }

  // Last resort: the maximal run of mathematical characters containing an "=".
  // This is what recovers an equation embedded in non-Latin phrasing, for example
  // "میں 2x + 5 = 15 سمجھاؤ", where the surrounding script is not part of the equation.
  const mathRun = trimmed.match(/[A-Za-z0-9_.\s()+\-*/^$]*=[A-Za-z0-9_.\s()+\-*/^$]*/);
  const run = mathRun ? mathRun[0].trim() : null;
  if (run && run !== trimmed && run.includes('=') && toolSolveEquation({ equation: run }).success) {
    return run;
  }

  return null;
}

/**
 * Sentences from the document that overlap the question, used to ground an answer.
 * The text is treated strictly as reference data: it is quoted back to the learner
 * with its page number and is never executed or obeyed.
 */
function extractSupportingSentences(
  chunks: ReturnType<typeof selectRelevantChunks>,
  question: string,
  limit = 4,
): Array<{ pageNumber: number; sentence: string }> {
  const questionTokens = new Set(
    question
      .toLowerCase()
      .split(/[^\p{L}\p{N}+-]+/u)
      .filter((token) => token.length > 2),
  );

  const scored: Array<{ pageNumber: number; sentence: string; score: number }> = [];
  for (const chunk of chunks) {
    for (const raw of chunk.text.split(/(?<=[.!?؟۔])\s+|\n+/)) {
      const sentence = raw.trim();
      if (sentence.length < 12) continue;
      const tokens = sentence.toLowerCase().split(/[^\p{L}\p{N}+-]+/u);
      let score = 0;
      for (const token of new Set(tokens)) {
        if (questionTokens.has(token)) score += 1;
      }
      if (score > 0) scored.push({ pageNumber: chunk.pageNumber, sentence, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber);
  return scored.slice(0, limit).map(({ pageNumber, sentence }) => ({ pageNumber, sentence }));
}

interface DocumentGroundedAnswer {
  answer: string;
  steps: string[];
  formula: string | null;
  pagesUsed: number[];
  grounded: boolean;
  provenance: string;
}

/**
 * Builds an answer from the user's extracted document.
 *
 * When the document does not contain the evidence, that is stated plainly instead of
 * being filled in from general knowledge, so absence is never presented as fact.
 */
function buildDocumentGroundedResponse(
  prompt: string,
  document: DocumentContext,
  language: string,
): DocumentGroundedAnswer {
  const provenance = describeDocumentProvenance(document);
  const isUrdu = /^ur($|[-_])/i.test(language) || /[\u0600-\u06FF]/.test(prompt);

  if (!document.hasText) {
    const answer = isUrdu
      ? `میں نے دستاویز "${document.fileName}" کا متن نکالا مگر اس میں قابلِ انتخاب متن نہیں ملا۔ یہ ایک اسکین شدہ دستاویز لگتی ہے، جس کے لیے OCR درکار ہے۔ اس لیے میں اس کے بارے میں کوئی حد یا معنی نہیں بتا سکتا۔`
      : `I could not extract any selectable text from "${document.fileName}". It appears to be a scanned document, which requires OCR. I therefore cannot say anything reliable about its contents.`;
    return {
      answer,
      steps: [
        isUrdu ? 'دستاویز کا متن نکالا گیا مگر خالی پایا گیا۔' : 'Document text extraction returned no content.',
        isUrdu ? 'اسکین شدہ دستاویز کے لیے OCR درکار ہے۔' : 'OCR would be required for a scanned document.',
        isUrdu ? 'کوئی مواد نہیں بنایا گیا۔' : 'No content was invented to fill the gap.',
      ],
      formula: null,
      pagesUsed: [],
      grounded: false,
      provenance,
    };
  }

  const chunks = selectRelevantChunks(document, prompt, MAX_DOCUMENT_CONTEXT_CHARS);

  if (!chunks.length) {
    const pages = document.pageCount;
    const answer = isUrdu
      ? `دستاویز "${document.fileName}" کے ${pages} صفحات میں آپ کے سوال کا جواب موجود نہیں ہے۔ دستاویز میں کوئی ایسا متن نہیں ملا جو اس سوال سے مطابقت رکھتا ہو۔`
      : `The document "${document.fileName}" does not contain enough information to answer that. Its ${pages} page(s) contain no passage that matches this question.`;
    return {
      answer,
      steps: [
        isUrdu ? `دستاویز کے ${pages} صفحات تلاش کیے گئے۔` : `Searched ${pages} page(s) of the document.`,
        isUrdu ? 'سوال سے مطابقت رکھنے والا کوئی حصہ نہیں ملا۔' : 'No matching passage was found.',
        isUrdu ? 'معلومات کی کمی سے کوئی جواب نہیں گھڈپایا گیا۔' : 'Nothing was invented to cover the gap.',
      ],
      formula: null,
      pagesUsed: [],
      grounded: false,
      provenance,
    };
  }

  const evidence = extractSupportingSentences(chunks, prompt);
  const pagesUsed = [...new Set(evidence.map((item) => item.pageNumber))].sort((a, b) => a - b);
  const contextText = formatDocumentContext(chunks, document, { maxChars: MAX_DOCUMENT_CONTEXT_CHARS });

  if (!evidence.length) {
    const pageList = [...new Set(chunks.map((c) => c.pageNumber))].sort((a, b) => a - b);
    const answer = isUrdu
      ? `دستاویز کے صفحہ ${pageList.join('، ')} پر اس سوال کا براہِ راست جواب نہیں ملا۔ دستاویز میں اس موضوع سے متعلق material موجود ہے مگر اس سوال کا جواب براہِ راست نہیں دیا گیا۔`
      : `The document does not state a direct answer to that question. It covers the topic on page ${pageList.join(', ')}, but the specific answer you asked for is not given.`;
    return {
      answer: `${answer}\n\n${isUrdu ? 'متعلقہ صفحہ' : 'Related page'}: ${pageList.join(', ')}`,
      steps: [
        isUrdu ? `دستاویز کے صفحات ${pageList.join('، ')} تلاش کیے گئے۔` : `Retrieved pages ${pageList.join(', ')} of the document.`,
        isUrdu ? 'براہِ راست جواب دستاویز میں موجود نہیں۔' : 'No direct answer is present in the retrieved text.',
      ],
      formula: null,
      pagesUsed,
      grounded: false,
      provenance,
    };
  }

  const citations = evidence.map((item) => `- "${item.sentence}" (page ${item.pageNumber})`).join('\n');
  const answer = isUrdu
    ? `دستاویز "${document.fileName}" کے مطابق، سوال کا جواب یہ ہے:\n\n${citations}\n\nیہ تمام جواب براہِ راست دستاویز کے متن سے لیا گیا ہے (صفحہ ${pagesUsed.join('، ')})۔`
    : `Based on "${document.fileName}", the answer is:\n\n${citations}\n\nEvery statement above is quoted directly from the document (page ${pagesUsed.join(', ')}).`;

  return {
    answer,
    steps: [
      isUrdu ? `دستاویز کے ${document.pageCount} صفحات میں سوال کے لیے متن تلاش کیا گیا۔` : `Searched ${document.pageCount} page(s) for text matching the question.`,
      isUrdu ? `صفحہ ${pagesUsed.join('، ')} سے ${evidence.length} جملے ملے۔` : `Found ${evidence.length} supporting passage(s) on page ${pagesUsed.join(', ')}.`,
      isUrdu ? 'جواب براہِ راست دستاویز کے متن پر مبنی ہے۔' : 'The answer quotes the document rather than adding outside claims.',
    ],
    formula: null,
    pagesUsed,
    grounded: true,
    provenance,
  };
}

/**
 * Localized scaffolding for the interaction modes (hint / check-work / review).
 * Keeps these modes in the user's language instead of falling back to English.
 */
function modePhrases(language: string) {
  const isUrdu = /^ur($|[-_])/i.test(language);
  return isUrdu
    ? {
        askForProblem:
          'مجھے hint دینے کے لیے مسئله درکار ہے۔ براہِ کرم مساوات یا جو مسئلہ آپ کو حل کرنا ہے یہاں لکھیں، یا کیلکولیٹر میں_expression درج کریں۔',
        start: 'یہاں سے آغاز کریں:',
        nextStep: 'اگلا قدم:',
        completeSolution: 'مکمل حل:',
        firstError: 'پہلا غلط قدم:',
        firstIncorrect: 'پہلا غلط قدم:',
        correctionNote: 'درست طریقہ اوپر تصدیق شدہ مراحل میں دکھایا گیا ہے۔',
        correct: 'بالکل درست! یہی حل ہے۔',
        wrong: 'یہ درست نہیں ہے۔',
        notComplete: 'یہ مکمل مساوات نہیں ہے۔',
        pasteWork: 'اپنا کام یہاں بھیجیں تاکہ میں پہلا غلط قدم بتا سکوں۔',
        result: 'تصدیق شدہ نتیجہ',
      }
    : {
        askForProblem:
          'I need the problem before I can give you a useful hint. Please send the equation or the question you are working on, or type an expression in the calculator.',
        start: 'Start here:',
        nextStep: 'Next step:',
        completeSolution: 'Complete solution:',
        firstError: 'The first step that goes wrong is:',
        firstIncorrect: 'First incorrect step:',
        correctionNote: 'The deterministic derivation above shows the correction.',
        correct: 'Correct — that is the right answer.',
        wrong: 'That is not correct.',
        notComplete: 'That is not a complete equation, so I cannot check it yet.',
        pasteWork: 'Send the working you have done and I will point at the first step that goes wrong.',
        result: 'Verified result',
      };
}

/** Normalises a learner's typed answer for comparison against a verified value. */
function normalizeLearnerAnswer(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/^[^0-9a-z+\-./^*=]+|[^0-9a-z+\-./^*=)]+$/gi, '')
    .replace(/\s+/g, '')
    .replace(/=+$/, '')
    .toLowerCase();
}

/** True when the text looks like an unfinished or unusable mathematical expression. */
function looksIncomplete(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (/[+\-*/^]$/.test(value)) return true;
  if (/=$/.test(value)) return true;
  const opens = (value.match(/\(/g) ?? []).length;
  const closes = (value.match(/\)/g) ?? []).length;
  if (opens !== closes) return true;
  if (!/[0-9a-z]/i.test(value)) return true;
  return false;
}

/** Returns the first submitted equation that disagrees with the verified solution. */
function findFirstIncorrectEquationStep(
  submittedWork: string,
  activeProblem: string,
  expectedResult: string,
): string | null {
  const segments = String(submittedWork ?? '')
    .split(/,|;|\bso\b|\bthus\b|\bthen\b|\bi get\b|\bwhich gives\b|،|और|لےکن/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const original = (activeProblem || recoverProblemFromWorking(submittedWork) || '').replace(/\s+/g, '').toLowerCase();

  for (const segment of segments) {
    const candidate = extractEquationCandidate(segment);
    if (!candidate || !/[a-z]/i.test(candidate)) continue;
    if (original && candidate.replace(/\s+/g, '').toLowerCase() === original) continue;

    const result = toolSolveEquation({ equation: candidate });
    if (result.success && normalizeLearnerAnswer(result.result) !== normalizeLearnerAnswer(expectedResult)) {
      return segment;
    }
  }
  return null;
}

/**
 * Produces a progressive hint for the active problem.
 *
 * The hint is derived from the deterministic derivation steps, so it is always
 * mathematically correct. The final answer is never stated, because a hint-only
 * request must leave the learner something to do.
 */
function buildHintOfflineResponse(
  prompt: string,
  problemContext: Partial<MathProblemContext> | undefined,
  deterministicResult: MathToolResult | null,
  hintLevel: number,
  language: string,
  userAnswer?: string,
  topic?: string,
): { answer: string; steps: string[]; formula: string | null; misconception: MisconceptionState | null } {
  const phrases = modePhrases(language);
  const level = Math.min(5, Math.max(1, Math.round(hintLevel) || 1));

  const steps: string[] =
    (deterministicResult?.derivationSteps?.length ? deterministicResult.derivationSteps : null) ??
    (problemContext?.derivationSteps?.length ? problemContext.derivationSteps : null) ??
    [];

  const activeProblem = problemContext?.canonicalExpression || problemContext?.rawProblem || '';
  const hasProblem = Boolean(activeProblem) || Boolean(deterministicResult?.success);

  // Misconception-aware hint selection.
  //
  // When the learner has actually submitted work and a verified expected answer
  // exists, classify the observable error and address *that*, instead of returning
  // the nth rung of a positional ladder. The targeted guidance is prepended to the
  // ordinary positional hint so existing behaviour is preserved when there is no
  // submitted work to analyse.
  let misconception: MisconceptionState | null = null;
  let targetedPrefix = '';
  const submitted = (userAnswer ?? '').trim();
  const expected = deterministicResult?.success ? String(deterministicResult.result) : null;
  if (submitted && expected && (activeProblem || prompt)) {
    const problem = activeProblem || deterministicResult?.expression || prompt;
    const evidence = classifyMisconception({ problem, learnerAnswer: submitted, expected });
    // A submission that matches the verified result is not a misconception, so no
    // hint targeting is generated for it. The ordinary positional hint still runs.
    if (evidence.matchedRule !== 'correct') {
      misconception = createMisconceptionState(topic || problemContext?.topic || 'General', evidence);
      const hint = selectTargetedHint({
        state: misconception,
        previousRung: level - 1,
        // Rung 5 is the only level permitted to reveal the result, and only the
        // verified deterministic value is ever revealed.
        mayRevealAnswer: level === 5,
      });
      targetedPrefix = [
        `Observed pattern — ${hint.title}.`,
        hint.body,
        hint.followUp.prompt,
      ].join('\n\n');
    }
  }

  if (!hasProblem) {
    return {
      answer: phrases.askForProblem,
      steps: [phrases.askForProblem],
      formula: null,
      misconception: null,
    };
  }

  if (level === 5) {
    const verifiedAnswer = deterministicResult?.success
      ? deterministicResult.result
      : problemContext?.authoritativeResult;
if (!verifiedAnswer) {
      return {
        answer: `${phrases.nextStep} I do not have a verified solution to reveal. Send the full problem so I can check it with the deterministic math engine.`,
        steps: [],
        formula: deterministicResult?.formula || null,
        misconception,
      };
    }
    const solutionSteps = steps.filter((step) => step.trim());
    const renderedSteps = solutionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
    const answer = `${phrases.completeSolution}\n${renderedSteps}${renderedSteps ? '\n' : ''}${verifiedAnswer}`;
    return { answer, steps: solutionSteps, formula: deterministicResult?.formula || null, misconception };
  }

  // Levels 1–4 are hints only; the final derivation line is reserved for level 5.
  const revealable = steps.length > 1 ? steps.slice(0, -1) : [];
  const chosen = revealable[Math.min(level - 1, Math.max(revealable.length - 1, 0))] ?? null;

  const problem = activeProblem || deterministicResult?.expression || prompt;
  // The targeted, evidence-based guidance leads, because it addresses the actual
  // error rather than the nth rung of a ladder. The positional hint follows as
  // supporting detail.
  const lines: string[] = [problem ? `${phrases.start} $${problem}$` : phrases.start];

  if (targetedPrefix) {
    lines.push('', targetedPrefix);
  }

  if (chosen) {
    lines.push('', phrases.nextStep, chosen);
  } else {
    lines.push('', phrases.nextStep, 'Identify what the question is actually asking you to find, then choose the inverse operation that undoes the last step.');
  }

  if (level >= 3 && revealable.length > 1) {
    const extra = revealable.slice(level).filter(Boolean);
    if (extra.length) {
      lines.push('', phrases.firstError, `Avoid jumping ahead of: ${extra[0]}`);
    }
  }

  return {
    answer: lines.join('\n'),
    steps: chosen ? [chosen] : [],
    formula: deterministicResult?.formula || null,
    misconception,
  };
}

/**
 * Checks a learner's submitted answer or working against the deterministic solution.
 *
 * Distinguishes three cases that the old placeholder collapsed into one:
 * an incomplete expression, a wrong answer, and correct work.
 */
function buildCheckWorkOfflineResponse(
  prompt: string,
  options: {
    problemContext?: Partial<MathProblemContext>;
    deterministicResult: MathToolResult | null;
    userAnswer?: string;
    language: string;
  },
): { answer: string; steps: string[]; formula: string | null; verification: 'correct' | 'incorrect' | 'incomplete' | 'unverified' } {
  const phrases = modePhrases(options.language);
  const submitted = (options.userAnswer ?? prompt).trim();
  const deterministic = options.deterministicResult;

  const activeProblem = options.problemContext?.canonicalExpression || options.problemContext?.rawProblem || '';
  const expected =
    deterministic?.success && deterministic.result
      ? deterministic.result
      : options.problemContext?.authoritativeResult;

  // Case 1: nothing usable was submitted.
  if (!submitted) {
    return { answer: phrases.pasteWork, steps: [], formula: null, verification: 'incomplete' };
  }

  // Case 2: the submission is not a usable mathematical expression.
  if (looksIncomplete(submitted)) {
    return { answer: phrases.notComplete, steps: [], formula: null, verification: 'incomplete' };
  }

  // Case 3: there is no verified answer to compare against, so do not claim one.
  if (!expected) {
    return {
      answer: `${phrases.pasteWork}\n\nNo deterministic solution is available for this yet, so I cannot confirm the value. Send the full problem and I will check it with the math engine.`,
      steps: [],
      formula: null,
      verification: 'unverified',
    };
  }

  const normalizedSubmitted = normalizeLearnerAnswer(submitted);
  const normalizedExpected = normalizeLearnerAnswer(expected);
  const extractedNumbers = (value: string): number[] => (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const isCorrect =
    normalizedSubmitted === normalizedExpected ||
    extractedNumbers(submitted).length === 1 &&
      extractedNumbers(submitted)[0] === extractedNumbers(expected)[0];

  if (isCorrect) {
    return {
      answer: `${phrases.correct}\n\n${phrases.result}: **${expected}**\n\n${(deterministic?.derivationSteps ?? []).map((s) => `- ${s}`).join('\n')}`,
      steps: deterministic?.derivationSteps ?? [],
      formula: deterministic?.formula ?? null,
      verification: 'correct',
    };
  }

  // Case 4: wrong answer. Show the verified value and the correct chain, and name the
  // first step that departs from it. Steps are only quoted when the engine produced
  // them, so a learner's work is never invented.
  const chain = deterministic?.derivationSteps ?? [];
  const firstIncorrectStep = findFirstIncorrectEquationStep(
    submitted,
    activeProblem,
    expected,
  );
  const firstErrorLine = firstIncorrectStep
    ? `\n\n${phrases.firstIncorrect} ${firstIncorrectStep}\n${phrases.correctionNote}`
    : '';

  return {
    answer: `${phrases.wrong}\n\n${phrases.result}: **${expected}**\n\nCorrect steps:${chain.map((s) => `- ${s}`).join('\n')}${firstErrorLine}`,
    steps: chain,
    formula: deterministic?.formula ?? null,
    verification: 'incorrect',
  };
}

/** Strips a trailing sentence so an answer statement is recognised as such. */
function trimTrailingSentence(value: string): string {
  return String(value ?? '').split(/[.،。\n]/)[0].trim();
}

/**
 * Recovers the ORIGINAL problem from a learner's submitted working.
 *
 * Working such as "2x + 5 = 15, so 2x = 20, so x = 10" embeds the problem before the
 * learner's (wrong) transformations. This returns the first solvable equation in the
 * text so the answer can be checked against the actual question, not against itself.
 */
function recoverProblemFromWorking(text: string): string | null {
  const segments = String(text ?? '')
    .split(/,|\bso\b|\bthus\b|\bthen\b|\bi get\b|\bwhich gives\b|،|और|لےکن/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    // A bare "x = 10" is the learner's answer, not the problem. Skip those.
    if (/^\s*[a-z]\s*=\s*-?\d+(?:\.\d+)?\s*$/i.test(segment)) continue;
    const candidate = extractEquationCandidate(segment);
    if (candidate && candidate.includes('=') && /[a-z]/i.test(candidate)) {
      if (toolSolveEquation({ equation: candidate }).success) return candidate;
    }
  }
  return null;
}

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

function buildOfflineFollowUpResponse(
  prompt: string,
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>,
): { answer: string; steps: string[]; formula: string | null } | null {
  if (!isTutorFollowUpPrompt(prompt)) return null;
  const previousAssistant = [...conversation].reverse().find((turn) => turn.role === 'assistant' && turn.content.trim());
  const previousUser = [...conversation].reverse().find((turn) => turn.role === 'user' && turn.content.trim());
  if (!previousAssistant || !previousUser) return null;

  const question = previousUser.content.slice(-300);
  const answer = previousAssistant.content.slice(-1200);

  // "Why?" / "How?" after a computed answer is answered with the deterministic
  // derivation steps that were actually applied to that answer. This reuses
  // already-computed engine output instead of asking the learner to rephrase,
  // and it can never introduce a new, unverified claim.
  const wantsReasoning = /\b(why|reason|how (did|does|do))\b/i.test(prompt.trim());
  const stepLines = previousAssistant.content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^-\s/.test(line) || /^\d+\.\s/.test(line));
  if (wantsReasoning && stepLines.length > 0) {
    return {
      answer: `Here is the reasoning behind my previous answer, using the steps that were actually applied:\n\n${stepLines.map((line) => `> ${line}`).join('\n')}\n\nThe first lines are the rule and the substitution; each later line follows from the one before it. Tell me which line you would like expanded.`,
      steps: ['Reused the deterministic derivation steps already computed for the previous answer.'],
      formula: null,
    };
  }

  return {
    answer: `You are following up on “${question}”. My previous answer said:\n\n> ${answer.replace(/\n/g, '\n> ')}\n\nWhich line or step would you like me to explain? I do not want to guess which detail you mean.`,
    steps: ['Used the most recent user question and Tutor response as bounded conversation context.'],
    formula: null,
  };
}

function buildConceptualOfflineResponse(
  prompt: string,
  topic: MathTopic,
  language: string,
  groundingContext: string,
): { answer: string; steps: string[]; formula: string | null } | null {
  const normalized = prompt.trim();
  // `\b` is ASCII-only ([A-Za-z0-9_]), so word-boundary anchors never match Arabic,
  // Devanagari or CJK text. Use non-boundary alternation so non-Latin concept words
  // ("سمجھاؤ", "شرح", "什么是") are detected like their Latin counterparts.
  const conceptIntent = /explain|teach|teaching|learn|understand|meaning of|define|concept|samjhao|سمجھاؤ|سمجھا|شرح|تعليم|تعريف|什么是|erklär|erklär|was ist|expliqu|explíc|spieg|это|что такое|oysa|nedir|anlat|aczik|açıkla|định nghĩa|định\ nghĩa|-defin|defin|significa|signifier|spiega|co to|什么是/i.test(normalized)
    || /why|how|how does|why does|become|when|what happens/i.test(normalized)
    || /alg[eèé]bra|alg[eèé]bre|algebra|جبرا|الجبرا|代數|代数|알gebra|алгебр|де алгебра/i.test(normalized)
    || /variable|equation|expression|linear|quadratic|متغیر|مساوات|معادله|متغير|方程|variabel|gleichung|équation|ecuación|equação|equazione|vergelijking|równanie|rovnice|egyenlet|denklem|denkleme|persamaan|变数|変数|변수|переменн/i.test(normalized)
    || /derivative|differentiation|rate of change|deriv|integrate|integral|integration|antiderivative|calculus|pythagorean|theorem|function|slope|limit/i.test(normalized)
    // Multilingual concept aliases: "مشتق", "المشتق", "미적분", "dérivée",
    // "导数" ... must reach the same concept answer as their English
    // equivalents. Gated on a minimal length so an empty or punctuation-only
    // prompt cannot resolve every alias at once.
    || (normalized.length >= 3 && resolveMultilingualConceptIds(normalized).length > 0);

  if (!conceptIntent) {
    return null;
  }

  const knowledge = retrieveMathematicsKnowledge({ query: normalized, topic, language, limit: 3 });
  const primaryConcept = knowledge.primaryConcept;
  const actualTopic = primaryConcept?.topic || topic;
  const actualConcept = primaryConcept?.concept || actualTopic;
  const definition = primaryConcept?.definition ?? `${actualTopic} is a branch of mathematics.`;
  const formula = primaryConcept?.formulas?.[0];
  const example = primaryConcept?.examples?.[0];
  // Answer in the language of the learner's own words when they are not
  // English, otherwise in the requested language. The old script-based check
  // here treated every Arabic-script prompt as Urdu, so an Arabic question
  // would have received Urdu terminology.
  // An explicitly requested language wins. Auto-detection is only a fallback for when the caller
  // did not ask for one -- previously detection always won, so selecting a language in the UI
  // silently had no effect on the answer.
  const requestedLanguage = language?.split(/[-_]/)[0]?.toLowerCase();
  const detectedLanguage = detectLanguage(normalized);
  // Precedence: an EXPLICIT non-default language wins, then a non-English detection, then the
  // caller's language. A default 'en' must not outrank detection, or a script-detected Urdu
  // prompt that carries no explicit language is answered in English.
  const answerLanguage =
    requestedLanguage && requestedLanguage !== 'en'
      ? requestedLanguage
      : (detectedLanguage && detectedLanguage !== 'en' ? detectedLanguage : (requestedLanguage || language));

  if (answerLanguage === 'ur') {
    const exampleLine = example
      ? `مثال: ${example.problem} → ${example.solution}`
      : formula ? `مثال: ${formula}` : '';
    // Name the concept in Urdu as well as English: the canonical definition is English,
    // but an Urdu answer must carry the Urdu mathematical terminology for it.
    const localizedTerms = getLocalizedTermsForConcept(
      primaryConcept?.id ?? '',
      /^ur($|[-_])/i.test(language) ? language : 'ur',
      actualTopic,
    );
    const terminologyLine = localizedTerms.length
      ? `اہم اصطلاح: ${localizedTerms.slice(0, 3).join('، ')}\n\n`
      : '';
    return {
      answer: `${langTemplateAnswer(answerLanguage)}\n\n${actualConcept}\n\n${terminologyLine}${definition}\n\n${formula ? `ایک اہم فارمولہ: ${formula}\n\n` : ''}${exampleLine ? `${exampleLine}\n\n` : ''}یہ تصور ریاضی میں بنیادی اہمیت رکھتا ہے۔`,
      steps: primaryConcept?.solutionStrategies?.slice(0, 3) || [
        'اصول کو سمجھیں۔',
        'فارمولوں کا استعمال کریں۔',
        'مثالوں کے ذریعے مشق کریں۔',
      ],
      formula: formula || null,
    };
  }

  // Arabic shares a script with Urdu but not the language: it gets its own
  // branch so an Arabic question never carries Urdu terminology.
  if (answerLanguage === 'ar') {
    const exampleLine = example
      ? `مثال: ${example.problem} → ${example.solution}`
      : formula ? `مثال: ${formula}` : '';
    const localizedTerms = getLocalizedTermsForConcept(
      primaryConcept?.id ?? '',
      answerLanguage,
      actualTopic,
    );
    const terminologyLine = localizedTerms.length
      ? `المصطلحات الأساسية: ${localizedTerms.slice(0, 3).join('، ')}\n\n`
      : '';
    return {
      answer: `${langTemplateAnswer(answerLanguage)}\n\n${actualConcept}\n\n${terminologyLine}${definition}\n\n${formula ? `الصيغة الأساسية: ${formula}\n\n` : ''}${exampleLine ? `${exampleLine}\n\n` : ''}يمكنك تجربة هذا المثال ببعض التعديلات.`,
      steps: primaryConcept?.solutionStrategies?.slice(0, 3) || [
        'افهم التعريف.',
        'استخدم الصيغ المناسبة.',
        'تدرّب بالأمثلة.',
      ],
      formula: formula || null,
    };
  }

  const exampleLine = example
    ? `Example: ${example.problem} → ${example.solution}`
    : formula ? `Example: ${formula}` : '';

  return {
    answer: `${getLanguageTemplate(answerLanguage).answerLabel || 'ANSWER:'}\n\n${actualConcept}\n\n${definition}\n\n${formula ? `Key formula: ${formula}\n\n` : ''}${exampleLine ? `${exampleLine}\n\n` : ''}${primaryConcept?.solutionStrategies?.slice(0, 2).join('. ') || 'Practice with examples to build understanding.'}`,
    steps: primaryConcept?.solutionStrategies?.slice(0, 3) || [
      'Understand the definition.',
      'Apply the relevant formulas.',
      'Practice with examples.',
    ],
    formula: formula || null,
  };
}

function langTemplateAnswer(language: string): string {
  const template = getLanguageTemplate(language);
  return template.answerLabel || 'ANSWER:';
}

/**
 * Renders a deterministic result as LaTeX. When the engine's expression is already an
 * equation (for example `2x + 5 = 15`) the result is attached with an implication
 * arrow, so the renderer never emits the false claim `2x + 5 = 15 = 5`.
 */
function renderVerifiedResult(expression: string, result: string): string {
  const value = String(expression || '').trim();
  return value.includes('=') ? `$${value} \\Rightarrow ${result}$` : `$${value} = ${result}$`;
}

/**
 * Renders a deterministic result according to what the engine actually claims.
 *
 * A derivative claim prints as d/dx(f) = f'(x) — never as `f(x) = f'(x)`,
 * which would be a false equation. A result with no symbolic derivative is a
 * labelled point estimate, so it says exactly that instead of asserting an
 * equality that is not true.
 */
function renderClaimResult(result: MathToolResult, expression: string): string {
  const source = String(expression || '').trim();
  if (result.metadata?.symbolicSupported === false) {
    const reason = typeof result.metadata?.unsupportedReason === 'string'
      ? result.metadata.unsupportedReason
      : 'the expression is outside the symbolic rule set';
    const at = String(result.metadata?.atPoint ?? 0);
    return `**No derivative function is claimed.** d/dx(${source}) cannot be expressed symbolically: ${reason}. `
      + `As a labelled point estimate only, the numerical derivative at x = ${at} is ${result.result}.`;
  }
  if (result.toolName === 'derivative') {
    return `$\\frac{d}{dx}\\left(${source}\\right) = ${result.result}$`;
  }
  return renderVerifiedResult(source, result.result);
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
  verification: VerificationOutcome,
  langTemplate: any
): { answer: string; steps: string[]; formula: string | null } {
  if (!deterministicResult?.success || verification.state !== 'VERIFIED') {
    return {
      answer: `I cannot provide a verified step-by-step result for "${prompt}" because the deterministic calculation did not produce an independently verified answer.`,
      steps: [],
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
    documentContext,
    userAnswer,
  } = options;
  const topic = normalizeMathTopic(requestedTopic, prompt, currentExpression);

  // Resolve active functional tutor mode
  const effectiveMode: FunctionalTutorMode =
    mode || (socraticMode ? 'socratic' : 'assistant');
  const intent = classifyMathematicalIntent(prompt);

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
        verification: unavailable('No problem was provided, so there is no mathematical claim to verify.'),
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
  const extracted = extractMathProblem(prompt, { context: conversation.map((turn) => turn.content) });
  let deterministicResult: MathToolResult | null = null;
  /**
   * What the engine actually computed, and from which source text.
   *
   * Verification needs this: an equation is checked by substituting its roots back
   * in, while a calculation is re-derived exactly. Without recording the source,
   * "verified" would degrade into a guess about which check applies.
   */
  let deterministicClaim: { kind: 'calculation' | 'equation' | 'derivative'; source: string } | null = null;

  switch (extracted.kind) {
    case 'calculate':
      // Is this a derivative request? The keyword set must cover the languages the
      // Tutor claims to answer: Urdu and Arabic write "مشتق" (musttariq) for
      // "derivative", so a Latin-only test made every non-English derivative
      // request fall through to a plain calculation or a conceptual answer.
      if (/derivative|differentiat|d\/dx|مشتق|مشتقة|اشتقاق/i.test(prompt)) {
        deterministicResult = toolDerivative({ expression: extracted.expression ?? '' });
        // Only a symbolic f'(x) becomes a verifiable claim. When the form has
        // no symbolic derivative the tool returns a labelled point estimate;
        // claiming that as "the derivative" would repeat the old f'(0)-as-f'(x) bug.
        if (deterministicResult.metadata?.symbolicSupported === true) {
          deterministicClaim = { kind: 'derivative', source: extracted.expression ?? '' };
        }
      } else {
        deterministicResult = toolCalculate({ expression: extracted.expression ?? '' });
        deterministicClaim = { kind: 'calculation', source: extracted.expression ?? '' };
      }
      break;
    case 'solveEquation':
      deterministicResult = toolSolveEquation({ equation: extracted.equation ?? '' });
      deterministicClaim = { kind: 'equation', source: extracted.equation ?? '' };
      break;
    case 'integrate':
      deterministicResult = toolIntegrate({
        fnExpr: extracted.fnExpr ?? '',
        a: extracted.a ?? 0,
        b: extracted.b ?? 1,
      });
      // An antiderivative is not a single scalar claim, so it is not independently
      // re-derivable here. Recorded as a calculation so the state is honest rather
      // than silently absent.
      deterministicClaim = { kind: 'calculation', source: extracted.fnExpr ?? '' };
      break;
  }

  // Fallback 1: Direct equation or calculation attempt if problem extractor did not yield a result
  if (!deterministicResult || !deterministicResult.success) {
    const cleaned = prompt
      .replace(/^(?:what\s+is|calculate|compute|evaluate|find|solve)\s+/i, '')
      .replace(/[?]+$/, '')
      .trim();

    // Natural-language wrappers ("solve for x in 2x + 5 = 15") leave filler text around
    // the equation, which the solver rejects. Recover the equation-shaped substring
    // before attempting, so the deterministic engine stays authoritative. The raw text
    // stays the final candidate because the solver already tolerates some wrapping
    // (for example Urdu phrasing around a Latin equation).
    const equationCandidate = extractEquationCandidate(cleaned) || cleaned;

    if (equationCandidate.includes('=') && /[a-zA-Z]/.test(equationCandidate)) {
      const eqAttempt = toolSolveEquation({ equation: equationCandidate });
      if (eqAttempt.success) {
        deterministicResult = eqAttempt;
        deterministicClaim = { kind: 'equation', source: equationCandidate };
      }
    } else if (cleaned) {
      const calcAttempt = toolCalculate({ expression: cleaned });
      if (calcAttempt.success) {
        deterministicResult = calcAttempt;
        deterministicClaim = { kind: 'calculation', source: cleaned };
      }
    }
  }

  // Fallback 2: Active calculator expression if prompt had no match. An attached
  // document takes precedence over stale calculator state unless the prompt itself
  // contains an explicit calculable expression (handled above).
  if (!documentContext && (!deterministicResult || !deterministicResult.success) && currentExpression && currentExpression.trim()) {
    const calc = toolCalculate({ expression: currentExpression });
    if (calc.success) {
      deterministicResult = calc;
      deterministicClaim = { kind: 'calculation', source: currentExpression };
    }
  }

  // Fallback 3: in checking modes the prompt is the learner's ANSWER, not the problem.
  // Solving "x = 7" would "verify" 7 and wrongly confirm a wrong answer. Re-solve the
  // active problem instead so the comparison is against the real question.
  const isCheckingMode = effectiveMode === 'check-work' || effectiveMode === 'review' || effectiveMode === 'solver-review';
  if (isCheckingMode) {
    const activeProblem = problemContext?.canonicalExpression || problemContext?.rawProblem;
    if (activeProblem && activeProblem.trim()) {
      const activeCandidate = extractEquationCandidate(activeProblem) || activeProblem;
      if (activeCandidate.includes('=')) {
        const activeSolve = toolSolveEquation({ equation: activeCandidate });
        if (activeSolve.success) {
          deterministicResult = activeSolve;
          deterministicClaim = { kind: 'equation', source: activeCandidate };
        }
      } else if (activeCandidate.trim()) {
        const activeCalc = toolCalculate({ expression: activeCandidate });
        if (activeCalc.success) {
          deterministicResult = activeCalc;
          deterministicClaim = { kind: 'calculation', source: activeCandidate };
        }
      }
    } else {
      // No stored problem. Submitted WORK may still embed the problem, as in
      // "2x + 5 = 15, so 2x = 20, so x = 10". Recover a genuine problem equation from
      // it, but never treat a bare answer ("x = 7") as the problem to verify, because
      // that would only prove the answer against itself.
      const submittedText = userAnswer ?? prompt;
      const isTrivialAnswer = /^\s*[a-z]\s*=\s*-?\d+(?:\.\d+)?\s*$/i.test(trimTrailingSentence(submittedText));
      const embedded = isTrivialAnswer ? null : recoverProblemFromWorking(submittedText);
      if (embedded) {
        const embeddedSolve = toolSolveEquation({ equation: embedded });
        if (embeddedSolve.success) {
          deterministicResult = embeddedSolve;
          deterministicClaim = { kind: 'equation', source: embedded };
        }
      }
      if (!embedded) {
        // The prompt itself may STATE the problem while the submitted answer sits in
        // userAnswer ("2x + 5 = 15" checked against "x = 5"). A non-trivial equation in
        // the prompt is the question, so re-solve it as the authority.
        const promptStatesProblem = prompt.includes('=')
          && !/^\s*[a-z]\s*=\s*-?\d+(?:\.\d+)?\s*$/i.test(trimTrailingSentence(prompt));
        if (promptStatesProblem) {
          const promptCandidate = extractEquationCandidate(prompt) || prompt;
          const promptSolve = toolSolveEquation({ equation: promptCandidate });
          if (promptSolve.success) {
            deterministicResult = promptSolve;
            deterministicClaim = { kind: 'equation', source: promptCandidate };
          } else {
            deterministicResult = null;
            deterministicClaim = null;
          }
        } else if (deterministicClaim?.kind === 'calculation' && deterministicResult?.success) {
          // A pure arithmetic prompt ("2 + 3") was recomputed by the engine from the
          // stated expression. That is an independent computation of the problem, not
          // the learner's answer proving itself, so the honest result is kept.
        } else {
          // A bare answer ("x = 7") or unparseable working. Any result here came from
          // the learner's own answer and proves nothing on its own.
          deterministicResult = null;
          deterministicClaim = null;
        }
      }
    }
  }

  const hasDeterministicAuthority = Boolean(
    deterministicResult && deterministicResult.success
  );
  const authoritativeValue = deterministicResult?.result || null;

  // --------------------------------------------------------------------------
  // Independent verification
  // --------------------------------------------------------------------------
  // This is the step that makes "verified" mean something. The engine above
  // produced a value; a *separate* code path re-derives it and the two are
  // compared. `isVerified` below is derived from the resulting state rather than
  // from the engine merely having succeeded.
  const verification: VerificationOutcome = (() => {
    if (!hasDeterministicAuthority || !deterministicResult || !deterministicClaim) {
      return verifyUnsupported(prompt);
    }
    const reported = String(deterministicResult.result);
    if (deterministicClaim.kind === 'equation') {
      // A solver may report several roots; each one is substituted back in.
      const roots = reported
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      return verifyEquation(deterministicClaim.source, roots);
    }
    if (deterministicClaim.kind === 'derivative') {
      // The claim is a derivative FUNCTION; it is spot-checked against a
      // central difference of the source expression, not re-evaluated as a value.
      return verifyDerivative(deterministicClaim.source, reported);
    }
    return verifyCalculation(deterministicClaim.source, reported);
  })();
  const isIndependentlyVerified = verification.state === 'VERIFIED';

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
  /**
   * The observable misconception detected from the learner's submitted work, when a
   * hint was requested and the submission could be classified. Null otherwise — an
   * unclassifiable submission is never turned into an invented misconception here.
   */
  let activeMisconception: MisconceptionState | null = null;
    let documentPagesUsed: number[] | undefined;
    let documentProvenance: string | undefined;
    let documentResponseSource: 'document-grounded' | 'document-insufficient-evidence' | undefined;

    const conceptResponse = buildConceptualOfflineResponse(prompt, topic, language, groundingContext);
    const followUpResponse = buildOfflineFollowUpResponse(prompt, conversation);

    // Routing when a document is attached:
    //   1. A verified deterministic result always wins (numerical authority).
    //   2. Otherwise answer from the document, admitting when evidence is missing.
    const hasVerifiedMath = Boolean(deterministicResult?.success);
    if (documentContext && !hasVerifiedMath) {
      const documentAnswer = buildDocumentGroundedResponse(prompt, documentContext, language);
      documentPagesUsed = documentAnswer.pagesUsed;
      documentProvenance = documentAnswer.provenance;
      documentResponseSource = documentAnswer.grounded ? 'document-grounded' : 'document-insufficient-evidence';
      groundingSources.push(`document:${documentContext.fileName}`);
      offlineAnswerData = {
        answer: documentAnswer.answer,
        steps: documentAnswer.steps,
        formula: documentAnswer.formula,
      };
    } else if (effectiveMode === 'socratic') {
      offlineAnswerData = buildSocraticOfflineResponse(prompt, extracted, deterministicResult);
    } else if (effectiveMode === 'step-by-step') {
      offlineAnswerData = buildStepByStepOfflineResponse(prompt, deterministicResult, verification, langTemplate);
    } else if (effectiveMode === 'quiz') {
      offlineAnswerData = buildQuizOfflineResponse(prompt, topic, difficulty, deterministicResult);
    } else if (effectiveMode === 'hint') {
      const hint = buildHintOfflineResponse(prompt, problemContext, deterministicResult, hintLevel, language, userAnswer, topic);
      offlineAnswerData = { answer: hint.answer, steps: hint.steps, formula: hint.formula };
      activeMisconception = hint.misconception;
    } else if (effectiveMode === 'check-work' || effectiveMode === 'review' || effectiveMode === 'solver-review') {
      const review = buildCheckWorkOfflineResponse(prompt, {
        problemContext,
        deterministicResult,
        userAnswer: userAnswer ?? prompt,
        language,
      });
      // The deterministic engine, not this review, is the authority for the value.
      offlineAnswerData = { answer: review.answer, steps: review.steps, formula: review.formula };
    } else if (intent === 'GREETING') {
      offlineAnswerData = {
        answer: 'Hello! I am Calcora’s math tutor. I can help calculate expressions, solve supported equations, explain math concepts, check work, and guide you through practice. What are you working on?',
        steps: [],
        formula: null,
      };
    } else if (intent === 'PRODUCT_CAPABILITIES') {
      offlineAnswerData = {
        answer: 'Calcora is a mathematics workbench with a scientific calculator, equation solving, graphing, calculus, matrices, statistics, unit conversion, and a local math tutor. I can explain concepts, guide steps, check supported work, and offer practice or quizzes. A result is marked verified only when the deterministic math engine and its independent check agree.',
        steps: [],
        formula: null,
      };
    } else if (deterministicResult && deterministicResult.success && conceptResponse) {
      // Mixed request: calculation + explanation
      // Combine the verified result with the conceptual explanation
      const calcPart = `${langTemplate.answerLabel} ${deterministicResult.result}\n\n${renderClaimResult(deterministicResult, deterministicResult.expression || prompt)}\n\n${(deterministicResult.derivationSteps || []).map((s) => `- ${s}`).join('\n')}`;
      const conceptPart = conceptResponse.answer;
      offlineAnswerData = {
        answer: `${calcPart}\n\n---\n\n${conceptPart}`,
        steps: [...(deterministicResult.steps || deterministicResult.derivationSteps || []), ...conceptResponse.steps],
        formula: deterministicResult.formula || conceptResponse.formula,
      };
    } else if (deterministicResult && deterministicResult.success) {
      // A verified deterministic result outranks the generic concept explainer: when the
      // prompt also contains an equation ("میں 2x + 5 = 15 سمجھاؤ"), the user asked for that
      // equation to be solved, not for an overview of algebra.
      // A point estimate has no true "equals" headline, and a derivative claim
      // already renders as its own d/dx equation, so neither repeats a value line
      // that would read as `f(x) = f'(x)`.
      const pointEstimateOnly = deterministicResult.metadata?.symbolicSupported === false;
      const isDerivativeClaim = deterministicResult.toolName === 'derivative';
      const headline = pointEstimateOnly ? '' : `${langTemplate.answerLabel} ${deterministicResult.result}\n\n`;
      const directPhrase = pointEstimateOnly || isDerivativeClaim
        ? ''
        : `\n\n${langTemplate.directAnswerPhrase(deterministicResult.expression || prompt, deterministicResult.result)}`;
      offlineAnswerData = {
        answer: `${headline}${renderClaimResult(deterministicResult, deterministicResult.expression || prompt)}${directPhrase}\n\n${(deterministicResult.derivationSteps || []).map((s) => `- ${s}`).join('\n')}`,
        steps: deterministicResult.steps || deterministicResult.derivationSteps || [],
        formula: deterministicResult.formula || null,
      };
    } else if (followUpResponse) {
      offlineAnswerData = followUpResponse;
    } else if (conceptResponse) {
      offlineAnswerData = conceptResponse;
    } else {
      // Reached only when nothing could be computed and nothing could be explained.
      // The old copy here claimed results were "100% verified", which was false in
      // exactly this branch: there is no deterministic result to verify. The state
      // reported alongside this answer is UNAVAILABLE, and the wording now says so.
      offlineAnswerData = {
        answer: `Deterministic Math Tutor is active.\n\nQuery: "${prompt}"\n\n`
          + 'No deterministic result could be produced for this request, so there is nothing to verify. '
          + 'Calcora will not present an unverified value as a result. Try an equation, an arithmetic '
          + 'expression, or a percentage calculation.',
        steps: [
          'Input analyzed deterministically.',
          'No computable mathematical claim was found, so no result was produced.',
        ],
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
        isVerified: isIndependentlyVerified,
        authoritativeResult: authoritativeValue,
        exactResult: deterministicResult?.exactResult,
        derivationSteps: deterministicResult?.derivationSteps || [],
        confidence: isIndependentlyVerified ? 1.0 : 0,
        method: hasDeterministicAuthority
          ? 'Deterministic AST/RPN Evaluator'
          : 'None',
        verification,
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
      misconception: activeMisconception,
      executionTimeMs: Math.round(performance.now() - t0),
      fallbackStatus: options.offlineOnly ? 'offline-deterministic-fallback' : 'gemini-unavailable',
      responseSource: documentResponseSource ?? 'deterministic-fallback',
      documentProvenance,
      documentPagesUsed,
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

${multilingualKnowledgeInstruction}

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
      fallbackData = buildStepByStepOfflineResponse(prompt, deterministicResult, verification, langTemplate);
    } else if (effectiveMode === 'quiz') {
      fallbackData = buildQuizOfflineResponse(prompt, topic, difficulty, deterministicResult);
    } else if (deterministicResult && deterministicResult.success) {
      const pointEstimateOnly = deterministicResult.metadata?.symbolicSupported === false;
      fallbackData = {
        answer: `${pointEstimateOnly ? '' : `${langTemplate.answerLabel} ${deterministicResult.result}\n\n`}${renderClaimResult(deterministicResult, deterministicResult.expression || prompt)}`,
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
          verification: unavailable(
            'The Tutor could not produce a response, so no mathematical result is available to verify.',
          ),
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
        isVerified: isIndependentlyVerified,
        authoritativeResult: authoritativeValue,
        exactResult: deterministicResult?.exactResult,
        derivationSteps: deterministicResult?.derivationSteps || [],
        confidence: isIndependentlyVerified ? 1.0 : 0,
        method: hasDeterministicAuthority
          ? 'Deterministic AST/RPN Evaluator'
          : 'None',
        verification,
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
      isVerified: isIndependentlyVerified,
      authoritativeResult: authoritativeValue,
      exactResult: deterministicResult?.exactResult,
      derivationSteps: deterministicResult?.derivationSteps || [],
      confidence: isIndependentlyVerified ? 1.0 : 0,
      method: hasDeterministicAuthority
        ? 'Deterministic AST/RPN Evaluator'
        : 'None',
      verification,
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
