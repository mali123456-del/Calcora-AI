/**
 * Home dashboard (premium overview screen).
 *
 * Every card shows real application state: the four quick tiles navigate to
 * real workspaces, Recent Activity lists actual stored calculations and real
 * tutor progress, and System Status reports measured checks only (API health,
 * service worker, local storage write test, local model runtime). Nothing is
 * fabricated: unavailable information is shown as unavailable or as a pointer
 * to where the authoritative view lives (Developer > Providers).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  BrainCircuit,
  ChevronRight,
  FileText,
  GraduationCap,
  History,
  SendHorizonal,
  Server,
  HardDriveDownload,
  Wrench,
  X,
} from 'lucide-react';
import type { ActiveTab, HistoryItem } from '../types';
import { loadTutorStats } from '../utils/aiTutorStorage';

interface Props {
  onNavigate: (tab: ActiveTab) => void;
  /** Sends a prompt into the AI Tutor (the shell opens the Tutor with it). */
  onAskTutor: (prompt: string) => void;
  /** Newest-first real calculation history from the calculator engine. */
  calculationHistory: HistoryItem[];
}

const QUICK_TILES = [
  {
    id: 'calculator',
    label: 'Scientific Calculator',
    description: 'Advanced math, units, equations, graphing-ready',
    icon: Wrench,
  },
  {
    id: 'ai',
    label: 'AI Assistant',
    description: 'Get explanations, solve problems, learn step by step',
    icon: Bot,
  },
  {
    id: 'multimodal',
    label: 'Document Intelligence',
    description: 'PDF/DOCX analysis, citations, summaries',
    icon: FileText,
  },
  {
    id: 'developer',
    label: 'Developer Tools',
    description: 'API playground, logs, diagnostics, model manager',
    icon: BrainCircuit,
  },
] as const;

function relativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (!Number.isFinite(delta) || delta < 0) return 'just now';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Real, honest system checks. Each entry reports one of: checking, ok,
 * degraded, offline, unavailable — and never claims more than it measured.
 */
type StatusState = 'checking' | 'ok' | 'unavailable';

interface StatusEntry {
  id: string;
  label: string;
  state: StatusState;
  detail: string;
}

export default function HomeDashboardPanel({ onNavigate, onAskTutor, calculationHistory }: Props) {
  const [askPrompt, setAskPrompt] = useState('');
  const [statuses, setStatuses] = useState<StatusEntry[]>([
    { id: 'api', label: 'API Service', state: 'checking', detail: 'checking /api/health…' },
    { id: 'service-worker', label: 'Service Worker', state: 'checking', detail: 'checking registration…' },
    { id: 'local-storage', label: 'Local Storage', state: 'checking', detail: 'checking write access…' },
    { id: 'ai-provider', label: 'AI Provider', state: 'checking', detail: 'checking local runtime…' },
  ]);

  const tutorStats = useMemo(() => {
    try {
      return loadTutorStats();
    } catch {
      return null;
    }
  }, []);

  // Real status probes, measured once per mount.
  useEffect(() => {
    let cancelled = false;

    const patch = (id: string, entry: Omit<StatusEntry, 'id' | 'label'>) => {
      setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, ...entry } : s)));
    };

    const health = fetch('/api/health', { signal: AbortSignal.timeout(4000) })
      .then((res) => (res.ok ? patch('api', { state: 'ok', detail: 'Online' }) : patch('api', { state: 'unavailable', detail: `HTTP ${res.status}` })))
      .catch(() => patch('api', { state: 'unavailable', detail: 'Offline (calculator and local features still work)' }));

    patch('service-worker', {
      state: 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'ok' : 'unavailable',
      detail: navigator.serviceWorker?.controller ? 'Active' : 'Not controlling this page',
    });

    try {
      const probe = 'calcora_home_storage_probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      patch('local-storage', { state: 'ok', detail: 'Healthy' });
    } catch {
      patch('local-storage', { state: 'unavailable', detail: 'Write access blocked (private mode?)' });
    }

    // The local deterministic engine is always available; the local model
    // runtime is reported truthfully from the server's real status.
    fetch('/api/ai/local-models', { signal: AbortSignal.timeout(4000) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { runtimeAvailable?: boolean; models?: Array<{ id: string }> }) =>
        patch('ai-provider', {
          state: 'ok',
          detail: data.runtimeAvailable
            ? `Local runtime ready (${data.models?.length ?? 0} model files)`
            : 'Local engine ready · no local GGUF runtime configured',
        }),
      )
      .catch(() => patch('ai-provider', { state: 'unavailable', detail: 'Local engine ready · cloud status: see Developer › Providers' }));

    return () => {
      cancelled = true;
      void cancelled;
      void health.catch(() => undefined);
    };
  }, []);

  const recentCalculations = calculationHistory.slice(0, 3);

  const recentActivity = [
    ...recentCalculations.map((entry) => ({
      id: `calc-${entry.id}`,
      icon: History,
      title: `Calculated ${entry.expression} = ${entry.result}`,
      at: entry.timestamp,
    })),
    ...(tutorStats && tutorStats.lastActiveTimestamp > 0
      ? [{
          id: 'tutor',
          icon: GraduationCap,
          title: `AI Tutor session: ${tutorStats.sessionsCompleted} completed session${tutorStats.sessionsCompleted === 1 ? '' : 's'}, ${tutorStats.totalCorrect}/${tutorStats.totalProblemsAttempted} correct`,
          at: tutorStats.lastActiveTimestamp,
        }]
      : []),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 4);

  const submitAsk = () => {
    const prompt = askPrompt.trim();
    if (!prompt) return;
    onAskTutor(prompt);
    setAskPrompt('');
  };

  const stateColor = (state: StatusState): string => {
    if (state === 'checking') return 'text-amber-400';
    if (state === 'ok') return 'text-emerald-400';
    return 'text-slate-500';
  };

  return (
    <section aria-label="Home dashboard" className="flex flex-col gap-5 text-sm">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/90 via-slate-950 to-violet-950/70 p-6 sm:p-8 shadow-[0_0_60px_rgba(59,130,246,0.18)]">
        <BrainCircuit className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 text-blue-500/20" aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {greeting()}
        </h1>
        <p className="mt-1 text-sm text-blue-200/80">Your AI-powered scientific calculator and learning companion.</p>

        <form
          className="mt-5 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            submitAsk();
          }}
        >
          <label htmlFor="home-quick-ask" className="sr-only">Ask a math question, solve a problem, or upload a document</label>
          <input
            id="home-quick-ask"
            value={askPrompt}
            onChange={(event) => setAskPrompt(event.target.value)}
            placeholder="Ask a math question, solve a problem, or upload a document…"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:outline-none"
          />
          {askPrompt ? (
            <button type="button" aria-label="Clear question" onClick={() => setAskPrompt('')} className="rounded-full p-1 text-blue-200 hover:bg-white/10">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Ask the Tutor
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Solve Math', tab: 'calculator' as ActiveTab },
            { label: 'Explain', tab: 'ai' as ActiveTab },
            { label: 'Study', tab: 'practice' as ActiveTab },
            { label: 'Upload File', tab: 'multimodal' as ActiveTab },
          ].map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => onNavigate(pill.tab)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-blue-100 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onNavigate(tile.id)}
            aria-label={`Open ${tile.label}`}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900/70"
          >
            <tile.icon className="h-6 w-6 text-cyan-500" aria-hidden="true" />
            <span className="mt-2 font-bold text-slate-900 dark:text-slate-100">{tile.label}</span>
            <span className="mt-0.5 text-[11.5px] leading-4 text-slate-500 dark:text-slate-400">{tile.description}</span>
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
              Open <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {/* Recent activity + system status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Activity className="h-4 w-4 text-cyan-500" aria-hidden="true" /> Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Nothing yet. Run a calculation or start a tutor session — real activity will appear here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex items-center gap-2 py-2">
                  <activity.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">{activity.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(activity.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Server className="h-4 w-4 text-cyan-500" aria-hidden="true" /> System Status
          </h2>
          <ul aria-live="polite" className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {statuses.map((status) => (
              <li key={status.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  {status.id === 'local-storage' ? <HardDriveDownload className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
                  {status.label}
                </span>
                <span className={`text-right text-[11px] ${stateColor(status.state)}`}>{status.detail}</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="text-slate-700 dark:text-slate-200">Cloud model</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">not verified here — Developer › Providers</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
