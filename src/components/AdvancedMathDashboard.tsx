import React, { useEffect, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  GraduationCap,
  Grid3X3,
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
  onClick?: () => void;
};

/**
 * One card shape, one accent. The previous version gave each of the nine
 * modules its own hue (cyan, blue, indigo, purple, pink, amber, emerald,
 * violet), which read as decoration rather than information. Colour now
 * signals state only; the icon carries the identity.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, badge, onClick }) => (
  <button type="button" onClick={onClick} className="cc-card cc-card-hover p-[18px]">
    <div className="flex items-start justify-between gap-3">
      <span className="cc-icon-tile">
        <Icon aria-hidden="true" />
      </span>
      {badge && <span className="cc-chip cc-chip-accent">{badge}</span>}
    </div>
    <div className="mt-3 text-[15px] font-bold">{title}</div>
    <div className="mt-1 text-[12.5px] leading-5 cc-muted">{description}</div>
    <div className="mt-3 flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--cc-accent)' }}>
      Open workspace <ChevronRight aria-hidden="true" />
    </div>
  </button>
);

const workspaces: Array<{ id: ActiveTab; title: string; description: string; icon: React.ElementType; badge?: string }> = [
  { id: 'calculator', title: 'Scientific Calculator', description: 'Exact fractions, trig, logs, powers and memory.', icon: Calculator },
  { id: 'multimodal', title: 'Voice • PDF • Input Studio', description: 'Browser-supported voice and local PDF text extraction; image/ink recognition is unavailable.', icon: Camera, badge: 'Studio' },
  { id: 'graph', title: '2D Graphing Lab', description: 'Plot up to four y=f(x) expressions with approximate root detection and coordinate tracing.', icon: LineChart },
  { id: 'equations', title: 'Equation Solver', description: 'Linear, quadratic and systems with verified steps.', icon: Workflow },
  { id: 'calculus', title: 'Calculus Studio', description: 'Limits, derivatives, integrals and numerical checks.', icon: Activity },
  { id: 'matrix', title: 'Linear Algebra', description: 'Matrices, vectors, determinants and transformations.', icon: Grid3X3 },
  { id: 'statistics', title: 'Statistics Lab', description: 'Distributions, regression, probability and data analysis.', icon: ListChecks },
  { id: 'practice', title: 'Practice Arena', description: 'Adaptive-style drills, quizzes, hints and review.', icon: Trophy },
  { id: 'ai', title: 'AI Mathematical Tutor', description: 'Grounded explanations, alternate methods and error diagnosis.', icon: BrainCircuit, badge: 'Local' },
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

  const heroStats: Array<[string, string]> = [
    ['13+', 'workspaces'],
    ['82+', 'knowledge concepts'],
    ['25', 'tutor patterns'],
    ['RAG', 'grounded AI'],
  ];

  return (
    <div className="space-y-7 pb-8 animate-in fade-in duration-300">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="cc-hero">
        <div
          aria-hidden="true"
          className="absolute -right-16 -bottom-24 w-72 h-72 rounded-full"
          style={{ border: '1px solid var(--cc-accent-border)', opacity: 0.55 }}
        />
        <div aria-hidden="true" className="absolute right-8 top-6" style={{ color: 'var(--cc-accent)', opacity: 0.14 }}>
          <Orbit className="w-28 h-28" />
        </div>

        <div className="relative max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="cc-chip cc-chip-accent">
              <Sparkles aria-hidden="true" /> Calcora Intelligence OS
            </span>
            <span className="cc-chip cc-chip-success">
              <CheckCircle2 aria-hidden="true" /> Deterministic-first
            </span>
            <span className="cc-chip">
              <Network aria-hidden="true" /> Local knowledge
            </span>
          </div>

          {/*
            h2, not h1: the application shell already owns the document's single
            h1 (the brand). Two h1s made the heading outline ambiguous for a
            screen reader, so this is the section heading it actually is.
          */}
          <h2>Calculate. Prove. Visualize. Learn.</h2>

          <p className="mt-3 max-w-2xl text-[14px] leading-6">
            A unified mathematics workbench combining deterministic calculation, multimodal input,
            interactive visualization, guided tutoring, practice, verification and persistent
            mathematical knowledge.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigateTab('calculator')} className="cc-btn cc-btn-primary">
              <Calculator aria-hidden="true" /> Launch Calculator
            </button>
            <button type="button" onClick={() => onNavigateTab('multimodal')} className="cc-btn">
              <Camera aria-hidden="true" /> Scan / Voice / Ink
            </button>
            <button type="button" onClick={() => onNavigateTab('ai')} className="cc-btn">
              <BrainCircuit aria-hidden="true" /> Open Tutor
            </button>
            <button type="button" onClick={() => onNavigateTab('graph')} className="cc-btn">
              <LineChart aria-hidden="true" /> Graph Lab
            </button>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {heroStats.map(([value, label]) => (
            <div key={label} className="cc-stat">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Intelligence sync                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="cc-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="cc-icon-tile"><BrainCircuit aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold m-0">AI Intelligence Sync</h2>
            <p className="text-[12.5px] cc-muted m-0 mt-0.5">
              Public/official AI ecosystem metadata → provenance → RAG → Tutor evaluation. Sync is
              opt-in and requires a server-side operator token.
            </p>
          </div>
          <span className="ml-auto cc-chip cc-chip-success" aria-live="polite">{syncLabel}</span>
          <span
            title="Operator token is required; it is never sent to or stored in browser code."
            className="cc-chip"
          >
            Operator token required
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {([
            ['Active items', intelligence?.metrics?.activeItems ?? intelligence?.lastRun?.activatedItems ?? '—'],
            ['Embeddings', intelligence?.metrics?.embeddings ?? '—'],
            ['Evaluations', intelligence?.metrics?.evaluations ?? '—'],
            ['Pass rate', intelligence?.metrics?.passRate == null ? '—' : `${Math.round(intelligence.metrics.passRate * 100)}%`],
          ] as Array<[string, unknown]>).map(([label, value]) => (
            <div key={label} className="cc-stat">
              <b>{String(value)}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] cc-faint">
          <span>Sources: <b>{intelligence?.sources?.length ?? '—'}</b></span>
          <span>Last evaluation: <b>{intelligence?.metrics?.lastEvaluationAt ? new Date(intelligence.metrics.lastEvaluationAt).toLocaleString() : '—'}</b></span>
          <span>Last sync: <b>{intelligence?.lastRun ? new Date(intelligence.lastRun.finishedAt).toLocaleString() : '—'}</b></span>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Resource budget + module grid                                     */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="cc-card p-4 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Gauge aria-hidden="true" style={{ color: 'var(--cc-accent)' }} className="w-4 h-4" />
            <span className="text-[12.5px] font-bold">Resource-aware runtime</span>
            <span className="cc-chip cc-chip-accent">{resourcePolicyLabel(resourcePolicy)} budget</span>
            <span className="text-[11px] cc-faint">
              {resourcePolicy.deviceMemoryGb ? `~${resourcePolicy.deviceMemoryGb} GB browser estimate` : 'memory estimate unavailable'}
            </span>
            <span className="text-[11px] cc-faint">
              {resourcePolicy.hardwareConcurrency ? `${resourcePolicy.hardwareConcurrency} logical cores reported` : 'CPU hint unavailable'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoBudget((current) => { const next = !current; localStorage.setItem('calcora_auto_budget', String(next)); return next; })}
                className={autoBudget ? 'cc-btn cc-btn-active' : 'cc-btn'}
                aria-pressed={autoBudget}
              >
                {autoBudget ? 'Auto budget' : 'Manual budget'}
              </button>
              <button
                type="button"
                onClick={() => setLeanMode((current) => !current)}
                className={leanMode ? 'cc-btn cc-btn-active' : 'cc-btn'}
                aria-pressed={leanMode}
              >
                {leanMode ? 'Lean on' : 'Lean off'}
              </button>
            </div>
          </div>
          <div className="mt-2 text-[11px] cc-faint">
            {resourcePolicy.reason} Visuals: <b>{resourcePolicy.visualizationQuality}</b> ·
            concurrency budget: <b>{resourcePolicy.maxConcurrentTasks}</b>. These are browser hints,
            not exact OS measurements.
          </div>
        </div>

        <div className="cc-section-head">
          <div>
            <span className="cc-eyebrow">Math workbench</span>
            <h2>Nine core modules</h2>
            <p>One-click access to computation, learning and multimodal input.</p>
          </div>
          <span className="text-[11px] font-mono cc-faint">9 CORE MODULES</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map(({ id, title, description, icon, badge }) => (
            <FeatureCard
              key={id}
              title={title}
              description={description}
              icon={icon}
              badge={badge}
              onClick={() => onNavigateTab(id)}
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Tutor deck + learning centre                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 cc-card p-5">
          <div className="flex items-center gap-2">
            <span className="cc-icon-tile" style={{ width: 32, height: 32 }}><Gauge aria-hidden="true" /></span>
            <h3 className="text-[15px] font-bold m-0">Tutor Command Deck</h3>
            <span className="ml-auto cc-chip cc-chip-success">Ready</span>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {tutorCommands.map(([title, description, Icon]) => (
              <button
                key={title}
                type="button"
                onClick={() => onNavigateTab('ai')}
                className="cc-card-quiet cc-card-hover p-3"
              >
                <Icon aria-hidden="true" style={{ color: 'var(--cc-accent)' }} className="w-4 h-4" />
                <div className="mt-2 text-[12.5px] font-bold">{title}</div>
                <div className="mt-1 text-[11px] leading-4 cc-muted">{description}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="cc-chip cc-chip-accent">Definition + intuition</span>
            <span className="cc-chip">Socratic hints</span>
            <span className="cc-chip cc-chip-success">Deterministic verification</span>
            <span className="cc-chip cc-chip-warning">Domain checks</span>
          </div>
        </div>

        <div className="cc-card p-5">
          <div className="flex items-center gap-2">
            <span className="cc-icon-tile" style={{ width: 32, height: 32 }}><GraduationCap aria-hidden="true" /></span>
            <h3 className="text-[15px] font-bold m-0">Learning Center</h3>
          </div>
          <div className="mt-4 space-y-2">
            {learningTools.map(([title, description, Icon, target]) => (
              <button
                key={title}
                type="button"
                onClick={() => onNavigateTab(target)}
                className="w-full flex items-center gap-3 p-2.5 rounded-[var(--cc-radius-md)] cc-card-quiet cc-card-hover text-left"
              >
                <Icon aria-hidden="true" style={{ color: 'var(--cc-accent)' }} className="w-4 h-4 shrink-0" />
                <span className="min-w-0">
                  <b className="block text-[12.5px]">{title}</b>
                  <small className="block text-[11px] cc-muted">{description}</small>
                </span>
                <ChevronRight aria-hidden="true" className="w-3 h-3 ml-auto cc-faint" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Multimodal intake                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="cc-card p-5">
        <div className="flex items-center gap-2">
          <span className="cc-icon-tile" style={{ width: 32, height: 32 }}><Camera aria-hidden="true" /></span>
          <h3 className="text-[15px] font-bold m-0">Multimodal Intake</h3>
          <span className="ml-auto cc-chip cc-chip-success">Open workspace</span>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {multimodalTools.map(([title, description, Icon]) => (
            <button
              key={title}
              type="button"
              onClick={() => onNavigateTab('multimodal')}
              className="cc-card-quiet cc-card-hover p-3"
            >
              <Icon aria-hidden="true" style={{ color: 'var(--cc-accent)' }} className="w-4 h-4" />
              <div className="mt-2 text-[12.5px] font-bold">{title}</div>
              <div className="mt-1 text-[11px] cc-muted">{description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Visualization studio — including honest not-implemented states    */}
      {/* ---------------------------------------------------------------- */}
      <section className="cc-card p-5">
        <div className="flex items-center gap-2">
          <span className="cc-icon-tile" style={{ width: 32, height: 32 }}><PlayCircle aria-hidden="true" /></span>
          <h3 className="text-[15px] font-bold m-0">Visualization Studio</h3>
          <span className="ml-auto text-[11px] cc-faint">2D function graphing available</span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('graph')}
            className="cc-card-quiet cc-card-hover p-3 text-left"
          >
            <div className="h-10 rounded-[var(--cc-radius-sm)] flex items-end gap-1 p-2" style={{ background: 'var(--cc-accent-soft)' }}>
              {[2, 5, 3, 7, 4].map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height * 4}px`, background: 'var(--cc-accent)', opacity: 0.75 }}
                  className="w-1.5 rounded-full"
                />
              ))}
            </div>
            <div className="mt-2 text-[11px] font-bold">2D functions</div>
          </button>

          {['Parametric', 'Implicit', 'Tables', '3D surfaces'].map((label) => (
            <div
              key={label}
              className="rounded-[var(--cc-radius-md)] border border-dashed p-3"
              style={{ borderColor: 'var(--cc-border-strong)', background: 'var(--cc-surface-2)' }}
            >
              <div className="h-10 grid place-items-center text-[11px] font-semibold uppercase tracking-wide cc-faint">
                Not implemented
              </div>
              <div className="mt-2 text-[11px] font-bold cc-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
