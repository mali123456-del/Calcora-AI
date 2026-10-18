import React, { useState } from 'react';
import { runFullVerificationSuite, TestCaseResult } from '../engine/testEngine';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
  Cpu,
} from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [suiteResult, setSuiteResult] = useState(() => runFullVerificationSuite());
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const handleRerun = () => {
    setSuiteResult(runFullVerificationSuite());
  };

  const categories = ['all', ...Array.from(new Set(suiteResult.results.map((r) => r.category)))];

  const filteredTests =
    filterCategory === 'all'
      ? suiteResult.results
      : suiteResult.results.filter((r) => r.category === filterCategory);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Production Verification Suite"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display-math font-bold text-lg text-white">
                  Mathematical Engine Verification Suite
                </h2>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Phase 24
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated deterministic unit tests verifying arithmetic, precedence, equations, units, finance, and security.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center">
            <span className="text-[11px] text-slate-400">Total Test Cases</span>
            <span className="text-xl font-mono-math font-bold text-white">
              {suiteResult.total}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
            <span className="text-[11px] text-emerald-400">Passed</span>
            <span className="text-xl font-mono-math font-bold text-emerald-400">
              {suiteResult.passed}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center">
            <span className="text-[11px] text-rose-400">Failed</span>
            <span className="text-xl font-mono-math font-bold text-rose-400">
              {suiteResult.failed}
            </span>
          </div>
        </div>

        {/* Filter Bar & Rerun Button */}
        <div className="flex items-center justify-between p-3 px-5 border-b border-slate-800 bg-slate-900/40 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800/70 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Tests' : cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRerun}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rerun Suite</span>
          </button>
        </div>

        {/* Test Cases Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2">
          {filteredTests.map((test, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono-math transition-colors ${
                test.passed
                  ? 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700'
                  : 'bg-rose-950/30 border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <div className="text-slate-200 font-semibold truncate">
                    {test.testName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Input: <span className="text-cyan-300">{test.input}</span> | Expected:{' '}
                    <span className="text-emerald-300">{test.expected}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400">Actual: {test.actual}</span>
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded ${
                    test.passed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {test.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Deterministic RPN Evaluation • Zero eval() / Function() usage</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
