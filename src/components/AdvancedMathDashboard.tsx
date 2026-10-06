import React, { useEffect, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  GraduationCap,
  Grid3X3,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  ListChecks,
  MessageSquareText,
  Network,
  Orbit,
  PlayCircle,
  ScanLine,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { detectResourcePolicy, resourcePolicyLabel, type ResourcePolicy } from '../performance/resourcePolicy';

interface Props {
  onNavigateTab: (tab: ActiveTab) => void;
}

type FeatureCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  accent: string;
  onClick?: () => void;
};

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, badge, accent, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group text-left p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-400/50 hover:-translate-y-0.5 transition-all shadow-sm hover:shadow-xl"
  >
    <div className="flex items-start justify-between gap-3">
      <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center border`}>
        <Icon className="w-5 h-5" />
      </div>
      {badge && <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">{badge}</span>}
    </div>
    <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">{title}</div>
    <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{description}</div>
    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-cyan-500">Open workspace <ChevronRight className="w-3 h-3" /></div>
  </button>
);

const workspaces: Array<[ActiveTab, string, string, React.ElementType, string]> = [
  ['calculator', 'Scientific Calculator', 'Exact fractions, trig, logs, powers and memory.', Calculator, 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'],
  ['multimodal', 'Voice • PDF • Input Studio', 'Browser-supported voice and local PDF text extraction; image/ink recognition is unavailable.', Camera, 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'],
  ['graph', '2D Graphing Lab', 'Plot up to four y=f(x) expressions with approximate root detection and coordinate tracing.', LineChart, 'bg-blue-500/10 text-blue-500 border-blue-500/20'],
  ['equations', 'Equation Solver', 'Linear, quadratic and systems with verified steps.', Workflow, 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'],
  ['calculus', 'Calculus Studio', 'Limits, derivatives, integrals and numerical checks.', Activity, 'bg-purple-500/10 text-purple-500 border-purple-500/20'],
  ['matrix', 'Linear Algebra', 'Matrices, vectors, determinants and transformations.', Grid3X3, 'bg-pink-500/10 text-pink-500 border-pink-500/20'],
  ['statistics', 'Statistics Lab', 'Distributions, regression, probability and data analysis.', ListChecks, 'bg-amber-500/10 text-amber-500 border-amber-500/20'],
  ['practice', 'Practice Arena', 'Adaptive-style drills, quizzes, hints and review.', Trophy, 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'],
  ['ai', 'AI Mathematical Tutor', 'Grounded explanations, alternate methods and error diagnosis.', BrainCircuit, 'bg-violet-500/10 text-violet-500 border-violet-500/20'],
];

export const AdvancedMathDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const [leanMode, setLeanMode] = useState(() => localStorage.getItem('calcora_lean_mode') === 'true');
  const [autoBudget, setAutoBudget] = useState(() => localStorage.getItem('calcora_auto_budget') !== 'false');
  const [resourcePolicy, setResourcePolicy] = useState<ResourcePolicy>(() => detectResourcePolicy());
  const [intelligence, setIntelligence] = useState<{
    scheduled: boolean;
    lastRun: { finishedAt: string; activatedItems: number } | null;
    sources: unknown[];
    metrics?: {
      activeItems: number;
      embeddings: number;
      evaluations: number;
      passRate: number | null;
      lastEvaluationAt: string | null;
    };
  } | null>(null);

  useEffect(() => {
    setResourcePolicy(detectResourcePolicy());
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/ai/intelligence/status')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (alive && data) setIntelligence(data);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);


  useEffect(() => {
    const effectiveLean = autoBudget ? resourcePolicy.tier === 'lean' : leanMode;
    document.documentElement.dataset.calcoraLean = String(effectiveLean);
    localStorage.setItem('calcora_lean_mode', String(effectiveLean));
  }, [autoBudget, leanMode, resourcePolicy]);

  const syncLabel = intelligence === null
    ? 'CHECKING'
    : intelligence.scheduled
      ? 'DAILY SYNC ACTIVE'
      : 'ON-DEMAND ONLY';
  const learningTools: Array<[string, string, React.ElementType, ActiveTab]> = [
    ['Practice', 'Topic drills and quizzes', Trophy, 'practice'],
    ['Mistake Review', 'Turn errors into revision', Target, 'ai'],
    ['Concept Explorer', 'Definition → example → formula', FlaskConical, 'formulas'],
    ['Problem Generator', 'Fresh practice prompts', WandSparkles, 'practice'],
  ];
  const multimodalTools: Array<[string, string, React.ElementType]> = [
    ['Scan Problem', 'Camera / image → math input', ScanLine],
    ['Math Keyboard', 'Templates + symbols', Calculator],
    ['Voice Math', 'Speak expressions naturally', MessageSquareText],
    ['PDF / Table', 'Homework and structured data', ListChecks],
  ];
  const tutorCommands: Array<[string, string, React.ElementType]> = [
    ['Quick Answer', 'Answer first, expand later', Lightbulb],
    ['Step Walker', 'Reveal one verified step', Workflow],
    ['Error Detective', 'Find the first invalid step', ScanLine],
    ['Method Compare', 'Show another valid route', GitCompareArrows],
  ];

  return (
    <div className="space-y-7 pb-8 animate-in fade-in duration-300">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_15%_10%,rgba(6,182,212,.22),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(139,92,246,.20),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)] p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -bottom-24 w-72 h-72 rounded-full border border-cyan-400/10" />
        <div className="absolute right-10 top-8 opacity-20"><Orbit className="w-28 h-28" /></div>
        <div className="relative max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-cyan-400/10 border border-cyan-300/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider"><Sparkles className="w-3 h-3" /> Calcora Intelligence OS</span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-emerald-400/10 border border-emerald-300/20 text-emerald-300 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" /> Deterministic-first</span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-violet-400/10 border border-violet-300/20 text-violet-100 text-[10px] font-bold"><Network className="w-3 h-3" /> Local knowledge</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Calculate. Prove. Visualize. Learn.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">A unified mathematics workbench combining deterministic calculation, multimodal input, interactive visualization, guided tutoring, practice, verification and persistent mathematical knowledge.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => onNavigateTab('calculator')} className="px-4 py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition"><Calculator className="inline w-4 h-4 mr-1.5" /> Launch Calculator</button>
            <button onClick={() => onNavigateTab('multimodal')} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-bold hover:bg-white/10 transition"><Camera className="inline w-4 h-4 mr-1.5" /> Scan / Voice / Ink</button>
            <button onClick={() => onNavigateTab('ai')} className="px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-100 text-xs font-bold hover:bg-violet-500/30 transition"><BrainCircuit className="inline w-4 h-4 mr-1.5" /> Open Tutor</button>
            <button onClick={() => onNavigateTab('graph')} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-bold hover:bg-white/10 transition"><LineChart className="inline w-4 h-4 mr-1.5" /> Graph Lab</button>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([['13+', 'workspaces'], ['82+', 'knowledge concepts'], ['25', 'tutor patterns'], ['RAG', 'grounded AI']] as const).map(([value, label]) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5"><div className="text-lg font-black text-white">{value}</div><div className="text-[9px] uppercase tracking-wider text-slate-400">{label}</div></div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/[0.04] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid place-items-center"><BrainCircuit className="w-5 h-5 text-cyan-500" /></div>
          <div><h2 className="text-sm font-black">AI Intelligence Sync</h2><p className="text-[10px] text-slate-500">Public/official AI ecosystem metadata → provenance → RAG → Tutor evaluation. Sync is opt-in and requires a server-side operator token.</p></div>
          <span className="ml-auto text-[9px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500" aria-live="polite">{syncLabel}</span>
          <span title="Operator token is required; it is never sent to or stored in browser code." className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[10px] font-bold text-slate-500">OPERATOR TOKEN REQUIRED</span>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['Active items', intelligence?.metrics?.activeItems ?? intelligence?.lastRun?.activatedItems ?? '—'],
            ['Embeddings', intelligence?.metrics?.embeddings ?? '—'],
            ['Evaluations', intelligence?.metrics?.evaluations ?? '—'],
            ['Pass rate', intelligence?.metrics?.passRate == null ? '—' : `${Math.round(intelligence.metrics.passRate * 100)}%`],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3"><b className="block text-base">{value}</b><span className="text-[9px] text-slate-500">{label}</span></div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-slate-500">
          <span>Sources: <b>{intelligence?.sources?.length ?? '—'}</b></span><span>•</span>
          <span>Last evaluation: <b>{intelligence?.metrics?.lastEvaluationAt ? new Date(intelligence.metrics.lastEvaluationAt).toLocaleString() : '—'}</b></span><span>•</span>
          <span>Last sync: <b>{intelligence?.lastRun ? new Date(intelligence.lastRun.finishedAt).toLocaleString() : '—'}</b></span>
        </div>
      </section>

      <section>
        <div className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2"><Gauge className="w-4 h-4 text-cyan-500" /><span className="text-xs font-black">Resource-aware runtime</span><span className="text-[9px] font-bold px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-500">{resourcePolicyLabel(resourcePolicy)} budget</span><span className="text-[9px] text-slate-500">{resourcePolicy.deviceMemoryGb ? `~${resourcePolicy.deviceMemoryGb} GB browser estimate` : 'memory estimate unavailable'}</span><span className="text-[9px] text-slate-500">{resourcePolicy.hardwareConcurrency ? `${resourcePolicy.hardwareConcurrency} logical cores reported` : 'CPU hint unavailable'}</span>
            <div className="ml-auto flex items-center gap-2"><button type="button" onClick={() => setAutoBudget((current) => { const next = !current; localStorage.setItem('calcora_auto_budget', String(next)); return next; })} className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border ${autoBudget ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{autoBudget ? 'AUTO BUDGET' : 'MANUAL BUDGET'}</button><button type="button" onClick={() => setLeanMode((current) => !current)} className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border ${leanMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{leanMode ? 'LEAN ON' : 'LEAN OFF'}</button></div>
          </div>
          <div className="mt-2 text-[9px] text-slate-500 dark:text-slate-400">{resourcePolicy.reason} Visuals: <b>{resourcePolicy.visualizationQuality}</b> · concurrency budget: <b>{resourcePolicy.maxConcurrentTasks}</b>. These are browser hints, not exact OS measurements.</div>
        </div>
        <div className="flex items-center justify-between mb-3"><div><h2 className="text-base font-black text-slate-900 dark:text-white">Math Workbench</h2><p className="text-[11px] text-slate-500">One-click access to computation, learning and multimodal input.</p></div><span className="text-[10px] font-mono text-slate-400">9 CORE MODULES</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{workspaces.map(([id, title, description, Icon, accent]) => <FeatureCard key={id} title={title} description={description} icon={Icon} accent={accent} onClick={() => onNavigateTab(id)} />)}</div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-cyan-500" /><h3 className="text-sm font-black">Tutor Command Deck</h3><span className="ml-auto text-[9px] font-bold text-emerald-500">READY</span></div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {tutorCommands.map(([title, description, Icon]) => (
              <button key={title} onClick={() => onNavigateTab('ai')} className="text-left rounded-xl border border-slate-200 dark:border-slate-800 p-3 hover:border-violet-400/50 hover:bg-violet-500/5 transition">
                <Icon className="w-4 h-4 text-violet-500" />
                <div className="mt-2 text-[11px] font-bold">{title}</div>
                <div className="mt-1 text-[9px] leading-4 text-slate-500">{description}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-bold"><span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-500">Definition + intuition</span><span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-500">Socratic hints</span><span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">Deterministic verification</span><span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500">Domain checks</span></div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-5"><div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-black">Learning Center</h3></div><div className="mt-4 space-y-2">{learningTools.map(([title, description, Icon, target]) => <button key={title} onClick={() => onNavigateTab(target)} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 text-left hover:border-cyan-400/40 transition"><Icon className="w-4 h-4 text-cyan-500" /><span className="min-w-0"><b className="block text-[11px]">{title}</b><small className="block text-[9px] text-slate-500">{description}</small></span><ChevronRight className="w-3 h-3 ml-auto text-slate-400" /></button>)}</div></div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-500" /><h3 className="text-sm font-black">Multimodal Intake</h3><span className="ml-auto text-[9px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">OPEN WORKSPACE</span></div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">{multimodalTools.map(([title, description, Icon]) => <button key={title} onClick={() => onNavigateTab('multimodal')} className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 text-left hover:border-cyan-400/60 hover:bg-cyan-500/5 transition"><Icon className="w-4 h-4 text-cyan-500" /><div className="mt-2 text-[11px] font-bold">{title}</div><div className="text-[9px] text-slate-500 mt-1">{description}</div></button>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-5 text-white"><div className="flex items-center gap-2"><PlayCircle className="w-4 h-4 text-cyan-400" /><h3 className="text-sm font-black">Visualization Studio</h3><span className="ml-auto text-[9px] text-slate-500">2D function graphing available</span></div><div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2"><button type="button" onClick={() => onNavigateTab('graph')} className="rounded-xl bg-white/5 border border-cyan-400/20 p-3 text-left hover:bg-white/10 transition"><div className="h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-end gap-1 p-2">{[2, 5, 3, 7, 4].map((height, index) => <span key={index} style={{ height: `${height * 4}px` }} className="w-1.5 bg-cyan-400/70 rounded-full" />)}</div><div className="mt-2 text-[10px] font-bold">2D functions</div></button>{['Parametric', 'Implicit', 'Tables', '3D surfaces'].map((label) => <div key={label} className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-slate-400"><div className="h-10 grid place-items-center text-[10px] uppercase tracking-wide">Not implemented</div><div className="mt-2 text-[10px] font-bold">{label}</div></div>)}</div></section>
    </div>
  );
};
