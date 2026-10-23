/**
 * Developer API playground runner (Phase 8 batch 5).
 *
 * The playground may only call the explicit, real endpoint allowlist below. There is
 * deliberately NO free-form URL field: an editor-controlled URL box would be an SSRF
 * bypass and a way to exfiltrate user data to arbitrary hosts. Methods and paths are
 * fixed per allowlist entry; only the JSON body is editable, and it is validated
 * before send. Requests are cancellable, measured, and recorded in a sanitized,
 * bounded history.
 */

export interface DeveloperEndpoint {
  /** Stable identifier used by the UI and history entries. */
  id: string;
  method: 'GET' | 'POST';
  path: string;
  /** What the endpoint really does inside Calcora. */
  summary: string;
  /** Non-empty only for POST endpoints that take a JSON body. */
  bodyHint?: string;
  /** A functional example generated from the real request contract. */
  exampleBody?: string;
  /** Honest note about authorization or rate limiting. */
  accessNote: string;
}

export const DEVELOPER_ENDPOINTS: readonly DeveloperEndpoint[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    summary: 'Liveness of the Calcora server process.',
    accessNote: 'Public. No authentication required.',
  },
  {
    id: 'local-models',
    method: 'GET',
    path: '/api/ai/local-models',
    summary: 'Local GGUF runtime status. Lists model filenames and runtime availability; never model paths.',
    accessNote: 'Public. Rate limited 30/min.',
  },
  {
    id: 'intelligence-status',
    method: 'GET',
    path: '/api/ai/intelligence/status',
    summary: 'Status of the AI knowledge intelligence cycle.',
    accessNote: 'Public. Rate limited 60/min.',
  },
  {
    id: 'learning-policy',
    method: 'GET',
    path: '/api/ai/learning/policy',
    summary: 'The published tutor-learning pipeline policy statement.',
    accessNote: 'Public.',
  },
  {
    id: 'math-tool',
    method: 'POST',
    path: '/api/math/tool',
    summary: 'Deterministic math tool layer (calculate, solveEquation, statistics, ...) with authoritative verification.',
    bodyHint: '{ "tool": "<allowlisted tool name>", "args": { ... } }',
    exampleBody: '{\n  "tool": "calculate",\n  "args": { "expression": "2 + 3 * 4" }\n}',
    accessNote: 'Public. Rate limited 120/min. Tool names are validated server-side.',
  },
  {
    id: 'ai-math',
    method: 'POST',
    path: '/api/ai/math',
    summary: 'Non-streaming AI math/Tutor endpoint. Portable: no key required.',
    bodyHint: '{ "prompt": "<question>", "privacyMode": "local-only" }',
    exampleBody: '{\n  "prompt": "Solve 2x + 5 = 17",\n  "privacyMode": "local-only"\n}',
    accessNote: 'Public. Rate limited 8/min and 120/hour.',
  },
] as const;

export function findDeveloperEndpoint(id: string): DeveloperEndpoint | undefined {
  return DEVELOPER_ENDPOINTS.find((endpoint) => endpoint.id === id);
}

/** Result of validating an editable JSON body. */
export type ParsedBody =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function parseJsonBody(input: string): ParsedBody {
  if (!input.trim()) return { ok: true, value: undefined };
  try {
    const value = JSON.parse(input);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, error: 'Request body must be a JSON object.' };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'Request body is not valid JSON.' };
  }
}

/** Truncation ceiling so a huge response can never hang the UI or blow the history bound. */
export const MAX_CAPTURED_BODY = 8192;

export type SanitizedRequestOutcome = {
  kind: 'response' | 'error';
  /** HTTP status for kind=response; for kind=error: 0 (network/CORS) or 499 (cancelled). */
  status: number;
  ok: boolean;
  /** Measured wall-clock duration in ms, rounded. Actual, not estimated. */
  durationMs: number;
  /** Captured response body (possibly truncated) or sanitized error text. */
  bodyText: string;
  /** 'response' | 'cancelled' | 'network' | 'aborted-by-caller'. */
  classification: 'response' | 'cancelled' | 'network';
};

export async function runDeveloperRequest(
  endpoint: DeveloperEndpoint,
  body: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<SanitizedRequestOutcome> {
  if (findDeveloperEndpoint(endpoint.id) !== endpoint) {
    // A tampered endpoint object must never be executed.
    return {
      kind: 'error',
      status: 0,
      ok: false,
      durationMs: 0,
      bodyText: 'Endpoint is not on the playground allowlist. Request was not sent.',
      classification: 'network',
    };
  }

  const started = (() => {
    const perf = (globalThis as { performance?: { now(): number } }).performance;
    return perf ? perf.now() : Date.now();
  })();

  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(endpoint.path, {
      method: endpoint.method,
      headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      signal: options.signal,
      body: endpoint.method === 'POST' ? body : undefined,
    });
    const durationMs = Math.round(
      (((globalThis as { performance?: { now(): number } }).performance?.now() ?? Date.now()) - started),
    );
    const responseText = await response.text();
    return {
      kind: 'response',
      status: response.status,
      ok: response.ok,
      durationMs,
      bodyText: responseText.slice(0, MAX_CAPTURED_BODY)
        + (responseText.length > MAX_CAPTURED_BODY ? `\n… truncated (${responseText.length - MAX_CAPTURED_BODY} more bytes)` : ''),
      classification: 'response',
    };
  } catch (error) {
    const durationMs = Math.round(
      (((globalThis as { performance?: { now(): number } }).performance?.now() ?? Date.now()) - started),
    );
    const aborted = error instanceof DOMException ? error.name === 'AbortError' : (error as { name?: string })?.name === 'AbortError';
    if (aborted) {
      return {
        kind: 'error',
        status: 499,
        ok: false,
        durationMs,
        bodyText: 'Request cancelled before the response completed.',
        classification: 'cancelled',
      };
    }
    return {
      kind: 'error',
      status: 0,
      ok: false,
      durationMs,
      bodyText: sanitizeNetworkError(error),
      classification: 'network',
    };
  }
}

function sanitizeNetworkError(error: unknown): string {
  // Error messages can embed URLs or operator content. Keep the classification, drop the transcript.
  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return 'The request did not reach the server (network error or server not running).';
    }
    return `Request failed: ${error.name}. No provider or endpoint transcript is included.`;
  }
  return 'Request failed for an unknown reason.';
}

/* ------------------------------------------------------------------ */
/* Sanitized history                                                   */
/* ------------------------------------------------------------------ */

const SECRET_KEY_PATTERN = /token|key|secret|password|passphrase|authorization|credential|apikey|api_key/i;
const SECRET_VALUE_PATTERN = /bearer\s+[a-z0-9._-]+|sk-[a-z0-9-]{8,}|gh_[a-z0-9_]{20,}|ya29\.[a-z0-9_-]+/i;

function redact(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && SECRET_VALUE_PATTERN.test(value)) return '[redacted]';
    return typeof value === 'string' && value.length > 512 ? value.slice(0, 512) + '…' : value;
  }
  if (depth > 6) return '[depth limit]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  const output: Record<string, unknown> = {};
  for (const [name, child] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    output[name] = SECRET_KEY_PATTERN.test(name) ? '[redacted]' : redact(child, depth + 1);
  }
  return output;
}

/** Deep redaction of secret-looking keys/values; used before anything enters history or an export. */
export function sanitizeForDeveloperArtifacts(value: unknown): unknown {
  return redact(value, 0);
}

export interface DeveloperHistoryEntry {
  id: number;
  endpointId: string;
  method: 'GET' | 'POST';
  path: string;
  at: number;
  /** The request body as sent (JSON text, validated). Never persisted beyond this memory bound. */
  requestBody: string | null;
  outcome: SanitizedRequestOutcome;
  alreadySanitized?: true;
}

/**
 * Configurable, bounded history. Entries are only in memory; no request body
 * or response is written to localStorage. Retention is developer-configurable
 * (clamped) and old entries age out silently.
 */
export function createDeveloperRequestHistory(retention = 20) {
  let limit = Math.max(1, Math.min(100, Math.round(retention)));
  let entries: DeveloperHistoryEntry[] = [];
  let nextId = 1;
  return {
    get entries(): readonly DeveloperHistoryEntry[] {
      return entries;
    },
    setRetention(value: number): void {
      limit = Math.max(1, Math.min(100, Math.round(value)));
      entries = entries.slice(-limit);
    },
    add(entry: Omit<DeveloperHistoryEntry, 'id'>): DeveloperHistoryEntry {
      const stored: DeveloperHistoryEntry = { ...entry, id: nextId++ };
      entries = [...entries, stored].slice(-limit);
      return stored;
    },
    clear(): void {
      entries = [];
      nextId = 1;
    },
  };
}
