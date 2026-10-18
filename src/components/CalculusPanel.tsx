import React, { useState } from 'react';
import { Play, RotateCcw, ArrowRight, Compass, Sparkles, BookOpen } from 'lucide-react';
import {
  numericalDerivative,
  numericalDefiniteIntegral,
  evaluateLimit,
} from '../engine/calculusEngine';

interface CalculusPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const CalculusPanel: React.FC<CalculusPanelProps> = ({ onSendToCalculator }) => {
  const [activeTab, setActiveTab] = useState<'derivative' | 'integral' | 'limit'>('derivative');

  // Derivative State
  const [diffExpr, setDiffExpr] = useState('x^3 - 3*x^2 + 2');
  const [diffAt, setDiffAt] = useState('2');
  const [diffOrder, setDiffOrder] = useState<1 | 2>(1);
  const [diffResult, setDiffResult] = useState<{
    value: number;
    tangentLine?: string;
    steps: string[];
  } | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Integral State
  const [intExpr, setIntExpr] = useState('sin(x)');
  const [intA, setIntA] = useState('0');
  const [intB, setIntB] = useState('pi');
  const [intResult, setIntResult] = useState<{
    value: number;
    intervals: number;
    steps: string[];
  } | null>(null);
  const [intError, setIntError] = useState<string | null>(null);

  // Limit State
  const [limitExpr, setLimitExpr] = useState('sin(x) / x');
  const [limitTo, setLimitTo] = useState('0');
  const [limitDir, setLimitDir] = useState<'both' | 'left' | 'right'>('both');
  const [limitResult, setLimitResult] = useState<{
    value: number | string;
    exists: boolean;
    steps: string[];
  } | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const handleComputeDerivative = () => {
    setDiffError(null);
    try {
      const at = parseFloat(diffAt);
      if (Number.isNaN(at)) throw new Error('Evaluation point x must be a number');
      const res = numericalDerivative(diffExpr, at, diffOrder);
      setDiffResult(res);
    } catch (err: any) {
      setDiffError(err.message || 'Failed to compute derivative');
      setDiffResult(null);
    }
  };

  const handleComputeIntegral = () => {
    setIntError(null);
    try {
      const a = intA.toLowerCase() === 'pi' ? Math.PI : parseFloat(intA);
      const b = intB.toLowerCase() === 'pi' ? Math.PI : parseFloat(intB);
      if (Number.isNaN(a) || Number.isNaN(b)) {
        throw new Error('Lower and upper limits must be valid numbers or "pi"');
      }
      const res = numericalDefiniteIntegral(intExpr, a, b);
      setIntResult(res);
    } catch (err: any) {
      setIntError(err.message || 'Failed to compute integral');
      setIntResult(null);
    }
  };

  const handleComputeLimit = () => {
    setLimitError(null);
    try {
      const to = limitTo.toLowerCase() === 'pi' ? Math.PI : parseFloat(limitTo);
      if (Number.isNaN(to)) throw new Error('Target point x must be a number');
      const res = evaluateLimit(limitExpr, to, limitDir);
      setLimitResult(res);
    } catch (err: any) {
      setLimitError(err.message || 'Failed to evaluate limit');
      setLimitResult(null);
    }
  };

  return (
    <div id="calculus-panel-container" className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-500" />
            Calculus Suite
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            High-precision numerical differentiation, Simpson's definite integration, and limits
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            id="tab-diff-btn"
            onClick={() => setActiveTab('derivative')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'derivative'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Derivative (d/dx)
          </button>
          <button
            id="tab-integral-btn"
            onClick={() => setActiveTab('integral')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'integral'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Integral (∫ dx)
          </button>
          <button
            id="tab-limit-btn"
            onClick={() => setActiveTab('limit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'limit'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Limit (lim x→c)
          </button>
        </div>
      </div>

      {/* Derivative Tab */}
      {activeTab === 'derivative' && (
        <div id="diff-tab-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Numerical Derivative Parameters</span>
                <span className="text-xs font-normal text-cyan-500">Central Finite Difference</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Function f(x)
                  </label>
                  <input
                    id="diff-expr-input"
                    type="text"
                    value={diffExpr}
                    onChange={(e) => setDiffExpr(e.target.value)}
                    placeholder="e.g. x^3 - 3*x^2 + 2"
                    className="w-full font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['x^2', 'sin(x)', 'cos(x)', 'e^x', 'ln(x)', 'x^3 - 4*x'].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setDiffExpr(ex)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Evaluate at x =
                    </label>
                    <input
                      id="diff-at-input"
                      type="text"
                      value={diffAt}
                      onChange={(e) => setDiffAt(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full font-mono text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Order of Derivative
                    </label>
                    <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800">
                      <button
                        onClick={() => setDiffOrder(1)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                          diffOrder === 1
                            ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        1st: f'(x)
                      </button>
                      <button
                        onClick={() => setDiffOrder(2)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                          diffOrder === 2
                            ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        2nd: f''(x)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  id="calc-diff-submit-btn"
                  onClick={handleComputeDerivative}
                  className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  Compute Derivative
                </button>

                {diffError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                    {diffError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Result & Tangent Equation</span>
                {diffResult && onSendToCalculator && (
                  <button
                    onClick={() => onSendToCalculator(String(diffResult.value))}
                    className="text-xs text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>Send to Calc</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </h3>

              {diffResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {diffOrder === 1 ? "f'(x) value" : "f''(x) value"} at x = {diffAt}
                    </div>
                    <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {diffResult.value}
                    </div>
                    {diffResult.tangentLine && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Tangent Line Equation:</div>
                        <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {diffResult.tangentLine}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Approximation Steps:
                    </h4>
                    <div className="space-y-1.5 font-mono text-xs">
                      {diffResult.steps.map((st, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Enter function and point, then click "Compute Derivative" to view results.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Integral Tab */}
      {activeTab === 'integral' && (
        <div id="integral-tab-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Definite Integral Parameters</span>
                <span className="text-xs font-normal text-cyan-500">Simpson's 1/3 Rule (n=1000)</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Integrand f(x)
                  </label>
                  <input
                    id="integral-expr-input"
                    type="text"
                    value={intExpr}
                    onChange={(e) => setIntExpr(e.target.value)}
                    placeholder="e.g. sin(x)"
                    className="w-full font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['sin(x)', 'x^2', '1/x', 'e^x', 'cos(x)', '3*x^2 + 2*x'].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setIntExpr(ex)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Lower Limit (a)
                    </label>
                    <input
                      id="integral-a-input"
                      type="text"
                      value={intA}
                      onChange={(e) => setIntA(e.target.value)}
                      placeholder="e.g. 0 or pi"
                      className="w-full font-mono text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Upper Limit (b)
                    </label>
                    <input
                      id="integral-b-input"
                      type="text"
                      value={intB}
                      onChange={(e) => setIntB(e.target.value)}
                      placeholder="e.g. pi or 10"
                      className="w-full font-mono text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <button
                  id="calc-integral-submit-btn"
                  onClick={handleComputeIntegral}
                  className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  Evaluate Definite Integral
                </button>

                {intError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                    {intError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Integral Value</span>
                {intResult && onSendToCalculator && (
                  <button
                    onClick={() => onSendToCalculator(String(intResult.value))}
                    className="text-xs text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>Send to Calc</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </h3>

              {intResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      ∫ [ {intA} to {intB} ] {intExpr} dx
                    </div>
                    <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {intResult.value}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Evaluation partitions: {intResult.intervals} Simpson parabolas
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Integration Steps:
                    </h4>
                    <div className="space-y-1.5 font-mono text-xs">
                      {intResult.steps.map((st, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Set integrand and integration limits [a, b], then evaluate.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Limit Tab */}
      {activeTab === 'limit' && (
        <div id="limit-tab-content" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Limit Target & Direction</span>
                <span className="text-xs font-normal text-cyan-500">Adaptive Convergence</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Function f(x)
                  </label>
                  <input
                    id="limit-expr-input"
                    type="text"
                    value={limitExpr}
                    onChange={(e) => setLimitExpr(e.target.value)}
                    placeholder="e.g. sin(x) / x"
                    className="w-full font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['sin(x)/x', '(x^2 - 1)/(x - 1)', '(1 + 1/x)^x', '1/x'].map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setLimitExpr(ex)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Approaching x →
                    </label>
                    <input
                      id="limit-to-input"
                      type="text"
                      value={limitTo}
                      onChange={(e) => setLimitTo(e.target.value)}
                      placeholder="e.g. 0 or 1"
                      className="w-full font-mono text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Direction
                    </label>
                    <select
                      id="limit-dir-select"
                      value={limitDir}
                      onChange={(e: any) => setLimitDir(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="both">Two-sided (x → c)</option>
                      <option value="left">Left-sided (x → c⁻)</option>
                      <option value="right">Right-sided (x → c⁺)</option>
                    </select>
                  </div>
                </div>

                <button
                  id="calc-limit-submit-btn"
                  onClick={handleComputeLimit}
                  className="w-full py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  Evaluate Limit
                </button>

                {limitError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                    {limitError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                <span>Limit Value</span>
                {limitResult && limitResult.exists && onSendToCalculator && (
                  <button
                    onClick={() => onSendToCalculator(String(limitResult.value))}
                    className="text-xs text-cyan-500 hover:underline flex items-center gap-1"
                  >
                    <span>Send to Calc</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </h3>

              {limitResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      lim (x → {limitTo}) {limitExpr}
                    </div>
                    <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {String(limitResult.value)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {limitResult.exists ? 'Limit exists & converges' : 'Limit is undefined or diverges'}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Approximation Steps:
                    </h4>
                    <div className="space-y-1.5 font-mono text-xs">
                      {limitResult.steps.map((st, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                        >
                          {st}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Enter function and approaching point, then evaluate limit.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
