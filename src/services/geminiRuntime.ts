export type GeminiRuntimeFailureKind = 'network' | 'request' | 'model-unavailable' | 'timeout' | 'malformed-response' | 'empty-response' | 'unexpected-structure' | 'all-models-failed';

export function classifyGeminiRuntimeFailure(error: unknown): GeminiRuntimeFailureKind {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/timeout|timed out|deadline/i.test(message)) return 'timeout';
  if (/network|fetch|econn|enotfound|socket|offline/i.test(message)) return 'network';
  if (/404|model.*not found|not found|invalid model|unsupported model/i.test(message)) return 'model-unavailable';
  if (/unexpected structure/i.test(message)) return 'unexpected-structure';
  if (/malformed|json/i.test(message)) return 'malformed-response';
  if (/empty response/i.test(message)) return 'empty-response';
  return 'request';
}

export function parseGeminiJsonResponse(raw: string): Record<string, unknown> | null {
  const clean = raw.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\`\`\`\s*$/i, '').trim();
  if (!clean) return null;
  try {
    const value: unknown = JSON.parse(clean);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.answer !== 'string' || !record.answer.trim()) return null;
    if (record.steps !== undefined && !Array.isArray(record.steps)) return null;
    return record;
  } catch {
    return null;
  }
}

export function isValidGeminiResponse(value: unknown): value is { answer: string; steps?: unknown[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.answer === 'string' && record.answer.trim().length > 0 && (record.steps === undefined || Array.isArray(record.steps));
}
