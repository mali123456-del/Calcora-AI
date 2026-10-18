import React, { useRef, useEffect, useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { AngleMode } from '../types';

interface DisplayProps {
  expression: string;
  currentInput: string;
  livePreview: string | null;
  angleMode: AngleMode;
  hasMemory: boolean;
  error: string | null;
  onClearError: () => void;
  fractionDisplay?: string | null;
  engineeringDisplay?: string | null;
  precision?: 'auto' | 2 | 4 | 6 | 8 | 10;
  onSetPrecision?: (p: 'auto' | 2 | 4 | 6 | 8 | 10) => void;
  onToggleFraction?: () => void;
}

export const Display: React.FC<DisplayProps> = ({
  expression,
  currentInput,
  livePreview,
  angleMode,
  hasMemory,
  error,
  onClearError,
  fractionDisplay,
  engineeringDisplay,
  precision = 'auto',
  onSetPrecision,
  onToggleFraction,
}) => {
  const [copied, setCopied] = useState(false);
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const exprScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end as user types
  useEffect(() => {
    if (inputScrollRef.current) {
      inputScrollRef.current.scrollLeft = inputScrollRef.current.scrollWidth;
    }
  }, [currentInput]);

  useEffect(() => {
    if (exprScrollRef.current) {
      exprScrollRef.current.scrollLeft = exprScrollRef.current.scrollWidth;
    }
  }, [expression]);

  const handleCopy = () => {
    const textToCopy = error ? '' : currentInput;
    if (!textToCopy) return;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextPrecision = () => {
    if (!onSetPrecision) return;
    const modes: ('auto' | 2 | 4 | 6 | 8 | 10)[] = ['auto', 2, 4, 6, 8, 10];
    const currIdx = modes.indexOf(precision);
    const nextIdx = (currIdx + 1) % modes.length;
    onSetPrecision(modes[nextIdx]);
  };

  return (
    <div
      role="region"
      aria-label="Calculator Display"
      className="relative w-full rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 p-4 sm:p-5 border border-slate-800 dark:border-slate-800 light:border-slate-300 shadow-inner flex flex-col justify-between min-h-[140px] sm:min-h-[160px] overflow-hidden"
    >
      {/* Top Bar: Angle Mode, Precision, Memory & Copy Button */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mb-2">
        <div className="flex flex-wrap items-center gap-2 font-mono-math">
          <span className="px-2 py-0.5 rounded bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 text-[11px] font-semibold tracking-wider">
            {angleMode}
          </span>

          {onSetPrecision && (
            <button
              type="button"
              onClick={nextPrecision}
              className="px-2 py-0.5 rounded bg-slate-800/60 dark:bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-[11px] font-semibold transition-colors"
              title="Click to cycle precision: auto, 2, 4, 6, 8, 10 decimals"
            >
              Prec: {precision === 'auto' ? 'Auto' : `${precision} dec`}
            </button>
          )}

          {hasMemory && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-bold">
              MEM
            </span>
          )}

          {/* Exact Fraction toggle badge */}
          {fractionDisplay && onToggleFraction && (
            <button
              type="button"
              onClick={onToggleFraction}
              className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
              title="Toggle between exact fraction and decimal"
            >
              <span>Exact: {fractionDisplay}</span>
              <span className="text-[11px] uppercase px-1 rounded bg-cyan-500/30">d/f</span>
            </button>
          )}

          {/* Engineering display badge */}
          {engineeringDisplay && !fractionDisplay && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px]">
              ENG: {engineeringDisplay}
            </span>
          )}
        </div>

        <button
          id="btn-copy-display"
          type="button"
          onClick={handleCopy}
          aria-label="Copy result to clipboard"
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200 hover:bg-slate-700/80 dark:hover:bg-slate-700/80 light:hover:bg-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-700 transition-colors"
          title="Copy current result"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Error notification banner if active */}
      {error && (
        <div
          role="alert"
          className="my-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-[11px] underline hover:text-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Expression Line (Previous formula) */}
      <div
        ref={exprScrollRef}
        className="w-full text-right overflow-x-auto whitespace-nowrap text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono-math text-sm sm:text-base py-1 scroll-smooth"
      >
        {expression || <span className="opacity-0">0</span>}
      </div>

      {/* Main Input & Result Display */}
      <div className="flex flex-col items-end w-full">
        <div
          ref={inputScrollRef}
          aria-live="polite"
          className={`w-full text-right overflow-x-auto whitespace-nowrap font-mono-math font-semibold tracking-tight scroll-smooth text-2xl xs:text-3xl sm:text-4xl ${
            error
              ? 'text-rose-400'
              : 'text-white dark:text-white light:text-slate-900'
          }`}
        >
          {currentInput}
        </div>

        {/* Live Calculation Preview */}
        {livePreview && !error && (
          <div className="text-xs sm:text-sm font-mono-math text-cyan-400/90 dark:text-cyan-400/90 light:text-cyan-600 font-medium flex items-center gap-1 mt-0.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Preview:</span>
            <span>= {livePreview}</span>
          </div>
        )}
      </div>
    </div>
  );
};
