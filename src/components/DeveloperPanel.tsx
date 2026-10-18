/**
 * Developer / advanced workspace (Phase 8).
 *
 * Surfaces reproducible evidence rather than private reasoning: the deterministic
 * calculation trace, the verification outcome, structured JSON for scripting, and engine
 * timings. There is no token stream and no chain-of-thought anywhere in this view.
 */
import { useState } from 'react';
import { recomputeCalculationTraceId, type CalculationTrace } from '../services/calculationTrace';

interface DeveloperPanelProps {
  /** The reproducible trace for the current deterministic state, or null when there is none. */
  trace?: CalculationTrace | null;
}

type Copied = 'trace' | 'json' | null;

export default function DeveloperPanel({ trace }: DeveloperPanelProps) {
  const [copied, setCopied] = useState<Copied>(null);
  const [showJson, setShowJson] = useState(false);

  const idIntact = trace ? trace.id === recomputeCalculationTraceId(trace) : null;

  const copy = async (text: string, kind: Exclude<Copied, null>) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  if (!trace) {
    return (
      <section aria-label="Developer workspace" className="p-4 text-sm text-slate-400">
        <h2 className="mb-1 text-base font-semibold text-slate-200">Developer workspace</h2>
        <p>Run a deterministic calculation to produce a replayable trace.</p>
      </section>
    );
  }

  const stateTone =
    trace.verification.state === 'VERIFIED'
      ? 'text-emerald-400'
      : trace.verification.state === 'UNAVAILABLE'
        ? 'text-slate-400'
        : 'text-amber-400';

  return (
    <section aria-label="Developer workspace" className="flex flex-col gap-3 p-4 text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-200">Developer workspace</h2>
        <code
          data-testid="trace-id"
          title="Reproducible identifier derived from the mathematical content, not the clock"
          className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-sky-300"
        >
          {trace.id}
        </code>
      </header>

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

      {trace.verification.reason ? (
        <p className="text-xs text-slate-400">{trace.verification.reason}</p>
      ) : null}

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Calculation steps
        </h3>
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
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Knowledge provenance
          </h3>
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
        <button
          type="button"
          onClick={() => copy(trace.id, 'trace')}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
        >
          {copied === 'trace' ? 'Copied' : 'Copy trace id'}
        </button>
        <button
          type="button"
          onClick={() => copy(JSON.stringify(trace, null, 2), 'json')}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
        >
          {copied === 'json' ? 'Copied' : 'Copy JSON'}
        </button>
        <button
          type="button"
          aria-pressed={showJson}
          onClick={() => setShowJson((value) => !value)}
          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
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
    </section>
  );
}