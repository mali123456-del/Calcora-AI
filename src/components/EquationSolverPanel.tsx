import React, { useState } from 'react';
import { solveEquation } from '../engine/equationSolver';
import { EquationSolution } from '../types';
import { Binary, CheckCircle, AlertTriangle, ArrowRight, CornerDownRight } from 'lucide-react';

interface EquationSolverPanelProps {
  onApplyResultToCalculator?: (expr: string) => void;
}

const PRESET_EQUATIONS = [
  'x² + 5x + 6 = 0',
  '2x + 5 = 15',
  'x² - 9 = 0',
  '3x - 12 = 0',
  '2x² - 4x - 6 = 0',
  'x² + 4x + 4 = 0',
];

export const EquationSolverPanel: React.FC<EquationSolverPanelProps> = ({
  onApplyResultToCalculator,
}) => {
  const [inputEq, setInputEq] = useState('x² + 5x + 6 = 0');
  const [solution, setSolution] = useState<EquationSolution>(() =>
    solveEquation('x² + 5x + 6 = 0')
  );

  const handleSolve = (eqToSolve?: string) => {
    const target = eqToSolve !== undefined ? eqToSolve : inputEq;
    const res = solveEquation(target);
    setSolution(res);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display-math font-bold text-base text-white dark:text-white light:text-slate-900">
              Analytical Equation Solver
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600">
              Solves linear and quadratic equations with step-by-step mathematical proofs.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 hidden lg:inline">Presets:</span>
          {PRESET_EQUATIONS.slice(0, 4).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setInputEq(preset);
                handleSolve(preset);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white hover:bg-slate-700 transition-colors font-mono-math"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSolve();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <input
            id="equation-input"
            type="text"
            value={inputEq}
            onChange={(e) => setInputEq(e.target.value)}
            placeholder="e.g. 2x + 5 = 15 or x² + 5x + 6 = 0"
            className="w-full px-4 py-3 rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 text-white dark:text-white light:text-slate-900 font-mono-math text-base focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-inner"
          />
        </div>
        <button
          id="btn-solve-equation"
          type="submit"
          className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-98 flex items-center justify-center gap-2"
        >
          <span>Solve</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Solution Display Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 shadow-sm flex flex-col gap-4">
        {/* Solution Header & Roots */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            {solution.isValid && !solution.error ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Classification:
              </span>
              <span className="ml-1.5 text-xs font-bold text-cyan-400 uppercase">
                {solution.type}
              </span>
            </div>
          </div>

          {/* Solutions Badges */}
          {solution.solutions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Roots:</span>
              {solution.solutions.map((root, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onApplyResultToCalculator?.(String(root))}
                  title="Click to copy root into main calculator"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono-math text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                >
                  <span>{solution.variables[0] || 'x'} = {root}</span>
                  <CornerDownRight className="w-3 h-3 text-emerald-400 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Explanation Summary */}
        <div className="text-sm font-medium text-slate-200 dark:text-slate-200 light:text-slate-800">
          {solution.explanation}
        </div>

        {/* Step-by-Step Proof */}
        {solution.steps.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              Step-by-Step Derivation:
            </h3>
            <div className="flex flex-col gap-1.5 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 p-3.5 rounded-xl border border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 font-mono-math text-xs sm:text-sm">
              {solution.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 py-0.5">
                  <span className="text-cyan-400/80 font-bold shrink-0">{idx + 1}.</span>
                  <span className="text-slate-300 dark:text-slate-300 light:text-slate-700">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
