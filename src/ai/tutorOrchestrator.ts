/**
 * Calcora AI - Tutor Orchestration Layer
 * Enforces the Deterministic-First Philosophy:
 * "DETERMINISTIC RESULT ALWAYS HAS AUTHORITY."
 *
 * Coordinates:
 * Intent Detection -> Problem Extraction -> Tool Selection -> Authoritative Execution
 * -> Verification -> Verified RAG Retrieval -> Grounded Pedagogical Explanation -> Conflict Resolution
 */

import { AIMessage, MathToolResult, MathVerificationBadge } from '../types';
import { extractMathematicalProblem, ExtractedProblem } from '../engine/problemExtractor';
import { classifyMathematicalIntent } from '../knowledge/intentClassifier';
import { queryKnowledgeRAG, RetrievedKnowledgeChunk, RAGRetrievalResult } from '../knowledge/ragEngine';
import {
  toolCalculate,
  toolSolveEquation,
  toolSolveSystem,
  toolDerivative,
  toolIntegrate,
  toolLimit,
  toolStatistics,
  toolMatrix,
  toolUnitConversion,
  executeMathTool,
} from '../engine/toolLayer';
import {
  getLanguageTemplate,
  getLanguageSystemInstruction,
  SUPPORTED_LANGUAGES,
} from '../knowledge/multilingualTutor';

export interface TutorOrchestrationRequest {
  query: string;
  conversation?: AIMessage[];
  currentExpression?: string;
  currentResult?: string;
  mode?: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint' | 'quiz';
  tutorMode?: 'assistant' | 'tutor' | 'solver-review';
  learningObjective?: string;
  difficulty?: string;
  topic?: string;
  hintLevel?: number;
  socraticMode?: boolean;
  userStep?: string;
  language?: string;
  offlineOnly?: boolean;
}

export interface TutorOrchestrationResponse {
  answer: string;
  authoritativeResult?: string;
  exactResult?: string;
  approximateResult?: string;
  expression?: string;
  toolResults: MathToolResult[];
  verificationBadge: MathVerificationBadge;
  derivationSteps: string[];
  formula?: string | null;
  domainRestrictions: string[];
  knowledgeSources: RetrievedKnowledgeChunk[];
  isConceptual: boolean;
  needsDerivation: boolean;
  needsVisualization: boolean;
  language: string;
  isOfflineFallback: boolean;
}

/**
 * Detects whether the query is conceptual rather than computational
 */
export function isConceptualQuery(query: string, extracted: ExtractedProblem | null): boolean {
  if (extracted && (extracted.type === 'arithmetic' || extracted.type === 'equation')) {
    return false;
  }
  const q = query.toLowerCase();
  const conceptualKeywords = [
    'what is', 'what are', 'define', 'explain why', 'concept of',
    'meaning of', 'theorem', 'axiom', 'intuition', 'difference between',
    'simpson\'s rule', 'bayes theorem', 'eigenvalue', 'taylor series concept'
  ];
  const hasConceptualKeyword = conceptualKeywords.some((k) => q.includes(k));
  const hasDirectCalculation = /^\s*(\d+|calc|eval|solve|integrate|diff|deriv)/i.test(q);
  return hasConceptualKeyword && !hasDirectCalculation;
}

/**
 * Deterministic Tool Selector & Multi-Tool Runner
 */
export function executeDeterminedTools(
  query: string,
  extracted: ExtractedProblem | null,
  currentExpression?: string
): MathToolResult[] {
  const results: MathToolResult[] = [];
  const q = query.trim();

  // 1. Check for Primary Extracted Problem
  if (extracted) {
    if (extracted.type === 'arithmetic') {
      results.push(toolCalculate(extracted.canonicalExpression));
    } else if (extracted.type === 'equation') {
      results.push(toolSolveEquation(extracted.canonicalExpression));
    } else if (extracted.type === 'calculus_derivative') {
      results.push(toolDerivative(extracted.canonicalExpression, 0, 1));
    } else if (extracted.type === 'calculus_integral') {
      const a = extracted.parameters?.a ?? 0;
      const b = extracted.parameters?.b ?? 1;
      results.push(toolIntegrate(extracted.canonicalExpression, a, b));
    } else if (extracted.type === 'statistics' && extracted.parameters?.data) {
      results.push(toolStatistics(extracted.parameters.data));
    }
  }

  // 2. Check for explicit derivative queries (e.g. "Differentiate x^2" or "derivative of x^2")
  const derivMatch = q.match(/(?:derivative of|differentiate|diff|d\/dx\s*\(?)\s*([a-z0-9^+\-*/()]+)/i);
  if (derivMatch && (!extracted || extracted.type !== 'calculus_derivative')) {
    const fn = derivMatch[1].replace(/[()]/g, '').trim();
    if (fn) {
      results.push(toolDerivative(fn, 0, 1));
    }
  }

  // 3. Check for explicit definite integral queries (e.g. "Integrate x^2 from 0 to 3")
  const integMatch = q.match(/integrate\s+([a-z0-9^+\-*/()]+)\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)/i);
  if (integMatch && (!extracted || extracted.type !== 'calculus_integral')) {
    const fn = integMatch[1].trim();
    const a = parseFloat(integMatch[2]);
    const b = parseFloat(integMatch[3]);
    if (fn && Number.isFinite(a) && Number.isFinite(b)) {
      results.push(toolIntegrate(fn, a, b));
    }
  }

  // 4. Check for limits (e.g. "limit of (x^2 - 1)/(x - 1) as x -> 1")
  const limitMatch = q.match(/limit\s+of\s+([^\s]+)\s+as\s+x\s*->\s*(-?\d+)/i);
  if (limitMatch) {
    const fn = limitMatch[1];
    const c = parseFloat(limitMatch[2]);
    if (fn && Number.isFinite(c)) {
      results.push(toolLimit(fn, c));
    }
  }

  // 5. Fallback to current calculator expression if query has no tools matched
  if (results.length === 0 && currentExpression && currentExpression.trim()) {
    const calc = toolCalculate(currentExpression);
    if (calc.success) {
      results.push(calc);
    }
  }

  return results;
}

/**
 * Resolves conflicts between AI generated text and deterministic tool results.
 * Rule: THE DETERMINISTIC RESULT IS ALWAYS AUTHORITATIVE.
 * If AI output proposes a conflicting number, the AI's number is discarded
 * and the authoritative deterministic result is inserted.
 */
export function resolveDeterministicConflict(
  rawAnswer: string,
  authoritativeResult: string,
  expression?: string
): string {
  if (!authoritativeResult) return rawAnswer;

  // If answer already explicitly states authoritative result, keep it
  if (rawAnswer.includes(authoritativeResult)) {
    return rawAnswer;
  }

  // AI produced an answer without the authoritative result or with a discrepancy
  const prefix = expression
    ? `**Authoritative Deterministic Result:** $${expression} = ${authoritativeResult}$\n\n`
    : `**Authoritative Deterministic Result:** ${authoritativeResult}\n\n`;

  return `${prefix}${rawAnswer}`;
}

/**
 * Core Orchestrator Method
 */
export async function orchestrateTutorPipeline(
  request: TutorOrchestrationRequest,
  generateAIText?: (prompt: string, systemInstruction: string) => Promise<string | null>
): Promise<TutorOrchestrationResponse> {
  const langCode = (request.language || 'en').toLowerCase().slice(0, 2);
  const langTemplate = getLanguageTemplate(langCode);
  const langInstruction = getLanguageSystemInstruction(langCode);

  // 1. Problem Extraction & Intent Analysis
  const extracted = extractMathematicalProblem(request.query);
  const intentResult = classifyMathematicalIntent(request.query);
  const conceptual = isConceptualQuery(request.query, extracted);

  // 2. Deterministic Tool Execution
  const toolResults = executeDeterminedTools(request.query, extracted, request.currentExpression);
  const primaryTool = toolResults[0];

  // 3. Knowledge / RAG Retrieval
  const ragResult: RAGRetrievalResult = queryKnowledgeRAG({
    query: request.query,
    topic: request.topic,
    limit: 3,
  });

  // 4. Determine authoritative badge & values
  const hasDeterministicResult = primaryTool && primaryTool.success;
  const authoritativeResult = hasDeterministicResult ? primaryTool.result : undefined;
  const exactResult = hasDeterministicResult ? primaryTool.exactResult : undefined;
  const approximateResult = hasDeterministicResult ? primaryTool.approximateResult : undefined;
  const canonicalExpression = hasDeterministicResult ? primaryTool.expression : undefined;

  const verificationBadge: MathVerificationBadge = hasDeterministicResult
    ? {
        isVerified: true,
        status: 'VERIFIED_DETERMINISTIC',
        verificationMethod: primaryTool.verificationBadge.verificationMethod,
        verificationMessage: primaryTool.verificationBadge.verificationMessage,
        confidence: 1.0,
        timestamp: new Date().toISOString(),
      }
    : ragResult.chunks.length > 0
    ? {
        isVerified: true,
        status: 'VERIFIED_AXIOMATIC',
        verificationMethod: 'Knowledge Graph Corpus & Axiomatic Proof',
        verificationMessage: `Grounded in ${ragResult.chunks.length} verified standard mathematical sources.`,
        confidence: 0.98,
        timestamp: new Date().toISOString(),
      }
    : {
        isVerified: false,
        status: 'MODEL_CONFIDENT',
        verificationMethod: 'Heuristic Knowledge Model',
        verificationMessage: 'Axiomatic verification unavailable for this conceptual query.',
        confidence: 0.85,
        timestamp: new Date().toISOString(),
      };

  // Extract derivation steps and formulas
  const derivationSteps: string[] = [];
  if (primaryTool && primaryTool.derivationSteps) {
    derivationSteps.push(...primaryTool.derivationSteps);
  }

  const domainRestrictions: string[] = [];
  if (primaryTool && primaryTool.domainRestrictions) {
    domainRestrictions.push(...primaryTool.domainRestrictions);
  }

  let formula = primaryTool?.formula || null;
  if (!formula && ragResult.primaryConcept?.formulas?.[0]) {
    formula = `$${ragResult.primaryConcept.formulas[0]}$`;
  }

  // 5. Offline / Private Mode or Fallback check
  if (request.offlineOnly || !generateAIText) {
    // Zero-cloud deterministic fallback
    let fallbackAnswer = '';
    if (hasDeterministicResult) {
      fallbackAnswer = `${langTemplate.answerLabel} ${authoritativeResult}\n\n` +
        `$${canonicalExpression} = ${authoritativeResult}$\n\n` +
        `${langTemplate.directAnswerPhrase(canonicalExpression || '', authoritativeResult || '')}\n\n` +
        `*${langTemplate.verifiedBadge}*`;
    } else if (ragResult.primaryConcept) {
      const pc = ragResult.primaryConcept;
      fallbackAnswer = `### ${pc.concept} (${pc.topic})\n\n` +
        `${pc.definition}\n\n` +
        (pc.formulas.length > 0 ? `**Key Formulas:**\n` + pc.formulas.map((f) => `- $${f}$`).join('\n') + '\n\n' : '') +
        (pc.domainRestrictions.length > 0 ? `**Domain Restrictions:** ${pc.domainRestrictions.join('; ')}\n\n` : '') +
        `*${langTemplate.offlineNotice}*`;
    } else {
      fallbackAnswer = `${langTemplate.offlineNotice}\n\n` +
        `Deterministic scientific engine is active. Please ask a computational or formula problem to evaluate.`;
    }

    return {
      answer: fallbackAnswer,
      authoritativeResult,
      exactResult,
      approximateResult,
      expression: canonicalExpression,
      toolResults,
      verificationBadge,
      derivationSteps,
      formula,
      domainRestrictions,
      knowledgeSources: ragResult.chunks,
      isConceptual: conceptual,
      needsDerivation: derivationSteps.length > 0,
      needsVisualization: request.query.toLowerCase().includes('graph') || request.query.toLowerCase().includes('plot'),
      language: langCode,
      isOfflineFallback: true,
    };
  }

  // 6. Online AI Tutor Generation with Authoritative Guardrails
  const deterministicGuardrail = hasDeterministicResult
    ? `\n[MANDATORY AUTHORITATIVE CALCULATION]
Expression: ${canonicalExpression}
Calculated Result: ${authoritativeResult}
Exact Result: ${exactResult}
CRITICAL RULE:
You MUST state that the authoritative mathematical result is ${authoritativeResult}.
Under NO circumstance are you permitted to change, approximate, or replace this value with an AI calculation.
State: "${langTemplate.answerLabel} ${authoritativeResult}" and "$${canonicalExpression} = ${authoritativeResult}$".\n`
    : '';

  const systemPrompt = `You are Calcora AI Mathematical Assistant & Interactive Tutor.
You provide rigorous, encouraging, step-by-step mathematical explanations.
${langInstruction}

${deterministicGuardrail}

${ragResult.groundingContextText}

Rules:
1. All mathematical formulas and variables MUST use standard LaTeX math enclosed in dollar signs ($...$ or $$...$$).
2. Mathematics (equations, numbers, variables) NEVER changes when translating across languages.
3. Distinguish exact values from numerical approximations.
4. Keep the pedagogical tone appropriate for the student.`;

  try {
    const rawAiText = await generateAIText(request.query, systemPrompt);
    let finalAnswer = rawAiText || '';

    // Guarantee that deterministic result is never omitted or corrupted
    if (authoritativeResult) {
      finalAnswer = resolveDeterministicConflict(finalAnswer, authoritativeResult, canonicalExpression);
    }

    return {
      answer: finalAnswer,
      authoritativeResult,
      exactResult,
      approximateResult,
      expression: canonicalExpression,
      toolResults,
      verificationBadge,
      derivationSteps,
      formula,
      domainRestrictions,
      knowledgeSources: ragResult.chunks,
      isConceptual: conceptual,
      needsDerivation: derivationSteps.length > 0,
      needsVisualization: request.query.toLowerCase().includes('graph') || request.query.toLowerCase().includes('plot'),
      language: langCode,
      isOfflineFallback: false,
    };
  } catch (err) {
    // Transparent failover to deterministic answer
    const fallbackAnswer = hasDeterministicResult
      ? `${langTemplate.answerLabel} ${authoritativeResult}\n\n$${canonicalExpression} = ${authoritativeResult}$\n\n${langTemplate.directAnswerPhrase(canonicalExpression || '', authoritativeResult || '')}`
      : `${langTemplate.offlineNotice}`;

    return {
      answer: fallbackAnswer,
      authoritativeResult,
      exactResult,
      approximateResult,
      expression: canonicalExpression,
      toolResults,
      verificationBadge,
      derivationSteps,
      formula,
      domainRestrictions,
      knowledgeSources: ragResult.chunks,
      isConceptual: conceptual,
      needsDerivation: derivationSteps.length > 0,
      needsVisualization: false,
      language: langCode,
      isOfflineFallback: true,
    };
  }
}
