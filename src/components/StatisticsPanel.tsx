import React, { useState } from 'react';
import { BarChart3, TrendingUp, Play, ArrowRight, RotateCcw } from 'lucide-react';
import {
  parseDataset,
  computeStatistics,
  computeLinearRegression,
  calculateZScore,
} from '../engine/statisticsEngine';
import {
  permutations,
  combinations,
  binomialProbability,
  discreteExpectedValue,
} from '../engine/probabilityEngine';
import { StatisticsResult, RegressionResult } from '../types';

interface StatisticsPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ onSendToCalculator }) => {
  const [activeTab, setActiveTab] = useState<'descriptive' | 'regression' | 'probability'>('descriptive');

  // Descriptive Statistics State
  const [rawInput, setRawInput] = useState<string>('12, 15, 18, 22, 22, 25, 30, 35, 42');
  const [statsResult, setStatsResult] = useState<StatisticsResult | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Z-Score State
  const [targetX, setTargetX] = useState<string>('25');
  const [zScoreResult, setZScoreResult] = useState<number | null>(null);

  // Regression State
  const [rawPairs, setRawPairs] = useState<string>('1, 2\n2, 3.5\n3, 5\n4, 6.8\n5, 9.1');
  const [regressionResult, setRegressionResult] = useState<RegressionResult | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Probability State
  const [permN, setPermN] = useState<string>('8');
  const [permR, setPermR] = useState<string>('3');
  const [permResult, setPermResult] = useState<any>(null);

  const [combN, setCombN] = useState<string>('10');
  const [combR, setCombR] = useState<string>('4');
  const [combResult, setCombResult] = useState<any>(null);

  const [binomN, setBinomN] = useState<string>('10');
  const [binomK, setBinomK] = useState<string>('3');
  const [binomP, setBinomP] = useState<string>('0.5');
  const [binomResult, setBinomResult] = useState<any>(null);
  const [probError, setProbError] = useState<string | null>(null);

  const handleComputeStats = () => {
    setStatsError(null);
    try {
      const data = parseDataset(rawInput);
      if (data.length === 0) {
        throw new Error('Please enter at least one number');
      }
      const res = computeStatistics(data);
      setStatsResult(res);

      // Also compute z score if targetX is set
      const xVal = parseFloat(targetX);
      if (!Number.isNaN(xVal) && res.stdDevSample > 0) {
        setZScoreResult(calculateZScore(xVal, res.mean, res.stdDevSample));
      }
    } catch (err: any) {
      setStatsError(err.message || 'Failed to compute statistics');
      setStatsResult(null);
    }
  };

  const handleComputeZScore = () => {
    if (!statsResult) return;
    const xVal = parseFloat(targetX);
    if (!Number.isNaN(xVal)) {
      setZScoreResult(calculateZScore(xVal, statsResult.mean, statsResult.stdDevSample));
    }
  };

  const handleComputeRegression = () => {
    setRegError(null);
    try {
      const lines = rawPairs.split('\n');
      const points: { x: number; y: number }[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/[\s,;\t]+/);
        if (parts.length >= 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!Number.isNaN(x) && !Number.isNaN(y)) {
            points.push({ x, y });
          }
        }
      }

      if (points.length < 2) {
        throw new Error('Please provide at least 2 coordinate pairs (x, y)');
      }

      const res = computeLinearRegression(points);
      setRegressionResult(res);
    } catch (err: any) {
      setRegError(err.message || 'Failed to compute regression');
      setRegressionResult(null);
    }
  };

  const handleComputePermutation = () => {
    setProbError(null);
    try {
      const n = parseInt(permN, 10);
      const r = parseInt(permR, 10);
      const res = permutations(n, r);
      setPermResult(res);
    } catch (e: any) {
      setProbError(e.message || 'Error computing permutation');
      setPermResult(null);
    }
  };

  const handleComputeCombination = () => {
    setProbError(null);
    try {
      const n = parseInt(combN, 10);
      const r = parseInt(combR, 10);
      const res = combinations(n, r);
      setCombResult(res);
    } catch (e: any) {
      setProbError(e.message || 'Error computing combination');
      setCombResult(null);
    }
  };

  const handleComputeBinomial = () => {
    setProbError(null);
    try {
      const n = parseInt(binomN, 10);
      const k = parseInt(binomK, 10);
      const p = parseFloat(binomP);
      const res = binomialProbability(n, k, p);
      setBinomResult(res);
    } catch (e: any) {
      setProbError(e.message || 'Error computing binomial distribution');
      setBinomResult(null);
    }
  };

  return (
    <div id="statistics-panel-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            Statistics & Probability Lab
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Descriptive statistics, dispersion, linear regression, and combinatorics / probability distributions.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('descriptive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'descriptive'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Descriptive
          </button>
          <button
            onClick={() => setActiveTab('regression')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'regression'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Regression
          </button>
          <button
            onClick={() => setActiveTab('probability')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'probability'
                ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Probability
          </button>
        </div>
      </div>

      {activeTab === 'descriptive' && (
        <div id="descriptive-stats-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dataset Input */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Dataset Input
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Enter values separated by commas, spaces, or newlines
              </p>
              <textarea
                id="stats-dataset-input"
                rows={4}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full font-mono text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />

              <div className="flex gap-2 mt-3">
                <button
                  id="stats-calc-btn"
                  onClick={handleComputeStats}
                  className="flex-1 py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Play className="w-4 h-4" />
                  Compute Statistics
                </button>
              </div>

              {statsError && (
                <div className="p-3 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                  {statsError}
                </div>
              )}

              {/* Z-Score tool */}
              {statsResult && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Z-Score Calculator
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetX}
                      onChange={(e) => setTargetX(e.target.value)}
                      placeholder="Value x"
                      className="w-24 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      onClick={handleComputeZScore}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 transition-colors"
                    >
                      Calculate Z
                    </button>
                    {zScoreResult !== null && (
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white ml-2">
                        z = {zScoreResult}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-7 space-y-4">
            {statsResult ? (
              <div className="space-y-4">
                {/* Central Tendency Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400">Count (n)</div>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {statsResult.count}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400">Mean (x̄)</div>
                    <div className="text-xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {statsResult.mean}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400">Median</div>
                    <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {statsResult.median}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400">Sum (∑x)</div>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {statsResult.sum}
                    </div>
                  </div>
                </div>

                {/* Dispersion & Quartiles */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dispersion & Quartiles
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block">Sample Std Dev (s):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.stdDevSample}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pop Std Dev (σ):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.stdDevPopulation}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sample Variance (s²):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.varianceSample}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Min / Max:</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.min} / {statsResult.max}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Range:</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.range}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Quartiles (Q1 / Q3 / IQR):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {statsResult.q1} / {statsResult.q3} (IQR: {statsResult.iqr})
                      </strong>
                    </div>
                  </div>
                </div>

                {onSendToCalculator && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => onSendToCalculator(String(statsResult.mean))}
                      className="text-xs text-cyan-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Send Mean ({statsResult.mean}) to Scientific Calculator</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                Enter dataset on the left and click "Compute Statistics" to view analysis.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGRESSION */}
      {activeTab === 'regression' && (
        <div id="regression-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                Paired Data (x, y)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                One coordinate pair per line (e.g. "1, 2" or "2.5 4.8")
              </p>
              <textarea
                id="regression-dataset-input"
                rows={6}
                value={rawPairs}
                onChange={(e) => setRawPairs(e.target.value)}
                className="w-full font-mono text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />

              <button
                id="regression-calc-btn"
                onClick={handleComputeRegression}
                className="w-full mt-3 py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <TrendingUp className="w-4 h-4" />
                Fit Linear Model
              </button>

              {regError && (
                <div className="p-3 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                  {regError}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {regressionResult ? (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <div className="text-xs text-slate-400">Best-Fit Equation</div>
                  <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                    {regressionResult.equation}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block">Slope (m):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {regressionResult.slope}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Intercept (b):</span>
                      <strong className="text-slate-900 dark:text-white text-sm">
                        {regressionResult.intercept}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Correlation (r):</span>
                      <strong className="text-emerald-500 text-sm">{regressionResult.r}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">R² Score:</span>
                      <strong className="text-emerald-500 text-sm">{regressionResult.rSquared}</strong>
                    </div>
                  </div>
                </div>

                {/* Residuals Table Preview */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Residuals Table
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                          <th className="py-1.5">x</th>
                          <th className="py-1.5">y Actual</th>
                          <th className="py-1.5">ŷ Predicted</th>
                          <th className="py-1.5">Residual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regressionResult.residuals.map((r, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800/60">
                            <td className="py-1.5">{r.x}</td>
                            <td className="py-1.5">{r.y}</td>
                            <td className="py-1.5 text-cyan-500">{r.predicted}</td>
                            <td className="py-1.5 text-slate-500">{r.residual}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                Enter paired coordinates (x, y) and fit the linear model to compute regression.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROBABILITY & COMBINATORICS */}
      {activeTab === 'probability' && (
        <div id="probability-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Permutations & Combinations (Col 6) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Permutations Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Permutations: nPr = n! / (n - r)!
                </h3>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                  Order Matters
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Total items (n)</label>
                  <input
                    type="number"
                    min="0"
                    value={permN}
                    onChange={(e) => setPermN(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Items arranged (r)</label>
                  <input
                    type="number"
                    min="0"
                    value={permR}
                    onChange={(e) => setPermR(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleComputePermutation}
                className="w-full py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition-colors"
              >
                Compute nPr
              </button>

              {permResult && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{permN}P{permR} = </span>
                    <span className="font-mono text-cyan-500 font-bold text-sm ml-1">{permResult.result}</span>
                  </div>
                  {onSendToCalculator && (
                    <button
                      type="button"
                      onClick={() => onSendToCalculator(String(permResult.result))}
                      className="text-[11px] text-cyan-500 hover:underline flex items-center gap-1"
                    >
                      <span>Insert</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Combinations Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Combinations: nCr = n! / [r! (n - r)!]
                </h3>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                  Order Does Not Matter
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Total items (n)</label>
                  <input
                    type="number"
                    min="0"
                    value={combN}
                    onChange={(e) => setCombN(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Items chosen (r)</label>
                  <input
                    type="number"
                    min="0"
                    value={combR}
                    onChange={(e) => setCombR(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleComputeCombination}
                className="w-full py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition-colors"
              >
                Compute nCr
              </button>

              {combResult && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{combN}C{combR} = </span>
                    <span className="font-mono text-cyan-500 font-bold text-sm ml-1">{combResult.result}</span>
                  </div>
                  {onSendToCalculator && (
                    <button
                      type="button"
                      onClick={() => onSendToCalculator(String(combResult.result))}
                      className="text-[11px] text-cyan-500 hover:underline flex items-center gap-1"
                    >
                      <span>Insert</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Binomial Distribution (Col 6) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Binomial Probability: P(X = k) = C(n, k) · p^k · (1 - p)^(n - k)
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Trials (n)</label>
                  <input
                    type="number"
                    min="1"
                    value={binomN}
                    onChange={(e) => setBinomN(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Successes (k)</label>
                  <input
                    type="number"
                    min="0"
                    value={binomK}
                    onChange={(e) => setBinomK(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Prob of success (p)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={binomP}
                    onChange={(e) => setBinomP(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {probError && (
                <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">{probError}</p>
              )}

              <button
                type="button"
                onClick={handleComputeBinomial}
                className="w-full py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition-colors"
              >
                Compute Binomial Distribution
              </button>

              {binomResult && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-semibold">Exact P(X = {binomK}):</span>
                    <span className="font-mono text-cyan-500 font-bold text-sm">
                      {binomResult.exactProbability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span className="text-xs text-slate-500 font-semibold">Cumulative P(X ≤ {binomK}):</span>
                    <span className="font-mono text-cyan-500 font-bold text-sm">
                      {binomResult.cumulativeLessThanOrEqual}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px] font-mono text-slate-500 space-y-0.5">
                    {binomResult.steps.map((st: string, idx: number) => (
                      <div key={idx}>{st}</div>
                    ))}
                  </div>

                  {onSendToCalculator && (
                    <button
                      type="button"
                      onClick={() => onSendToCalculator(String(binomResult.exactProbability))}
                      className="text-[11px] text-cyan-500 hover:underline flex items-center gap-1 self-end"
                    >
                      <span>Insert P(X={binomK})</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
