/**
 * Developer diagnostics (Phase 8 batch 5).
 *
 * A bounded, sanitized, real capture of what the running app actually reports:
 * console warnings/errors and unhandled rejections, plus developer-initiated
 * notes. There is never a request/response payload, API key, prompt content, or
 * document content captured — messages are truncated to a short prefix, and the
 * export additionally runs the same deep redaction as the request history.
 */

import { sanitizeForDeveloperArtifacts } from './developerEndpoints';

export type DeveloperSeverity = 'debug' | 'info' | 'warn' | 'error';

export interface DeveloperDiagnostic {
  id: number;
  at: number;
  severity: DeveloperSeverity;
  subsystem: string;
  /** Short prefix only — never a full payload, prompt or stack transcript. */
  message: string;
}

const MAX_MESSAGE_LENGTH = 300;
const SEVERITY_ORDER: Record<DeveloperSeverity, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Text form of secret-looking `token/key/secret/... : value` fragments, replaced before anything is stored. */
const SECRET_IN_TEXT_PATTERN = new RegExp(
  [
    "(?:api[_-]?key|access[_-]?token|refresh[_-]?token|x-calcora-[a-z-]+|authorization|credential|passphrase|password)\\s*[\"':=]*\\s*[\\w.$-]{6,}",
    "api[\\s_-]*key\\s*[\"':=]+\\s*[\\w.$-]{6,}",
    "secret\\s*[\"':=]+\\s*[\\w.$-]{6,}",
    // Real credential shapes: Google (AIza…), AWS (AKIA…), GitHub (ghp_/gho_/ghu_/ghs_/ghr_),
    // Slack (xox…), OpenAI (sk-…), and the app's own env var naming.
    "AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|CALCORA_[A-Z_]+(?:TOKEN|KEY)",
  ].join('|'),
  'gi',
);

/** Replaces secret-looking substrings in free text so capture time is already clean. */
export function redactSecretsInText(input: string): string {
  return input.replace(SECRET_IN_TEXT_PATTERN, '[redacted]');
}

export function truncateDiagnosticMessage(input: string): string {
  const single = input.replace(/\s+/g, ' ').trim();
  return redactSecretsInText(single.length > MAX_MESSAGE_LENGTH ? single.slice(0, MAX_MESSAGE_LENGTH) + '…' : single);
}

export interface DeveloperDiagnosticsOptions {
  /** Ring-buffer bound. Clamped to [1, 500]; default 120. */
  max?: number;
  now?: () => number;
  /** Called after every record/resize so a UI can re-render on live captures. */
  onRecord?: () => void;
}

export interface DeveloperDiagnostics {
  entries: readonly DeveloperDiagnostic[];
  record(severity: DeveloperSeverity, subsystem: string, message: string): void;
  /** Captures real console + unhandled rejection reporting while attached. */
  attachRuntimeCapture(): () => void;
  fromSeverity(min: DeveloperSeverity): readonly DeveloperDiagnostic[];
  bySubsystem(subsystem: string): readonly DeveloperDiagnostic[];
  exportReport(): string;
  clear(): void;
  setMax(max: number): void;
}

export function createDeveloperDiagnostics(options: DeveloperDiagnosticsOptions = {}): DeveloperDiagnostics {
  let max = clampMax(options.max ?? 120);
  let entries: DeveloperDiagnostic[] = [];
  let nextId = 1;
  const now = options.now ?? (() => Date.now());

  function push(entry: Omit<DeveloperDiagnostic, 'id' | 'at'>): void {
    entries = [...entries, { ...entry, id: nextId++, at: now() }].slice(-max);
    options.onRecord?.();
  }

  return {
    get entries() {
      // A copy: callers cannot mutate past the bound or the retained history.
      return entries.slice();
    },
    record(severity, subsystem, message) {
      push({ severity, subsystem, message: truncateDiagnosticMessage(message) });
    },
    attachRuntimeCapture(): () => void {
      const detachments: Array<() => void> = [];

      const capture = (severity: DeveloperSeverity, subsystem: string) => (message: unknown) =>
        push({ severity, subsystem, message: describeUnknown(message) });

      const originalConsoleError = console.error.bind(console);
      const originalConsoleWarn = console.warn.bind(console);
      console.error = capture('error', 'console') as typeof console.error;
      console.warn = capture('warn', 'console') as typeof console.warn;
      detachments.push(() => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      });

      const onError = (event: ErrorEvent) =>
        push({ severity: 'error', subsystem: 'window', message: describeUnknown(event.error ?? event.message) });
      const onRejection = (event: PromiseRejectionEvent) =>
        push({ severity: 'error', subsystem: 'promise', message: describeUnknown(event.reason) });
      // Browser-only hooks: the diagnostics service also runs in Node/tooling contexts.
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        detachments.push(() => {
          window.removeEventListener('error', onError);
          window.removeEventListener('unhandledrejection', onRejection);
        });
      }

      return () => detachments.forEach((detach) => detach());
    },
    fromSeverity(min) {
      return entries.filter((entry) => SEVERITY_ORDER[entry.severity] >= SEVERITY_ORDER[min]);
    },
    bySubsystem(subsystem) {
      return entries.filter((entry) => entry.subsystem === subsystem);
    },
    exportReport() {
      const line = (entry: DeveloperDiagnostic): string =>
        `${new Date(entry.at).toISOString()} [${entry.severity}] ${entry.subsystem}: ${entry.message}`;
      const summary = {
        exportedAt: new Date().toISOString(),
        severityCounts: (['debug', 'info', 'warn', 'error'] as const).reduce(
          (acc, level) => ({ ...acc, [level]: entries.filter((entry) => entry.severity === level).length }),
          {} as Record<DeveloperSeverity, number>,
        ),
        retained: entries.length,
        bound: max,
      };
      const reportLines = [
        'Calcora developer diagnostic report',
        `exported: ${summary.exportedAt}`,
        `severity counts: debug=${summary.severityCounts.debug} info=${summary.severityCounts.info} warn=${summary.severityCounts.warn} error=${summary.severityCounts.error}`,
        `entries retained: ${summary.retained} of bound ${summary.bound}`,
        'redaction: messages are truncated prefixes; every line additionally passes secret redaction; no request bodies, prompts, documents or provider responses are included.',
        '',
        ...entries.map(line),
      ];
      return String(sanitizeForDeveloperArtifacts(reportLines.join('\n')));
    },
    clear() {
      entries = [];
      nextId = 1;
    },
    setMax(next) {
      max = clampMax(next);
      entries = entries.slice(-max);
      options.onRecord?.();
    },
  };

  function describeUnknown(input: unknown): string {
    if (typeof input === 'string') return truncateDiagnosticMessage(input);
    if (input instanceof Error) {
      return truncateDiagnosticMessage(`${input.name}: ${input.message}`);
    }
    if (input === null || input === undefined) return String(input);
    try {
      return truncateDiagnosticMessage(JSON.stringify(input));
    } catch {
      return '[unserializable event]';
    }
  }

  function clampMax(value: number): number {
    return Math.max(1, Math.min(500, Math.round(value)));
  }
}
