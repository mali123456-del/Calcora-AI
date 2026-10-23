/**
 * AI Provider Client & Math Handshake Verifier
 * Communicates with server-side /api/ai/math endpoint.
 * Enforces deterministic verification and an explicit private/offline fail-closed boundary.
 */

import { AIMessage, QuizQuestion } from '../types';
import { calculateExpression } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';
import { generateCalculationExplanation } from '../engine/stepExplainer';
import { checkUserStep } from '../utils/aiTutor';
import { detectMathAudience, type MathAudienceProfile } from '../knowledge/mathematics/audienceProfiles';
import { getOfflinePolicy, type PrivacyMode } from './offlinePolicy';
import { parseSseFrames } from './mathSseProtocol';
import { detectLanguageFromText } from '../services/multilingualTutorKnowledge';
import { activeDocumentToContext } from '../services/activeDocument';
import { selectRelevantChunks, toPagePayload } from '../services/documentContext';
import { VERIFICATION_STATES, unverified, type VerificationOutcome } from '../verification/verificationStates';
import { verifyCalculation, verifyEquation, verifyUnsupported } from '../verification/independentVerifier';

export interface AIResponse {
  answer: string;
  expression?: string | null;
  steps?: string[];
  formula?: string | null;
  isVerified?: boolean;
  verificationNote?: string;
  /** Canonical four-state verification. Authoritative for the badge when present. */
  verification?: VerificationOutcome;
  isOfflineFallback?: boolean;
  blockedCloudFallback?: boolean;
  responseSource?: 'gemini' | 'local-deterministic' | 'local-model' | 'document-grounded' | 'document-insufficient-evidence';
  providerMessage?: string;
  verifiedResult?: string;
}

/**
 * Accept a verification payload only if it is well formed.
 *
 * A malformed or absent payload yields `null` rather than a fabricated state, so the
 * caller falls back to an explicitly derived state instead of trusting bad data. The
 * state string is validated against the published enum, so an unexpected value from a
 * future server cannot render as an arbitrary badge.
 */
export function normalizeServerVerification(raw: unknown): VerificationOutcome | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<VerificationOutcome>;
  if (!candidate.state || !(VERIFICATION_STATES as readonly string[]).includes(candidate.state)) return null;
  return {
    state: candidate.state,
    method: (typeof candidate.method === 'string' ? candidate.method : 'none') as VerificationOutcome['method'],
    reason: typeof candidate.reason === 'string' && candidate.reason.trim() ? candidate.reason : 'No verification detail was provided.',
    actual: typeof candidate.actual === 'string' ? candidate.actual : null,
    independent: typeof candidate.independent === 'string' ? candidate.independent : null,
    checkedAt: typeof candidate.checkedAt === 'number' ? candidate.checkedAt : Date.now(),
  };
}

export function isLocalCalcoraOrigin(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1') return true;
  const octets = host.split('.').map(Number);
  return octets.length === 4 && octets[0] === 127 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255);
}

/**
 * Legacy-shaped handshake helper.
 *
 * Before Wave 1 this re-ran the same engine and then declared the result verified,
 * which is self-confirmation rather than verification. It now computes a value and
 * hands it to the independent verifier, so `isVerified` reflects a genuine
 * re-derivation. The `verification` field carries the canonical four-state outcome.
 */
export function verifyWithDeterministicEngine(expression?: string | null): { isVerified: boolean; verificationNote: string; verifiedResult?: string; verification: VerificationOutcome } {
  if (!expression || !expression.trim()) {
    const outcome = verifyUnsupported(expression ?? '');
    return { isVerified: false, verificationNote: outcome.reason, verification: outcome };
  }
  try {
    const calc = calculateExpression(expression);
    if (!calc.error && Number.isFinite(calc.value)) {
      const outcome = verifyCalculation(expression, calc.display);
      return {
        isVerified: outcome.state === 'VERIFIED',
        verificationNote: outcome.reason,
        verifiedResult: calc.display,
        verification: outcome,
      };
    }
  } catch {}
  try {
    const equation = solveEquation(expression);
    if (equation.isValid && equation.solutions.length > 0) {
      const roots = equation.solutions.map((s) => String(s).trim()).filter((s) => s.length > 0);
      const outcome = verifyEquation(expression, roots);
      return {
        isVerified: outcome.state === 'VERIFIED',
        verificationNote: outcome.reason,
        verifiedResult: equation.solutions.join(', '),
        verification: outcome,
      };
    }
  } catch {}
  const fallback = verifyUnsupported(expression);
  return { isVerified: false, verificationNote: fallback.reason, verification: fallback };
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
  /** Opaque model ID returned by Calcora's local model discovery endpoint. */
  localModelId?: string;
  /**
   * Upper bound, in milliseconds, on the Tutor request. Defaults to
   * {@link AI_REQUEST_TIMEOUT_MS}. The request must always be bounded: an unbounded
   * `fetch` leaves the caller awaiting forever, so neither the panel's `catch` nor its
   * `finally` can run and the prompt input stays disabled for the rest of the session.
   */
  requestTimeoutMs?: number;
  /**
   * Framing a caller-driven stop, e.g. a Stop button in the assistant panel.
   * Aborting this signal aborts the underlying fetch immediately instead of
   * waiting for the timeout ceiling, so a hung request never traps the UI in a
   * loading state. A stopped request never reports an AI answer.
   */
  abortSignal?: AbortSignal;
}

/**
 * Default ceiling for a single Tutor request. It sits above the backend's own worst
 * case (`CALCORA_LOCAL_MODEL_TIMEOUT_MS`, 180000 ms) so a legitimate slow on-device
 * answer is never cut off, while a wedged backend can no longer hang the UI forever.
 */
export const AI_REQUEST_TIMEOUT_MS = 200_000;

/** Names the abort so the catch can report a timeout rather than a transport failure. */
function isTimeoutError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/** Resolved request context shared by the JSON and SSE transports of the Tutor API. */
interface AiMathRequestContext {
  prompt: string;
  conversation: AIMessage[];
  currentExpression?: string;
  currentResult?: string;
  mode: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint';
  tutorOptions: TutoringRequestOptions;
  audienceProfile: MathAudienceProfile;
  language: string;
  responseProfile: string;
  offlineOnly: boolean;
  documentContext: ReturnType<typeof activeDocumentToContext>;
  deterministicVerification: ReturnType<typeof verifyWithDeterministicEngine> | undefined;
}

/** Identical request body for /api/ai/math and /api/ai/math/stream. */
function buildAiMathRequestBody(ctx: AiMathRequestContext): string {
  const boundedConversation = Array.isArray(ctx.conversation)
    ? ctx.conversation.slice(-6).map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: String(message.content ?? '').slice(-3000),
      }))
    : [];
  return JSON.stringify({
    prompt: ctx.prompt,
    conversation: boundedConversation,
    currentExpression: ctx.currentExpression,
    currentResult: ctx.currentResult,
    mode: ctx.mode,
    tutorMode: ctx.tutorOptions.tutorMode || 'assistant',
    learningObjective: ctx.tutorOptions.learningObjective || 'concept',
    difficulty: ctx.tutorOptions.difficulty || 'intermediate',
    topic: ctx.tutorOptions.topic || 'Algebra',
    hintLevel: ctx.tutorOptions.hintLevel || 1,
    socraticMode: ctx.tutorOptions.socraticMode || false,
    userStep: ctx.tutorOptions.userStep,
    groundingContext: ctx.tutorOptions.groundingContext,
    groundedConcepts: ctx.tutorOptions.groundedConcepts,
    audienceProfile: ctx.audienceProfile,
    deterministicVerification: ctx.deterministicVerification,
    language: ctx.language,
    responseProfile: ctx.responseProfile,
    offlineOnly: ctx.offlineOnly,
    localModelId: ctx.offlineOnly && !ctx.documentContext && typeof ctx.tutorOptions.localModelId === 'string' && /^gguf-[a-f0-9]{16}$/.test(ctx.tutorOptions.localModelId) ? ctx.tutorOptions.localModelId : undefined,
    document: ctx.documentContext ? { fileName: ctx.documentContext.fileName, pageCount: ctx.documentContext.pageCount, selectedPageCount: ctx.documentContext.pages.length, hasText: ctx.documentContext.hasText, needsOcr: ctx.documentContext.needsOcr, pages: toPagePayload(ctx.documentContext, selectRelevantChunks(ctx.documentContext, ctx.prompt)) } : null,
  });
}

/** One mapping is authoritative for both transports: verification state wins. */
function mapServerPayloadToAIResponse(data: Record<string, unknown>, tutorMode?: string): AIResponse {
  const concealsFinal = ['socratic', 'hint', 'quiz', 'challenge', 'exam'].includes(String(tutorMode ?? ''));
  const rawExpr = typeof data.expression === 'string' && data.expression ? data.expression : null;
  const serverVerification = normalizeServerVerification(data.verification) ?? undefined;
  const reportedResult = typeof data.deterministicResult === 'string' ? data.deterministicResult : undefined;
  const legacyVerification = rawExpr && reportedResult
    ? rawExpr.includes('=')
      ? verifyEquation(rawExpr, reportedResult.split(',').map((root: string) => root.trim()).filter(Boolean))
      : verifyCalculation(rawExpr, reportedResult)
    : undefined;
  const verification = serverVerification
    ?? legacyVerification
    ?? unverified('The server response did not include a checkable deterministic result.');
  const serverVerified = Boolean(reportedResult) && verification.state === 'VERIFIED';
  const verifiedResult = serverVerified ? reportedResult : undefined;
  const answer = serverVerified && !concealsFinal
    ? `${verifiedResult}${typeof data.answer === 'string' && data.answer ? `\n\n${data.answer}` : ''}`
    : (typeof data.answer === 'string' && data.answer ? data.answer : 'Response received');
  const meta = data.meta as { responseSource?: unknown } | undefined;
  const groundedSource = meta?.responseSource === 'document-grounded' || meta?.responseSource === 'document-insufficient-evidence'
    ? (meta.responseSource as AIResponse['responseSource'])
    : undefined;
  const responseSource = groundedSource
    ?? (meta?.responseSource === 'local-model' ? 'local-model' as const : undefined)
    ?? (data.geminiState === 'GEMINI_CONFIGURED' ? 'gemini' as const : data.isOfflineFallback ? 'local-deterministic' as const : undefined);
  const serverVerifiedSteps = serverVerified && Array.isArray(data.deterministicSteps) && (data.deterministicSteps as unknown[]).length
    ? (data.deterministicSteps as string[]).concat(Array.isArray(data.steps) ? (data.steps as string[]) : [])
    : Array.isArray(data.steps) ? (data.steps as string[]) : [];
  return {
    answer,
    expression: rawExpr,
    steps: serverVerifiedSteps,
    formula: (data.formula || null) as string | null,
    isVerified: verification.state === 'VERIFIED',
    verificationNote: verification.reason,
    verification,
    verifiedResult,
    isOfflineFallback: Boolean(data.isOfflineFallback),
    responseSource,
    providerMessage: typeof data.providerMessage === 'string' ? data.providerMessage : undefined,
  };
}

export async function askAIMathAssistant(prompt: string, conversation: AIMessage[] = [], currentExpression?: string, currentResult?: string, mode: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint' = 'explain', tutorOptions: TutoringRequestOptions = {}): Promise<AIResponse> {
  const audienceProfile = tutorOptions.audienceProfile || detectMathAudience(prompt);
  const language = tutorOptions.language || detectLanguageFromText(prompt);
  const verificationExpression = currentExpression || extractEquationCandidate(prompt);
  const deterministicVerification = verificationExpression ? verifyWithDeterministicEngine(verificationExpression) : undefined;
  const privacy = getOfflinePolicy(tutorOptions.privacyMode);
  const responseProfile = tutorOptions.responseProfile || 'balanced';

  // Private/offline requests still use Calcora's local API so they receive the same
  // deterministic Tutor, knowledge retrieval and page-aware PDF grounding. The server
  // is explicitly instructed not to call a cloud provider.
  const offlineOnly = !privacy.allowCloudAI;

  // Page-aware text from an attached document, if one is loaded. Only the selected
  // pages travel, and only to Calcora's own backend.
  const documentContext = activeDocumentToContext();
  const localOrigin = typeof window === 'undefined' || isLocalCalcoraOrigin(window.location.hostname);
  if (!localOrigin && (offlineOnly || documentContext)) {
    return {
      answer: documentContext
        ? `This document stays on your device. Document tutoring is unavailable from this hosted origin, so its text was not sent to any server or AI provider.`
        : fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions).answer,
      steps: [],
      isVerified: false,
      blockedCloudFallback: true,
      verificationNote: 'Local-only requests are blocked on non-loopback origins. No prompt or document text was sent.',
      isOfflineFallback: true,
      responseSource: documentContext ? 'document-insufficient-evidence' : 'local-deterministic',
      providerMessage: 'Local-only requests are enforced; no cloud provider was contacted.',
    };
  }
  const requestContext: AiMathRequestContext = {
    prompt,
    conversation,
    currentExpression,
    currentResult,
    mode,
    tutorOptions,
    audienceProfile,
    language,
    responseProfile,
    offlineOnly,
    documentContext,
    deterministicVerification,
  };

  const requestTimeoutMs =
    typeof tutorOptions.requestTimeoutMs === 'number' && tutorOptions.requestTimeoutMs > 0
      ? tutorOptions.requestTimeoutMs
      : AI_REQUEST_TIMEOUT_MS;

  // Bound the request. Without this the promise below never settles when the backend
  // wedges, so the UI stays disabled indefinitely instead of falling back.
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), requestTimeoutMs);
  const externalSignal = tutorOptions.abortSignal;
  const onExternalAbort = () => abortController.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const res = await fetch('/api/ai/math', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: buildAiMathRequestBody(requestContext),
      });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server responded with HTTP ${res.status}`);
    const data = await res.json();
    // The server's canonical outcome wins over its legacy boolean and any client-side
    // handshake. A result may be surfaced as verified only when that outcome is VERIFIED.
    return mapServerPayloadToAIResponse(data, tutorOptions.tutorMode);
  } catch (error) {
    // A caller stop and the timeout ceiling both surface as AbortError, so the
    // caller's own signal decides which one happened; the error name cannot.
    if (externalSignal?.aborted) {
      // The caller stopped the request. Do not substitute a fallback answer: the
      // user asked for nothing to be produced, so be explicit that nothing arrived.
      return {
        answer: 'You stopped this request before it answered. No AI provider was read from and nothing else was computed.',
        steps: [],
        isVerified: false,
        verificationNote: 'Request stopped by the user before any AI response arrived.',
        isOfflineFallback: false,
        providerMessage: 'Request stopped by you. No AI provider returned a response.',
      };
    }
    const timedOut = isTimeoutError(error);
    console.warn(
      timedOut
        ? `AI Tutor request timed out after ${requestTimeoutMs} ms; using the local deterministic fallback.`
        : 'AI API call failed; using the local deterministic fallback.',
    );
    const fallback = fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions);
    const status = error instanceof Error ? error.message.match(/HTTP (\d{3})/)?.[1] : undefined;
    const statusDetail = status ? ` (HTTP ${status})` : '';
    if (timedOut) {
      // Never imply an AI answered: nothing did. Name the bound so the stall is legible.
      return {
        ...fallback,
        providerMessage: privacy.allowCloudAI
          ? `The Tutor request timed out after ${requestTimeoutMs} ms and was stopped waiting. The response below was computed by Calcora's deterministic engine; no AI provider answered.`
          : `Private/Offline mode is active. The Tutor request timed out after ${requestTimeoutMs} ms and was stopped waiting; only Calcora's deterministic engine produced the response below.`,
      };
    }
    return {
      ...fallback,
      providerMessage: privacy.allowCloudAI
        ? `Gemini or the local Tutor API could not be reached${statusDetail}. The response below came from Calcora's client-side deterministic fallback; no cloud response was received.`
        : 'Private/Offline mode is active. The local Tutor API could not be reached; only the client-side deterministic fallback was used.',
    };
  } finally {
    clearTimeout(timeoutHandle);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Streaming twin of askAIMathAssistant against /api/ai/math/stream.
 *
 * Identical request contract, privacy guards, stop handling and fallback
 * behaviour; only the transport differs. `delta` frames carry a growing prefix
 * of the answer text and are PROVISIONAL — they are reported through `onDelta`
 * for display only and never treated as a verified result. The final `result`
 * frame carries the exact payload the JSON endpoint returns and goes through
 * the same verification-authoritative mapping, so streaming can never loosen
 * the deterministic-verification pipeline.
 */
export async function askAIMathAssistantStream(
  prompt: string,
  conversation: AIMessage[] = [],
  currentExpression?: string,
  currentResult?: string,
  mode: 'explain' | 'solve' | 'teach' | 'verify' | 'practice' | 'hint' = 'explain',
  tutorOptions: TutoringRequestOptions = {},
  onDelta?: (partialAnswer: string) => void,
): Promise<AIResponse> {
  const audienceProfile = tutorOptions.audienceProfile || detectMathAudience(prompt);
  const language = tutorOptions.language || detectLanguageFromText(prompt);
  const verificationExpression = currentExpression || extractEquationCandidate(prompt);
  const deterministicVerification = verificationExpression ? verifyWithDeterministicEngine(verificationExpression) : undefined;
  const privacy = getOfflinePolicy(tutorOptions.privacyMode);
  const responseProfile = tutorOptions.responseProfile || 'balanced';
  const offlineOnly = !privacy.allowCloudAI;
  const documentContext = activeDocumentToContext();
  const localOrigin = typeof window === 'undefined' || isLocalCalcoraOrigin(window.location.hostname);
  if (!localOrigin && (offlineOnly || documentContext)) {
    return {
      answer: documentContext
        ? `This document stays on your device. Document tutoring is unavailable from this hosted origin, so its text was not sent to any server or AI provider.`
        : fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions).answer,
      steps: [],
      isVerified: false,
      blockedCloudFallback: true,
      verificationNote: 'Local-only requests are blocked on non-loopback origins. No prompt or document text was sent.',
      isOfflineFallback: true,
      responseSource: documentContext ? 'document-insufficient-evidence' : 'local-deterministic',
      providerMessage: 'Local-only requests are enforced; no cloud provider was contacted.',
    };
  }

  const requestTimeoutMs =
    typeof tutorOptions.requestTimeoutMs === 'number' && tutorOptions.requestTimeoutMs > 0
      ? tutorOptions.requestTimeoutMs
      : AI_REQUEST_TIMEOUT_MS;

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), requestTimeoutMs);
  const externalSignal = tutorOptions.abortSignal;
  const onExternalAbort = () => abortController.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  // A streaming upstream that stalls mid-generation must still end after 60 s
  // without data, instead of holding the connection for the full ceiling.
  const STREAM_IDLE_TIMEOUT_MS = 60_000;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const resetIdleTimer = (): void => {
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => abortController.abort(), STREAM_IDLE_TIMEOUT_MS);
  };
  const clearIdleTimer = (): void => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  try {
    const res = await fetch('/api/ai/math/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abortController.signal,
      body: buildAiMathRequestBody({
        prompt,
        conversation,
        currentExpression,
        currentResult,
        mode,
        tutorOptions,
        audienceProfile,
        language,
        responseProfile,
        offlineOnly,
        documentContext,
        deterministicVerification,
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server responded with HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      // Older backend without the streaming endpoint: payload shape is identical
      // to the JSON endpoint, so the same authoritative mapping applies.
      const data = await res.json();
      return mapServerPayloadToAIResponse(data, tutorOptions.tutorMode);
    }
    if (!res.body) throw new Error('Streaming is not supported in this environment');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let applied = '';
    let streamedError: unknown = null;
    let resultPayload: unknown = null;
    resetIdleTimer();
    for (;;) {
      const { done, value } = await reader.read();
      resetIdleTimer();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      const { frames, rest } = parseSseFrames(buffer);
      buffer = rest;
      for (const frame of frames) {
        if (frame.event === 'delta') {
          const chunk = typeof JSON.parse(frame.data) === 'string' ? String(JSON.parse(frame.data)) : '';
          applied += chunk;
          onDelta?.(applied);
        } else if (frame.event === 'result') {
          resultPayload = JSON.parse(frame.data);
          // The verified final answer supersedes everything provisional.
          clearIdleTimer();
        } else if (frame.event === 'error') {
          streamedError = JSON.parse(frame.data) ?? frame.data;
        }
      }
    }
    clearIdleTimer();
    // The final result frame is authoritative and fully verified.
    if (resultPayload) return mapServerPayloadToAIResponse(resultPayload as Record<string, unknown>, tutorOptions.tutorMode);
    if (streamedError) {
      throw new Error(`Server streamed an error payload: ${JSON.stringify(streamedError)}`);
    }
    throw new Error('The streaming response ended without a verified result');
  } catch (error) {
    // A caller stop and the timeout ceiling both surface as AbortError, so the
    // caller's own signal decides which one happened; the error name cannot.
    if (externalSignal?.aborted) {
      return {
        answer: 'You stopped this request before it answered. No AI provider was read from and nothing else was computed.',
        steps: [],
        isVerified: false,
        verificationNote: 'Request stopped by the user before any AI response arrived.',
        isOfflineFallback: false,
        providerMessage: 'Request stopped by you. No AI provider returned a response.',
      };
    }
    const timedOut = isTimeoutError(error);
    console.warn(
      timedOut
        ? `AI Tutor stream stalled or exceeded ${requestTimeoutMs} ms; using the local deterministic fallback.`
        : 'AI streaming call failed; using the local deterministic fallback.',
    );
    const fallback = fallbackLocalMathTutor(prompt, currentExpression, currentResult, tutorOptions);
    const status = error instanceof Error ? error.message.match(/HTTP (\d{3})/)?.[1] : undefined;
    const statusDetail = status ? ` (HTTP ${status})` : '';
    if (timedOut) {
      return {
        ...fallback,
        providerMessage: privacy.allowCloudAI
          ? `The Tutor stream stalled or exceeded ${requestTimeoutMs} ms and was stopped waiting. The response below was computed by Calcora's deterministic engine; no AI provider answered.`
          : `Private/Offline mode is active. The Tutor stream stalled or exceeded ${requestTimeoutMs} ms and was stopped waiting; only Calcora's deterministic engine produced the response below.`,
      };
    }
    return {
      ...fallback,
      providerMessage: privacy.allowCloudAI
        ? `Gemini or the local Tutor API could not be reached on the streaming path${statusDetail}. The response below came from Calcora's client-side deterministic fallback; no cloud response was received.`
        : 'Private/Offline mode is active. The local Tutor API could not be reached on the streaming path; only the client-side deterministic fallback was used.',
    };
  } finally {
    clearIdleTimer();
    clearTimeout(timeoutHandle);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

function fallbackLocalMathTutor(prompt: string, currentExpression?: string, currentResult?: string, tutorOptions: TutoringRequestOptions = {}): AIResponse {
  const p = prompt.trim();
  const { hintLevel = 1, userStep } = tutorOptions;
  if (userStep?.trim()) {
    const stepCheck = currentExpression?.trim()
      ? checkUserStep(currentExpression, userStep)
      : null;
    return {
      answer: stepCheck?.feedback ?? 'I cannot verify this step without the original problem. Include the equation you are working on, or use the Tutor step checker with an active problem.',
      steps: stepCheck ? [stepCheck.feedback, ...(stepCheck.suggestedNextStep ? [stepCheck.suggestedNextStep] : [])] : [],
      isVerified: Boolean(stepCheck?.deterministicVerified && stepCheck.isEquivalent),
      verificationNote: stepCheck?.deterministicVerified
        ? 'Step compared with the active problem by Calcora deterministic checks.'
        : 'The original problem is required for deterministic step verification. No cloud fallback was used.',
      isOfflineFallback: true,
    };
  }
  if (p.toLowerCase().includes('solve') || p.includes('=')) {
    const equation = p.replace(/solve/i, '').trim();
    const eqRes = solveEquation(equation);
    if (eqRes.isValid) {
      const roots = eqRes.solutions.map((root: number) => String(root).trim()).filter(Boolean);
      // A solved equation is verified by substituting its roots back into the equation.
      // Checking the root against the value of the whole left-hand side would mark a
      // correct solution UNVERIFIED (x = 5 against 2x + 5 = 15), so that comparison is
      // only valid when the expression has no '=' to solve for.
      const eqVerification = equation.includes('=')
        ? verifyEquation(equation, roots)
        : verifyCalculation(equation, eqRes.solutions.join(', '));
      const isVerified = eqVerification.state === 'VERIFIED';
      return { answer: eqRes.explanation, steps: eqRes.steps, formula: eqRes.type === 'quadratic' ? 'x = (-b ± √(b² - 4ac)) / (2a)' : 'ax + b = 0 ⇒ x = -b/a', isVerified, verificationNote: isVerified ? `Each root was substituted back into ${equation}.` : eqVerification.reason, verification: eqVerification, verifiedResult: isVerified ? eqRes.solutions.join(', ') : undefined, isOfflineFallback: true };
    }
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
    const explVerification = verifyCalculation(currentExpression, calculateExpression(currentExpression).display);
    return { answer: `Explanation for ${currentExpression}:`, steps: expl.steps.map(s => `${s.operation} → ${s.result}`), expression: currentExpression, isVerified: explVerification.state === 'VERIFIED', verificationNote: explVerification.reason, verification: explVerification, isOfflineFallback: true };
  }
  const calc = calculateExpression(p);
  if (!calc.error && Number.isFinite(calc.value)) { const calcVerification = verifyCalculation(p, calc.display); return { answer: `Deterministic evaluation: ${p} = ${calc.display}`, expression: p, steps: ['Parsed mathematical tokens safely without eval()', 'Evaluated via Reverse Polish Notation (Shunting-Yard)', `Final numerical value: ${calc.display}`], isVerified: calcVerification.state === 'VERIFIED', verificationNote: calcVerification.reason, verification: calcVerification, isOfflineFallback: true }; }
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
