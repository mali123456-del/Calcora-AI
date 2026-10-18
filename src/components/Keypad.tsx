import React, { useState } from 'react';
import { Delete, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { AngleMode } from '../types';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperator: (op: string) => void;
  onFunction: (fn: string) => void;
  onConstant: (c: string) => void;
  onParenthesis: (p: '(' | ')') => void;
  onFactorial: () => void;
  onPercentage: () => void;
  onReciprocal: () => void;
  onSquare: () => void;
  onToggleSign: () => void;
  onClearAll: () => void;
  onClearEntry: () => void;
  onBackspace: () => void;
  onCalculate: () => void;
  onMemoryClear: () => void;
  onMemoryRecall: () => void;
  onMemoryStore: () => void;
  onMemoryAdd: () => void;
  onMemorySubtract: () => void;
  hasMemory: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  onDigit,
  onDecimal,
  onOperator,
  onFunction,
  onConstant,
  onParenthesis,
  onFactorial,
  onPercentage,
  onReciprocal,
  onSquare,
  onToggleSign,
  onClearAll,
  onClearEntry,
  onBackspace,
  onCalculate,
  onMemoryClear,
  onMemoryRecall,
  onMemoryStore,
  onMemoryAdd,
  onMemorySubtract,
  hasMemory,
}) => {
  const [showScientificMobile, setShowScientificMobile] = useState(true);
  const [isSecondTrig, setIsSecondTrig] = useState(false);

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Memory Row */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <button
          id="btn-mem-clear"
          type="button"
          onClick={onMemoryClear}
          disabled={!hasMemory}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            hasMemory
              ? 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-900/40 text-slate-600 dark:text-slate-600 light:text-slate-400 cursor-not-allowed'
          }`}
          title="Clear Memory (MC)"
        >
          MC
        </button>
        <button
          id="btn-mem-recall"
          type="button"
          onClick={onMemoryRecall}
          disabled={!hasMemory}
          className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
            hasMemory
              ? 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-900/40 text-slate-600 dark:text-slate-600 light:text-slate-400 cursor-not-allowed'
          }`}
          title="Recall Memory (MR)"
        >
          MR
        </button>
        <button
          id="btn-mem-add"
          type="button"
          onClick={onMemoryAdd}
          className="py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700/80 transition-all"
          title="Add to Memory (M+)"
        >
          M+
        </button>
        <button
          id="btn-mem-subtract"
          type="button"
          onClick={onMemorySubtract}
          className="py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700/80 transition-all"
          title="Subtract from Memory (M-)"
        >
          M-
        </button>
        <button
          id="btn-mem-store"
          type="button"
          onClick={onMemoryStore}
          className="py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-amber-400 hover:bg-slate-700/80 transition-all"
          title="Store to Memory (MS)"
        >
          MS
        </button>
      </div>

      {/* Mobile Scientific Functions Toggle */}
      <div className="flex md:hidden items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setShowScientificMobile((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1"
        >
          {showScientificMobile ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Hide Scientific Keys</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show Scientific Keys</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsSecondTrig((prev) => !prev)}
          className={`text-[11px] px-2 py-0.5 rounded font-semibold transition-all ${
            isSecondTrig
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          2nd
        </button>
      </div>

      {/* Main Grid: Responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5">
        {/* Scientific Section (7 columns on Desktop) */}
        <div
          className={`${
            showScientificMobile ? 'grid' : 'hidden md:grid'
          } md:col-span-6 lg:col-span-6 grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2`}
        >
          {/* Row 1 */}
          <button
            type="button"
            onClick={() => setIsSecondTrig((prev) => !prev)}
            className={`hidden md:block py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              isSecondTrig
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700/80'
            }`}
            title="Toggle Inverse Trigonometry"
          >
            2nd
          </button>
          <button
            type="button"
            onClick={() => onFunction(isSecondTrig ? 'asin(' : 'sin(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            {isSecondTrig ? 'sin⁻¹' : 'sin'}
          </button>
          <button
            type="button"
            onClick={() => onFunction(isSecondTrig ? 'acos(' : 'cos(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            {isSecondTrig ? 'cos⁻¹' : 'cos'}
          </button>
          <button
            type="button"
            onClick={() => onFunction(isSecondTrig ? 'atan(' : 'tan(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            {isSecondTrig ? 'tan⁻¹' : 'tan'}
          </button>

          {/* Row 2: Hyperbolic / Logarithms */}
          <button
            type="button"
            onClick={() => onFunction('sinh(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            sinh
          </button>
          <button
            type="button"
            onClick={() => onFunction('cosh(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            cosh
          </button>
          <button
            type="button"
            onClick={() => onFunction('ln(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            ln
          </button>
          <button
            type="button"
            onClick={() => onFunction('log10(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
          >
            log₁₀
          </button>

          {/* Row 3: Powers & Roots */}
          <button
            type="button"
            onClick={onSquare}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Square (x²)"
          >
            x²
          </button>
          <button
            type="button"
            onClick={() => onOperator('^')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Power (xʸ)"
          >
            xʸ
          </button>
          <button
            type="button"
            onClick={() => onFunction('sqrt(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Square Root (√x)"
          >
            √x
          </button>
          <button
            type="button"
            onClick={() => onFunction('cbrt(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Cube Root (∛x)"
          >
            ∛x
          </button>

          {/* Row 4: Math Utilities */}
          <button
            type="button"
            onClick={onReciprocal}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Reciprocal (1/x)"
          >
            1/x
          </button>
          <button
            type="button"
            onClick={onFactorial}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Factorial (n!)"
          >
            n!
          </button>
          <button
            type="button"
            onClick={() => onFunction('abs(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Absolute Value (|x|)"
          >
            |x|
          </button>
          <button
            type="button"
            onClick={() => onOperator('mod')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="Modulo operation (mod)"
          >
            mod
          </button>

          {/* Row 5: Constants & Exponentials */}
          <button
            type="button"
            onClick={() => onConstant('π')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-cyan-950/40 dark:bg-cyan-950/40 light:bg-cyan-50 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-800/40 hover:bg-cyan-900/50 transition-all active:scale-95"
            title="Pi constant (3.14159...)"
          >
            π
          </button>
          <button
            type="button"
            onClick={() => onConstant('e')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-cyan-950/40 dark:bg-cyan-950/40 light:bg-cyan-50 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-800/40 hover:bg-cyan-900/50 transition-all active:scale-95"
            title="Euler's Number (2.71828...)"
          >
            e
          </button>
          <button
            type="button"
            onClick={() => onConstant('φ')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-cyan-950/40 dark:bg-cyan-950/40 light:bg-cyan-50 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 border border-cyan-800/40 hover:bg-cyan-900/50 transition-all active:scale-95"
            title="Golden Ratio (1.61803...)"
          >
            φ
          </button>
          <button
            type="button"
            onClick={() => onFunction('10^(')}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/70 dark:bg-slate-800/70 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700/80 transition-all active:scale-95"
            title="10 to the power of x"
          >
            10ˣ
          </button>
        </div>

        {/* Basic Primary Keypad (6 columns on Desktop) */}
        <div className="md:col-span-6 lg:col-span-6 grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* Row 1: Clear Controls & Parentheses */}
          <button
            id="btn-clear-all"
            type="button"
            onClick={onClearAll}
            className="py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl bg-rose-500/20 text-rose-300 dark:text-rose-300 light:text-rose-700 hover:bg-rose-500/30 border border-rose-500/30 transition-all active:scale-95"
            title="All Clear (AC)"
          >
            AC
          </button>
          <button
            id="btn-backspace"
            type="button"
            onClick={onBackspace}
            aria-label="Backspace"
            className="py-2.5 sm:py-3 flex items-center justify-center rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:bg-slate-700 transition-all active:scale-95"
            title="Delete character"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            id="btn-paren-open"
            type="button"
            onClick={() => onParenthesis('(')}
            className="py-2.5 sm:py-3 text-sm sm:text-base font-mono-math font-semibold rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 hover:bg-slate-700 transition-all active:scale-95"
          >
            (
          </button>
          <button
            id="btn-paren-close"
            type="button"
            onClick={() => onParenthesis(')')}
            className="py-2.5 sm:py-3 text-sm sm:text-base font-mono-math font-semibold rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-200 text-cyan-300 dark:text-cyan-300 light:text-cyan-700 hover:bg-slate-700 transition-all active:scale-95"
          >
            )
          </button>

          {/* Row 2: 7, 8, 9, ÷ */}
          <button
            id="btn-num-7"
            type="button"
            onClick={() => onDigit('7')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            7
          </button>
          <button
            id="btn-num-8"
            type="button"
            onClick={() => onDigit('8')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            8
          </button>
          <button
            id="btn-num-9"
            type="button"
            onClick={() => onDigit('9')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            9
          </button>
          <button
            id="btn-op-divide"
            type="button"
            onClick={() => onOperator('/')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-bold rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-100 text-cyan-400 dark:text-cyan-400 light:text-cyan-800 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all active:scale-95"
            title="Divide (÷)"
          >
            ÷
          </button>

          {/* Row 3: 4, 5, 6, × */}
          <button
            id="btn-num-4"
            type="button"
            onClick={() => onDigit('4')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            4
          </button>
          <button
            id="btn-num-5"
            type="button"
            onClick={() => onDigit('5')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            5
          </button>
          <button
            id="btn-num-6"
            type="button"
            onClick={() => onDigit('6')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            6
          </button>
          <button
            id="btn-op-multiply"
            type="button"
            onClick={() => onOperator('*')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-bold rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-100 text-cyan-400 dark:text-cyan-400 light:text-cyan-800 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all active:scale-95"
            title="Multiply (×)"
          >
            ×
          </button>

          {/* Row 4: 1, 2, 3, − */}
          <button
            id="btn-num-1"
            type="button"
            onClick={() => onDigit('1')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            1
          </button>
          <button
            id="btn-num-2"
            type="button"
            onClick={() => onDigit('2')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            2
          </button>
          <button
            id="btn-num-3"
            type="button"
            onClick={() => onDigit('3')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            3
          </button>
          <button
            id="btn-op-subtract"
            type="button"
            onClick={() => onOperator('-')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-bold rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-100 text-cyan-400 dark:text-cyan-400 light:text-cyan-800 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all active:scale-95"
            title="Subtract (−)"
          >
            −
          </button>

          {/* Row 5: 0, ., ±, + */}
          <button
            id="btn-num-0"
            type="button"
            onClick={() => onDigit('0')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-50 transition-all active:scale-95"
          >
            0
          </button>
          <button
            id="btn-decimal"
            type="button"
            onClick={onDecimal}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-semibold rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-white text-white dark:text-white light:text-slate-900 border border-slate-700/40 dark:border-slate-700/40 light:border-slate-300 hover:bg-slate-800 transition-all active:scale-95"
          >
            .
          </button>
          <button
            id="btn-toggle-sign"
            type="button"
            onClick={onToggleSign}
            className="py-3 sm:py-3.5 text-xs sm:text-sm font-mono-math font-semibold rounded-xl bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700 transition-all active:scale-95"
            title="Toggle sign (+/-)"
          >
            ±
          </button>
          <button
            id="btn-op-add"
            type="button"
            onClick={() => onOperator('+')}
            className="py-3 sm:py-3.5 text-base sm:text-lg font-mono-math font-bold rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-100 text-cyan-400 dark:text-cyan-400 light:text-cyan-800 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all active:scale-95"
            title="Add (+)"
          >
            +
          </button>

          {/* Row 6: % and Full-width = button */}
          <button
            id="btn-op-percent"
            type="button"
            onClick={onPercentage}
            className="py-3 sm:py-3.5 text-sm sm:text-base font-mono-math font-semibold rounded-xl bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700 transition-all active:scale-95"
            title="Percentage (%)"
          >
            %
          </button>
          <button
            id="btn-calculate"
            type="button"
            onClick={onCalculate}
            className="col-span-3 py-3 sm:py-3.5 text-lg font-mono-math font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-98 flex items-center justify-center"
            title="Calculate (=)"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
