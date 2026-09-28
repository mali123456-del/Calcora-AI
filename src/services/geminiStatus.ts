export type GeminiState =
  | 'GEMINI_CONFIGURED'
  | 'GEMINI_NOT_CONFIGURED'
  | 'GEMINI_INVALID_KEY'
  | 'GEMINI_UNAUTHORIZED'
  | 'GEMINI_FORBIDDEN'
  | 'GEMINI_RATE_LIMITED'
  | 'GEMINI_QUOTA_EXCEEDED'
  | 'GEMINI_NETWORK_ERROR'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_SERVER_ERROR'
  | 'GEMINI_MODEL_UNAVAILABLE'
  | 'GEMINI_SAFETY_BLOCK'
  | 'GEMINI_MALFORMED_RESPONSE'
  | 'GEMINI_EMPTY_RESPONSE'
  | 'GEMINI_LEAKED_OR_BLOCKED_KEY'
  | 'GEMINI_UNKNOWN_ERROR';

export interface GeminiErrorClassification {
  state: GeminiState;
  userMessage: string;
  allowFallback: boolean;
  retryable: boolean;
}

const SAFE_MESSAGES: Record<GeminiState, string> = {
  GEMINI_CONFIGURED: 'Gemini is configured.',
  GEMINI_NOT_CONFIGURED: 'Gemini AI is not configured. Deterministic calculator mode remains available.',
  GEMINI_INVALID_KEY: 'Gemini API authentication failed. Check the configured Gemini credential.',
  GEMINI_UNAUTHORIZED: 'Gemini rejected the authentication credentials.',
  GEMINI_FORBIDDEN: 'Gemini access was denied for the configured credential or project.',
  GEMINI_RATE_LIMITED: 'Gemini rate limit reached. Please try again shortly.',
  GEMINI_QUOTA_EXCEEDED: 'Gemini quota has been exhausted. Deterministic calculator mode remains available.',
  GEMINI_NETWORK_ERROR: 'Gemini could not be reached because of a network error.',
  GEMINI_TIMEOUT: 'Gemini request timed out. Please try again.',
  GEMINI_SERVER_ERROR: 'Gemini is temporarily unavailable.',
  GEMINI_MODEL_UNAVAILABLE: 'The configured Gemini model is unavailable.',
  GEMINI_SAFETY_BLOCK: 'Gemini blocked the response under its safety policy.',
  GEMINI_MALFORMED_RESPONSE: 'Gemini returned a response Calcora could not validate.',
  GEMINI_EMPTY_RESPONSE: 'Gemini returned an empty response.',
  GEMINI_LEAKED_OR_BLOCKED_KEY: 'The Gemini credential appears to be blocked or revoked. Replace it with a valid credential.',
  GEMINI_UNKNOWN_ERROR: 'Gemini AI is temporarily unavailable. Deterministic calculator mode remains available.',
};

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return ''; }
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as Record<string, unknown>;
  const candidates = [value.status, value.statusCode, (value.error as Record<string, unknown> | undefined)?.code];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) return Number(candidate);
  }
  return undefined;
}

export function classifyGeminiError(error: unknown): GeminiErrorClassification {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  const status = statusOf(error);

  if (/AIza[0-9a-z_-]{20,}/i.test(message) || /leaked|leak.?detected|revoked.*key|key.*revoked|blocked.*key|key.*blocked/i.test(message)) {
    return { state: 'GEMINI_LEAKED_OR_BLOCKED_KEY', userMessage: SAFE_MESSAGES.GEMINI_LEAKED_OR_BLOCKED_KEY, allowFallback: true, retryable: false };
  }
  if (/safety|blocked.*response|prompt.*blocked|finish.?reason.*safety/i.test(lower)) {
    return { state: 'GEMINI_SAFETY_BLOCK', userMessage: SAFE_MESSAGES.GEMINI_SAFETY_BLOCK, allowFallback: true, retryable: false };
  }
  if (/api key.*not valid|invalid api key|api key.*invalid/i.test(lower)) {
    return { state: 'GEMINI_INVALID_KEY', userMessage: SAFE_MESSAGES.GEMINI_INVALID_KEY, allowFallback: true, retryable: false };
  }
  if (status === 401 || /unauthenticated|authentication.*failed/i.test(lower)) {
    return { state: 'GEMINI_UNAUTHORIZED', userMessage: SAFE_MESSAGES.GEMINI_UNAUTHORIZED, allowFallback: true, retryable: false };
  }
  if (status === 403 || /permission denied|forbidden|access denied/i.test(lower)) {
    return { state: 'GEMINI_FORBIDDEN', userMessage: SAFE_MESSAGES.GEMINI_FORBIDDEN, allowFallback: true, retryable: false };
  }
  if (status === 429 || /resource_exhausted|rate.?limit|too many requests/i.test(lower)) {
    const quotaExceeded = /resource_exhausted|quota(?:\s|_|-|:)?.*(?:exceed|exhaust|deplet)|(?:daily|monthly)\s+quota|quota/i.test(lower);
    if (quotaExceeded && !/rate.?limit/i.test(lower)) {
      return { state: 'GEMINI_QUOTA_EXCEEDED', userMessage: SAFE_MESSAGES.GEMINI_QUOTA_EXCEEDED, allowFallback: true, retryable: true };
    }
    return { state: 'GEMINI_RATE_LIMITED', userMessage: SAFE_MESSAGES.GEMINI_RATE_LIMITED, allowFallback: true, retryable: true };
  }
  if (status === 404 || /model.*not found|not found.*model|invalid model|unsupported model/i.test(lower)) {
    return { state: 'GEMINI_MODEL_UNAVAILABLE', userMessage: SAFE_MESSAGES.GEMINI_MODEL_UNAVAILABLE, allowFallback: true, retryable: false };
  }
  if (status !== undefined && status >= 500 && status <= 599) {
    return { state: 'GEMINI_SERVER_ERROR', userMessage: SAFE_MESSAGES.GEMINI_SERVER_ERROR, allowFallback: true, retryable: true };
  }
  if (/timeout|timed out|deadline exceeded|aborterror/i.test(lower)) {
    return { state: 'GEMINI_TIMEOUT', userMessage: SAFE_MESSAGES.GEMINI_TIMEOUT, allowFallback: true, retryable: true };
  }
  if (/network|fetch failed|econn|enotfound|socket|offline/i.test(lower)) {
    return { state: 'GEMINI_NETWORK_ERROR', userMessage: SAFE_MESSAGES.GEMINI_NETWORK_ERROR, allowFallback: true, retryable: true };
  }
  if (/empty response|no response text|empty candidate/i.test(lower)) {
    return { state: 'GEMINI_EMPTY_RESPONSE', userMessage: SAFE_MESSAGES.GEMINI_EMPTY_RESPONSE, allowFallback: true, retryable: false };
  }
  if (/malformed|invalid json|json parse|unexpected structure/i.test(lower)) {
    return { state: 'GEMINI_MALFORMED_RESPONSE', userMessage: SAFE_MESSAGES.GEMINI_MALFORMED_RESPONSE, allowFallback: true, retryable: false };
  }
  return { state: 'GEMINI_UNKNOWN_ERROR', userMessage: SAFE_MESSAGES.GEMINI_UNKNOWN_ERROR, allowFallback: true, retryable: false };
}

export function geminiNotConfigured(): GeminiErrorClassification {
  return {
    state: 'GEMINI_NOT_CONFIGURED',
    userMessage: SAFE_MESSAGES.GEMINI_NOT_CONFIGURED,
    allowFallback: true,
    retryable: false,
  };
}

export function geminiConfigured(): GeminiErrorClassification {
  return {
    state: 'GEMINI_CONFIGURED',
    userMessage: SAFE_MESSAGES.GEMINI_CONFIGURED,
    allowFallback: false,
    retryable: false,
  };
}

export function getGeminiCredentialState(apiKey: string | undefined): GeminiErrorClassification {
  return apiKey?.trim() ? geminiConfigured() : geminiNotConfigured();
}
