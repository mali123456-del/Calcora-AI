import React from 'react';
import {
  Calculator,
  TrendingUp,
  Binary,
  FunctionSquare,
  Layers,
  BarChart3,
  Wrench,
  ArrowRightLeft,
  DollarSign,
  BookOpen,
  Sparkles,
  Award,
  Clock,
  Mic,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { ActiveTab, HistoryItem } from '../types';

interface CommandCenterHomeProps {
  onNavigateTab: (tab: ActiveTab) => void;
  recentHistory: HistoryItem[];
  onReuseCalculation: (item: HistoryItem) => void;
  onOpenWorkspaces: () => void;
  onOpenAudit: () => void;
}

export const CommandCenterHome: React.FC<CommandCenterHomeProps> = ({
  onNavigateTab,
  recentHistory,
  onReuseCalculation,
  onOpenWorkspaces,
  onOpenAudit,
}) => {
  const tools = [
    {
      id: 'calculator' as ActiveTab,
      name: 'Scientific Calculator',
      description: 'Trigonometric, logarithmic, exact fractions, and powers.',
      icon: Calculator,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-500 border-cyan-500/30',
    },
    {
      id: 'graph' as ActiveTab,
      name: '2D Graphing Lab',
      description: 'Plot multi-function curves, roots, intersections, and extrema.',
      icon: TrendingUp,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-500 border-blue-500/30',
    },
    {
      id: 'equations' as ActiveTab,
      name: 'Equation Solver',
      description: 'Solve linear, quadratic, and systems with step derivations.',
      icon: Binary,
      color: 'from-indigo-500/20 to-purple-500/20 text-indigo-500 border-indigo-500/30',
    },
    {
      id: 'calculus' as ActiveTab,
      name: 'Calculus Workspace',
      description: 'Numerical derivatives, Simpson’s definite integrals, and limits.',
      icon: FunctionSquare,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-500 border-purple-500/30',
    },
    {
      id: 'matrix' as ActiveTab,
      name: 'Matrix & Vector Lab',
      description: 'Gaussian determinants, matrix inversion, dot and cross products.',
      icon: Layers,
      color: 'from-pink-500/20 to-rose-500/20 text-pink-500 border-pink-500/30',
    },
    {
      id: 'statistics' as ActiveTab,
      name: 'Statistics & Probability',
      description: 'Descriptive stats, linear regression, combinations, and binomial.',
      icon: BarChart3,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30',
    },
    {
      id: 'engineering' as ActiveTab,
      name: 'Engineering & Physics',
      description: 'Ohm’s law, electrical power, kinematics, and fluid pressure.',
      icon: Wrench,
      color: 'from-orange-500/20 to-amber-500/20 text-amber-600 border-amber-500/30',
    },
    {
      id: 'programmer' as ActiveTab,
      name: 'Programmer Calculator',
      description: 'Bitwise AND, OR, XOR, shifts, and 64-bit Hex/Dec/Bin.',
      icon: Binary,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30',
    },
    {
      id: 'units' as ActiveTab,
      name: 'Unit Converter',
      description: '16 categories across length, mass, data, temperature, and energy.',
      icon: ArrowRightLeft,
      color: 'from-teal-500/20 to-cyan-500/20 text-teal-500 border-teal-500/30',
    },
    {
      id: 'finance' as ActiveTab,
      name: 'Financial Calculators',
      description: 'Amortization schedules, compound interest, ROI, and inflation.',
      icon: DollarSign,
      color: 'from-green-500/20 to-emerald-500/20 text-green-500 border-green-500/30',
    },
    {
      id: 'formulas' as ActiveTab,
      name: 'Formula Library',
      description: 'Comprehensive mathematical formulas with one-click calculator use.',
      icon: BookOpen,
      color: 'from-indigo-500/20 to-cyan-500/20 text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'practice' as ActiveTab,
      name: 'Practice & Quizzes',
      description: 'Sharpen your mathematics skills with guided problem sets.',
      icon: Award,
      color: 'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30',
    },
  ];

  const aiPrompts = [
    { title: 'Solve Quadratic', prompt: 'Solve x^2 + 5x + 6 = 0 with step-by-step proof' },
    { title: 'Percentage Problem', prompt: 'What is 15 percent of 850?' },
    { title: 'Calculus Derivative', prompt: 'Explain how to find the derivative of x^3 - 4x + 2' },
    { title: 'Pythagorean Theorem', prompt: 'Explain the Pythagorean theorem with examples' },
  ];

  const lastCalc = recentHistory[0];

  return (
    <div id="command-center-container" className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 shadow-2xl text-white">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligent Mathematics Workbench</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Calculate. Understand. Visualize. Learn.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-normal">
            Deterministic mathematics engine for scientific rigor, complemented by a step-by-step AI tutor, Web Speech voice input, and LaTeX rendering.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('calculator')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Calculator className="w-4 h-4" />
              <span>Launch Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('ai')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Open AI Tutor</span>
            </button>
            <button
              type="button"
              onClick={onOpenWorkspaces}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              <span>Workspaces</span>
            </button>
          </div>
        </div>

        {/* Continue Last Calculation banner if available */}
        {lastCalc && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3.5 rounded-2xl border border-slate-700/40">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Continue Recent Calculation:
                </div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  {lastCalc.expression} = <span className="text-cyan-400">{lastCalc.result}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onReuseCalculation(lastCalc);
                onNavigateTab('calculator');
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 font-semibold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Resume in Calculator</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Grid of Workstation Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Mathematical Workspaces & Lab Tools
          </h3>
          <span className="text-xs text-slate-500 font-mono">12 Integrated Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                onClick={() => onNavigateTab(t.id)}
                className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center border shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                    {t.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {t.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-cyan-500 dark:group-hover:text-cyan-400">
                  <span>Launch Module</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Tutor Quick Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50/50 dark:from-purple-950/20 via-indigo-50/30 dark:via-indigo-950/20 to-transparent border border-purple-200/60 dark:border-purple-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200">
              AI Tutor & Voice Math Quick Prompts
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('ai')}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Open Full Tutor →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {aiPrompts.map((p, idx) => (
            <div
              key={idx}
              onClick={() => onNavigateTab('ai')}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-purple-200 dark:border-purple-500/20 hover:border-purple-400 shadow-xs cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {p.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                "{p.prompt}"
              </div>
              <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
