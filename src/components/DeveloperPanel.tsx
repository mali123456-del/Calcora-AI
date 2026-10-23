/**
 * Developer workspace (Phase 8, batch 5).
 *
 * A complete developer subsystem on top of Calcora's real, supported endpoints:
 *  - Trace: the reproducible deterministic calculation trace and its verification.
 *  - Playground: real endpoint allowlist (no free-form URL — that would be an SSRF
 *    bypass), validated JSON bodies, cancellation, measured results, sanitized
 *    bounded history.
 *  - Providers: the model manager's registry status with credentials already
 *    redacted server-side, plus the public local runtime report. States are
 *    honest: configured/available/rate-limited/unauthorized/untested.
 *  - Diagnostics: a bounded capture of real console/window reports with redaction,
 *    filters and a copyable sanitized report. No payloads, prompts or stacks.
 *  - Settings: only safe, developer-scope preferences with clamping and resets.
 *
 * Secrets never enter this component: there is no key reading here, and every
 * artifact passes the shared redaction before it is rendered or copied.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recomputeCalculationTraceId, type CalculationTrace } from '../services/calculationTrace';
import {
  DEVELOPER_ENDPOINTS,
  createDeveloperRequestHistory,
  findDeveloperEndpoint,
  parseJsonBody,
  runDeveloperRequest,
  type DeveloperEndpoint,
  type SanitizedRequestOutcome,
} from '../services/developerEndpoints';
import {
  createDeveloperDiagnostics,
  type DeveloperSeverity,
} from '../services/developerDiagnostics';

/* ------------------------------------------------------------------ */
/* Settings (safe developer preferences only, bounded and clamped)     */
/* ------------------------------------------------------------------ */

interface DeveloperSettings {
  version: 1;
  historyRetention: number;
  diagnosticBound: number;
  captureConsole: boolean;
  severityFilter: DeveloperSeverity;
}

const SETTINGS_STORAGE_KEY = 'calcora_developer_settings_v1';
const DEFAULT_SETTINGS: DeveloperSettings = {
  version: 1,
  historyRetention: 20,
  diagnosticBound: 120,
  captureConsole: true,
  severityFilter: 'info',
};

function loadSettings(): DeveloperSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DeveloperSettings>;
    if (parsed.version !== 1) return DEFAULT_SETTINGS;
    return {
      version: 1,
      historyRetention: clamp(parsed.historyRetention ?? DEFAULT_SETTINGS.historyRetention, 5, 100),
      diagnosticBound: clamp(parsed.diagnosticBound ?? DEFAULT_SETTINGS.diagnosticBound, 20, 500),
      captureConsole: Boolean(parsed.captureConsole ?? true),
      severityFilter: (['debug', 'info', 'warn', 'error'] as DeveloperSeverity[]).includes(parsed.severityFilter as DeveloperSeverity)
        ? (parsed.severityFilter as DeveloperSeverity)
        : DEFAULT_SETTINGS.severityFilter,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: DeveloperSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); settings stay in memory.
  }
}

function clamp(value: number, min: number, max: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return min;
  return Math.max(min, Math.min(max, rounded));
}

/* ------------------------------------------------------------------ */
/* Shared atoms                                                        */
/* ------------------------------------------------------------------ */

type Copied = string | null;

const TABS = [
  { id: 'trace', label: 'Trace' },
  { id: 'playground', label: 'API Playground' },
  { id: 'providers', label: 'Providers' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function DeveloperPanel({ trace }: DeveloperPanelProps) {
  const [tab, setTab] = useState<TabId>('trace');
  const [settings, setSettings] = useState<DeveloperSettings>(loadSettings);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  return (
    <section aria-label="Developer workspace" className="flex flex-col gap-3 p-4 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-200">Developer workspace</h2>
        <span className="text-[11px] text-slate-500">
          Real endpoints only · measured values · redacted artifacts
        </span>
      </header>

      <nav aria-label="Developer sections" className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            aria-controls={`developer-tabpanel-${entry.id}`}
            id={`developer-tab-${entry.id}`}
            onClick={() => setTab(entry.id)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              tab === entry.id ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div role="tabpanel" id={`developer-tabpanel-${tab}`} aria-labelledby={`developer-tab-${tab}`} className="flex flex-col gap-3">
        {tab === 'trace' ? <TraceTab trace={trace} /> : null}
        {tab === 'playground' ? <PlaygroundTab settings={settings} /> : null}
        {tab === 'providers' ? <ProvidersTab /> : null}
        {tab === 'diagnostics' ? <DiagnosticsTab settings={settings} onSettings={setSettings} /> : null}
        {tab === 'settings' ? <SettingsTab settings={settings} onSettings={setSettings} /> : null}
      </div>
    </section>
  );
}

interface DeveloperPanelProps {
  /** The reproducible trace for the current deterministic state, or null when there is none. */
  trace?: CalculationTrace | null;
}

function useCopyButton(): readonly [Copied, (text: string, kind: string, label: string) => Promise<string>] {
  const [copied, setCopied] = useState<Copied>(null);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);
  const copy = useCallback(async (text: string, kind: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
    return label;
  }, []);
  return [copied, copy] as const;
}

/* ------------------------------------------------------------------ */
/* Trace tab (calculation / pipeline inspector)                        */
/* ------------------------------------------------------------------ */

function TraceTab({ trace }: { trace?: CalculationTrace | null }) {
  const [copied, copy] = useCopyButton();
  const [showJson, setShowJson] = useState(false);

  const idIntact = trace ? trace.id === recomputeCalculationTraceId(trace) : null;

  if (!trace) {
    return (
      <div className="text-sm text-slate-400">
        <p>Run a deterministic calculation to produce a replayable trace.</p>
        <p className="mt-1 text-xs text-slate-500">
          The panel never changes what the engine computes: it inspects the same independent verdict
          the Tutor is shown.
        </p>
      </div>
    );
  }

  const stateTone =
    trace.verification.state === 'VERIFIED'
      ? 'text-emerald-400'
      : trace.verification.state === 'UNAVAILABLE'
        ? 'text-slate-400'
        : 'text-amber-400';

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code
          data-testid="trace-id"
          title="Reproducible identifier derived from the mathematical content, not the clock"
          className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-sky-300"
        >
          {trace.id}
        </code>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Engine</dt>
          <dd className="font-mono text-slate-300">{trace.engine}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expression</dt>
          <dd className="font-mono text-slate-300">{trace.expression ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Verification</dt>
          <dd className={`font-semibold ${stateTone}`} data-testid="trace-verification">
            {trace.verification.state}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Trace integrity</dt>
          <dd className={idIntact ? 'text-slate-300' : 'text-rose-400'}>
            {idIntact ? 'reproducible' : 'altered'}
          </dd>
        </div>
      </dl>

      {trace.verification.reason ? <p className="text-xs text-slate-400">{trace.verification.reason}</p> : null}

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Calculation steps</h3>
        <ol className="flex flex-col gap-1" data-testid="trace-steps">
          {trace.steps.map((step, index) => (
            <li key={`${step.label}-${index}`} className="flex gap-2 text-xs">
              <span className="w-5 shrink-0 text-slate-600">{index + 1}.</span>
              <span className="text-slate-300">{step.label}</span>
              {step.detail ? <span className="text-slate-500">{step.detail}</span> : null}
              {step.result ? <span className="font-mono text-sky-300">{step.result}</span> : null}
            </li>
          ))}
        </ol>
      </div>

      {Object.keys(trace.timings).length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Timings (ms)</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {Object.entries(trace.timings).map(([phase, ms]) => (
              <li key={phase}>
                {phase}: <span className="font-mono text-slate-300">{ms}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {trace.provenance.knowledgeIds.length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Knowledge provenance</h3>
          <ul className="flex flex-wrap gap-1">
            {trace.provenance.knowledgeIds.map((id) => (
              <li key={id} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">
                {id}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <DeveloperButton onClick={() => void copy(trace.id, 'trace', 'trace')} label={copied === 'trace' ? 'Copied' : 'Copy trace id'} />
        <DeveloperButton
          onClick={() => void copy(JSON.stringify(trace, null, 2), 'json', 'json')}
          label={copied === 'json' ? 'Copied' : 'Copy JSON'}
        />
        <button
          type="button"
          aria-pressed={showJson}
          onClick={() => setShowJson((value) => !value)}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {showJson ? 'Hide' : 'Show'} JSON
        </button>
      </div>

      {showJson ? (
        <pre
          data-testid="trace-json"
          className="max-h-64 overflow-auto rounded bg-slate-900 p-2 text-[11px] leading-relaxed text-slate-300"
        >
          {JSON.stringify(trace, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* API playground                                                      */
/* ------------------------------------------------------------------ */

function prettyPrint(bodyText: string): string {
  try {
    return JSON.stringify(JSON.parse(bodyText), null, 2);
  } catch {
    return bodyText;
  }
}

function statusTone(status: number): string {
  if (status === 499) return 'bg-slate-700 text-slate-200';
  if (status === 0) return 'bg-rose-900/60 text-rose-200';
  if (status >= 500) return 'bg-rose-900/60 text-rose-200';
  if (status >= 400) return 'bg-amber-800/60 text-amber-200';
  return 'bg-emerald-800/60 text-emerald-200';
}

interface PlaygroundState {
  endpointId: string;
  bodyText: string;
  inFlight: boolean;
  outcome: SanitizedRequestOutcome | null;
  validationBlocked: string | null;
}

function PlaygroundTab({ settings }: { settings: DeveloperSettings }) {
  const [playground, setPlayground] = useState<PlaygroundState>(
    () => ({
      endpointId: DEVELOPER_ENDPOINTS[0].id,
      bodyText: findDeveloperEndpoint(DEVELOPER_ENDPOINTS[0].id)!.exampleBody ?? '',
      inFlight: false,
      outcome: null,
      validationBlocked: null,
    }),
  );
  const historyRef = useRef(createDeveloperRequestHistory(settings.historyRetention));
  const [historyVersion, setHistoryVersion] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [copied, copy] = useCopyButton();

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    historyRef.current.setRetention(settings.historyRetention);
    setHistoryVersion((v) => v + 1);
  }, [settings.historyRetention]);

  const endpoint = findDeveloperEndpoint(playground.endpointId) ?? DEVELOPER_ENDPOINTS[0];

  const selectEndpoint = (id: string) => {
    const next = findDeveloperEndpoint(id);
    if (!next) return;
    abortRef.current?.abort();
    setPlayground({
      endpointId: next.id,
      bodyText: next.exampleBody ?? '',
      inFlight: false,
      outcome: null,
      validationBlocked: null,
    });
  };

  const send = async () => {
    let validated: ReturnType<typeof parseJsonBody> = { ok: true, value: undefined };
    if (endpoint.method === 'POST') {
      validated = parseJsonBody(playground.bodyText);
      if (!validated.ok) {
        setPlayground((prev) => ({ ...prev, validationBlocked: validated.ok ? null : (validated as { error: string }).error }));
        return;
      }
    }
    setPlayground((prev) => ({ ...prev, inFlight: true, outcome: null, validationBlocked: null }));
    const controller = new AbortController();
    abortRef.current = controller;
    const outcome = await runDeveloperRequest(endpoint, playground.bodyText, { signal: controller.signal });
    abortRef.current = null;
    historyRef.current.add({
      endpointId: endpoint.id, method: endpoint.method, path: endpoint.path, at: Date.now(),
      requestBody: endpoint.method === 'POST' ? playground.bodyText : null, outcome,
    });
    setHistoryVersion((v) => v + 1);
    setPlayground((prev) => ({ ...prev, inFlight: false, outcome }));
  };

  const cancel = () => abortRef.current?.abort();

  const clear = () => {
    abortRef.current?.abort();
    setPlayground((prev) => ({ ...prev, outcome: null, validationBlocked: null }));
  };

  const history = historyRef.current.entries;
  void historyVersion; // re-render trigger for the ref-based history

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-start gap-2">
        <label htmlFor="dev-endpoint-select" className="sr-only">Endpoint</label>
        <select
          id="dev-endpoint-select"
          value={playground.endpointId}
          onChange={(event) => selectEndpoint(event.target.value)}
          className="rounded bg-slate-800 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {DEVELOPER_ENDPOINTS.map((e) => (
            <option key={e.id} value={e.id}>{e.method} {e.path}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400">{endpoint.summary}</p>
      </div>
      <p className="text-[11px] text-amber-300/80">{endpoint.accessNote}</p>

      {endpoint.method === 'POST' ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="dev-request-body" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            JSON body <span className="font-normal normal-case text-slate-500">({endpoint.bodyHint})</span>
          </label>
          <textarea
            id="dev-request-body"
            value={playground.bodyText}
            spellCheck={false}
            onChange={(event) => setPlayground((prev) => ({ ...prev, bodyText: event.target.value, validationBlocked: null }))}
            rows={6}
            className="rounded bg-slate-900 p-2 font-mono text-xs text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          />
          {playground.validationBlocked ? (
            <p className="text-xs text-rose-400" role="status">{playground.validationBlocked} The request was not sent.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No request body: this endpoint is a GET.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void send()}
          disabled={playground.inFlight || (endpoint.method === 'POST' && playGroundInvalid(playground.bodyText))}
          className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {playground.inFlight ? 'Sending…' : 'Send'}
        </button>
        {playground.inFlight ? (
          <button type="button" onClick={cancel} className="rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
            Cancel
          </button>
        ) : null}
        <DeveloperButton onClick={clear} label="Clear result" />
        {playground.outcome ? (
          <DeveloperButton
            onClick={() => void copy(
              JSON.stringify({ path: endpoint.path, method: endpoint.method, outcome: playground.outcome }, null, 2),
              'req', 'req')}
            label={copied === 'req' ? 'Copied' : 'Copy result JSON'}
          />
        ) : null}
      </div>

      <div aria-live="polite">
        {playground.outcome ? (
          <div className="flex flex-col gap-1.5 rounded border border-slate-800 bg-slate-900/60 p-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded px-2 py-0.5 font-mono font-bold ${statusTone(playground.outcome.status)}`}>
                {playground.outcome.status === 499 ? 'cancelled' : playground.outcome.status === 0 ? 'network' : `HTTP ${playground.outcome.status}`}
              </span>
              <span className="text-slate-400">measured {playground.outcome.durationMs} ms</span>
              <span className="text-slate-500">{playground.outcome.classification}</span>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-900 p-2 text-[11px] text-slate-300">
              {prettyPrint(playground.outcome.bodyText)}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No request sent yet. Results show the real status, body and measured duration.</p>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent requests <span className="font-normal normal-case text-slate-500">(in memory only, max {settings.historyRetention})</span>
          </h3>
          {(history.length > 0) ? (
            <button
              type="button"
              onClick={() => { historyRef.current.clear(); setHistoryVersion((v) => v + 1); }}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Clear history
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">No playground requests recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-800/70">
            {history.slice().reverse().map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
                <span className="font-mono text-slate-300">{entry.method} {entry.path}</span>
                <span className={`rounded px-1.5 py-0.5 font-mono ${statusTone(entry.outcome.status)}`}>
                  {entry.outcome.status === 499 ? 'cancelled' : entry.outcome.status === 0 ? 'network' : entry.outcome.status}
                </span>
                <span className="text-slate-500">{entry.outcome.durationMs} ms</span>
                <span className="text-slate-600">{new Date(entry.at).toLocaleTimeString()}</span>
                <button
                  type="button"
                  onClick={() => selectEndpoint(entry.endpointId)}
                  className="ml-auto rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  Replay
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function playGroundInvalid(bodyText: string): boolean {
  return !parseJsonBody(bodyText).ok;
}

/* ------------------------------------------------------------------ */
/* Providers/model inspector                                           */
/* ------------------------------------------------------------------ */

interface RegisterModel {
  id: string;
  provider: string;
  displayName: string;
  isLocal: boolean;
  capabilities: string[];
  contextWindow: number;
  isAvailable: boolean;
  diagnostic?: string;
}

interface RegistryRow {
  provider: string;
  enabled: boolean;
  isLocal: boolean;
  configuredEndpoint?: string;
  hasKey: boolean;
  maskedKey: string;
  models: RegisterModel[];
}

function ProvidersTab() {
  const [registry, setRegistry] = useState<RegistryRow[] | null>(null);
  const [localStatus, setLocalStatus] = useState<{ diagnostic?: string; runtimeAvailable?: boolean; models?: Array<{ id: string; fileName: string; role: string }> } | null>(null);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testState, setTestState] = useState<'idle' | 'running' | { status: number; text: string }>('idle');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setRegistryError(null);
    (async () => {
      const outcome = await runDeveloperRequest(findDeveloperEndpoint('intelligence-status')!, '', { signal: controller.signal });
      // intelligence status is public: it proves the server is reachable; the registry is where providers live.
      void outcome;
      const registryOutcome = await fetchRegistry(controller.signal);
      if (!controller.signal.aborted) {
        setLoading(false);
        setRegistry(registryOutcome.ok ? (registryOutcome.rows ?? null) : null);
        setRegistryError(registryOutcome.ok ? null : registryOutcome.message);
      }
    })();
    (async () => {
      const local = await fetch('/api/ai/local-models', { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      if (!controller.signal.aborted && local) setLocalStatus(local);
    })();
    return () => controller.abort();
  }, []);

  const fetchRegistry = async (signal: AbortSignal): Promise<{ ok: boolean; rows?: RegistryRow[]; message: string }> => {
    try {
      const res = await fetch('/api/models/registry', { signal });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401 || res.status === 503) {
          return {
            ok: false,
            message: 'The provider registry is admin-gated in this mode. Set CALCORA_ADMIN_TOKEN and send x-calcora-admin-token, or run the desktop app (CALCORA_DESKTOP=1) where localhost requests are trusted.',
          };
        }
        return { ok: false, message: payload.error || `The registry request failed (HTTP ${res.status}).` };
      }
      const payload = (await res.json()) as { success: boolean; registry: RegistryRow[] };
      return { ok: Boolean(payload.success), rows: payload.registry, message: 'ok' };
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return { ok: false, message: 'cancelled' };
      return { ok: false, message: 'The server is not reachable from this page.' };
    }
  };

  const runCompletionTest = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setTestState('running');
    try {
      const res = await fetch('/api/models/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt: 'What is 2 + 3?', privacyMode: 'local-only' }),
      });
      const text = await res.text();
      setTestState({ status: res.status, text: text.slice(0, 4000) });
    } catch (error) {
      setTestState((error as { name?: string })?.name === 'AbortError'
        ? 'idle'
        : { status: 0, text: 'The completion test did not reach the server.' });
    }
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      {loading ? (
        <p className="text-xs text-slate-400" role="status">Loading provider registry…</p>
      ) : null}

      {localStatus ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5 text-xs">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Local runtime (public status)</h3>
          <p className="text-slate-400">{localStatus.diagnostic ?? 'Local GGUF runtime status unavailable from the server.'}</p>
          {Array.isArray(localStatus.models) && localStatus.models.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1">
              {localStatus.models.map((model) => (
                <li key={model.id} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">
                  {model.fileName} ({model.role})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-slate-500">No local model files discovered. Model downloads are never started automatically.</p>
          )}
        </div>
      ) : null}

      {registryError ? (
        <div className="rounded border border-amber-700/60 bg-amber-900/30 p-2.5 text-xs text-amber-200" role="status">
          <p>{registryError}</p>
          {testState === 'idle' ? null : <TestResult state={testState} />}
          <button
            type="button"
            onClick={() => void runCompletionTest()}
            disabled={testState === 'running'}
            className="mt-2 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {testState === 'running' ? 'Testing…' : 'Test the completion route'}
          </button>
          <p className="mt-1 text-[11px] text-amber-300/80">
            The test is the real POST /api/models/complete route with privacyMode local-only; a status and body are shown exactly as received. Nothing is inferred beyond that.
          </p>
        </div>
      ) : null}

      {registry ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider registry (credentials already redacted server-side)</h3>
            <button
              type="button"
              onClick={() => void runCompletionTest()}
              disabled={testState === 'running'}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {testState === 'running' ? 'Testing…' : 'Test the completion route'}
            </button>
          </div>
          <TestResult state={testState} />
          <ul className="flex flex-col gap-2">
            {registry.map((row) => (
              <li key={row.provider} className="rounded border border-slate-800 bg-slate-900/60 p-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-200">{row.provider}</span>
                  <span className={`rounded px-1.5 py-0.5 ${row.enabled ? 'bg-emerald-800/60 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
                    {row.enabled ? 'enabled' : 'disabled'}
                  </span>
                  {row.hasKey ? (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300" title="masked by the server; the panel never holds a key">
                      key: {row.maskedKey}
                    </span>
                  ) : (
                    <span className="text-slate-500">no key required</span>
                  )}
                  {row.configuredEndpoint ? <span className="font-mono text-[11px] text-slate-500">{row.configuredEndpoint}</span> : null}
                </div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {row.models.map((model) => (
                    <li key={model.id} className="text-[11px] text-slate-400">
                      <span className="font-mono text-slate-300">{model.displayName}</span>
                      {' '}
                      <span className={model.isAvailable ? 'text-emerald-300' : 'text-amber-300'}>
                        {model.isAvailable ? 'available in registry' : 'not available'}
                      </span>
                      {' · '}
                      {model.capabilities.join(', ')}
                      {' · context '}
                      {model.contextWindow}
                      {model.diagnostic ? `. ${model.diagnostic}` : ''}
                      <span className="text-slate-600"> (registry state — not a connection test)</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TestResult({ state }: { state: 'idle' | 'running' | { status: number; text: string } }) {
  if (state === 'idle') return <p className="text-[11px] text-slate-500">Completion route not tested yet.</p>;
  if (state === 'running') return <p className="text-[11px] text-slate-400" role="status">Testing…</p>;
  return (
    <pre className={`mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded p-2 text-[11px] ${state.status < 400 ? 'bg-emerald-900/20 text-emerald-100' : 'bg-slate-900 text-slate-300'}`}>
      {`HTTP ${state.status}\n${state.text}`}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/* Diagnostics                                                         */
/* ------------------------------------------------------------------ */

function DiagnosticsTab({ settings, onSettings }: { settings: DeveloperSettings; onSettings: (next: DeveloperSettings) => void }) {
  const diagRef = useRef<ReturnType<typeof createDeveloperDiagnostics> | null>(null);
  const [, forceRender] = useState(0);
  const [copied, copy] = useCopyButton();

  if (diagRef.current === null) {
    const diag = createDeveloperDiagnostics({
      max: settings.diagnosticBound,
      onRecord: () => forceRender((v) => v + 1),
    });
    diag.record('info', 'developer-panel', 'diagnostics capture started');
    diagRef.current = diag;
  }
  const diag = diagRef.current;

  useEffect(() => {
    diag.setMax(settings.diagnosticBound);
    forceRender((v) => v + 1);
  }, [settings.diagnosticBound, diag]);

  useEffect(() => {
    if (!settings.captureConsole) return undefined;
    return diag.attachRuntimeCapture();
  }, [settings.captureConsole, diag]);

  const minSeverity = settings.severityFilter;
  const visible = diag.fromSeverity(minSeverity);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Min severity:</span>
        {(['debug', 'info', 'warn', 'error'] as DeveloperSeverity[]).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={minSeverity === level}
            onClick={() => onSettings({ ...settings, severityFilter: level })}
            className={`rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              minSeverity === level ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {level}
          </button>
        ))}
        <span className="ml-auto text-slate-500">retained {diag.entries.length} / bound {settings.diagnosticBound}</span>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-slate-500">No entries at or above “{minSeverity}”. Console warnings and errors are captured while this tab is mounted{settings.captureConsole ? '' : ' (console capture is currently off)'}.</p>
      ) : (
        <ol className="flex max-h-96 flex-col divide-y divide-slate-800/70 overflow-auto rounded bg-slate-900/50 p-1.5" aria-label="Diagnostic entries">
          {visible.map((entry) => (
            <li key={entry.id} className="gap-1 py-1 text-[11px]" style={{ display: 'flex' }}>
              <span className="w-4 shrink-0 font-mono text-slate-600">{entry.id}</span>
              <span className={`w-11 shrink-0 font-mono uppercase ${
                entry.severity === 'error' ? 'text-rose-300' : entry.severity === 'warn' ? 'text-amber-300' : 'text-slate-500'}`}>
                {entry.severity}
              </span>
              <span className="w-24 shrink-0 truncate font-mono text-slate-500">{entry.subsystem}</span>
              <span className="text-slate-300">{entry.message}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        <DeveloperButton
          onClick={() => void copy(diag.exportReport(), 'report', 'report')}
          label={copied === 'report' ? 'Copied' : 'Copy sanitized diagnostic report'}
        />
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Clear the diagnostic buffer? This cannot be undone.')) {
              diag.clear();
              forceRender((v) => v + 1);
            }
          }}
          className="rounded bg-rose-900/60 px-2 py-1 text-xs text-rose-100 hover:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          Clear diagnostics
        </button>
      </div>
      <p className="text-[11px] text-slate-600">
        The report contains truncated, redacted console/window messages only. Prompts, document contents,
        request bodies, provider responses, stacks and credentials are never captured.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function SettingsTab({ settings, onSettings }: { settings: DeveloperSettings; onSettings: (next: DeveloperSettings) => void }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-xs text-slate-500">
        Developer preferences affect only this panel. Requests never carry credentials the app itself does not
        already have, and nothing here can change calculation results or the tutor's verified pipeline.
      </p>

      <label className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>Playground history retention (entries, in memory only)</span>
        <input
          type="number"
          min={5}
          max={100}
          value={settings.historyRetention}
          onChange={(event) => onSettings({ ...settings, historyRetention: clamp(event.target.valueAsNumber, 5, 100) })}
          className="w-20 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>Diagnostic buffer bound (entries)</span>
        <input
          type="number"
          min={20}
          max={500}
          value={settings.diagnosticBound}
          onChange={(event) => onSettings({ ...settings, diagnosticBound: clamp(event.target.valueAsNumber, 20, 500) })}
          className="w-20 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>Capture console warnings/errors and unhandled rejections (truncated + redacted)</span>
        <input
          type="checkbox"
          checked={settings.captureConsole}
          onChange={(event) => onSettings({ ...settings, captureConsole: event.target.checked })}
          className="h-4 w-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        />
      </label>

      <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all developer preferences to their defaults?')) {
              onSettings({ ...DEFAULT_SETTINGS });
            }
          }}
          className="rounded bg-rose-900/60 px-2 py-1 text-xs text-rose-100 hover:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          Reset developer preferences
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DeveloperButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      {label}
    </button>
  );
}
