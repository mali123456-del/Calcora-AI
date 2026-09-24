/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useCalculator } from './hooks/useCalculator';
import { useTheme } from './hooks/useTheme';
import { useKeyboard } from './hooks/useKeyboard';
import { Header } from './components/Header';
import { Display } from './components/Display';
import { Keypad } from './components/Keypad';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CommandCenterHome } from './components/CommandCenterHome';
import { EquationSolverPanel } from './components/EquationSolverPanel';
import { CalculusPanel } from './components/CalculusPanel';
import { GraphingPanel } from './components/GraphingPanel';
import { MatrixPanel } from './components/MatrixPanel';
import { EngineeringPanel } from './components/EngineeringPanel';
import { ProgrammerPanel } from './components/ProgrammerPanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { UnitConverterPanel } from './components/UnitConverterPanel';
import { FinanceCalculatorPanel } from './components/FinanceCalculatorPanel';
import { FormulaLibraryPanel } from './components/FormulaLibraryPanel';
import { PracticeQuizPanel } from './components/PracticeQuizPanel';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { VerificationModal } from './components/VerificationModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import { CommandPalette } from './components/CommandPalette';
import { ActiveTab, HistoryItem } from './types';
import { History as HistoryIcon, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showDesktopHistory, setShowDesktopHistory] = useState(true);

  // Theme Hook
  const { theme, setTheme } = useTheme();

  // Subtle cross-fade transition state for switching between light and dark modes
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  useEffect(() => {
    setIsThemeTransitioning(true);
    const timer = setTimeout(() => {
      setIsThemeTransitioning(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [theme]);

  // Calculator Engine Hook
  const calc = useCalculator();

  // Global Shortcut: Ctrl+K / Cmd+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track modal visibility states to prevent keyboard collisions
  const isAnyModalOpen = isCommandPaletteOpen || isVerificationOpen || isWorkspaceOpen;
  const isCalculatorKeyboardActive = activeTab === 'calculator' && !isAnyModalOpen;

  // Global Keyboard Hook for calculator interactions
  // Supports: Enter (Calculate), Escape (Clear All), Delete/Backspace (Backspace), digits, operators
  useKeyboard(
    {
      onDigit: calc.inputDigit,
      onDecimal: calc.inputDecimal,
      onOperator: calc.inputOperator,
      onParenthesis: calc.inputParenthesis,
      onCalculate: calc.calculate, // Enter or =
      onClear: calc.clearAll,       // Escape
      onBackspace: calc.backspace,  // Delete or Backspace
      onFactorial: calc.inputFactorial,
    },
    isCalculatorKeyboardActive
  );

  const handleApplyToCalculator = (expr: string) => {
    calc.applyExpressionDirectly(expr);
    setActiveTab('calculator');
  };

  const handleLoadWorkspaceHistory = (items: HistoryItem[]) => {
    // When a workspace is loaded, replace or append history
    // Since useCalculator manages local history, we can clear and load
    calc.clearHistory();
    // Re-populate if items exist
    try {
      localStorage.setItem('calc_history_v2', JSON.stringify(items));
      window.location.reload();
    } catch {}
  };

  return (
    <div
      id="calcora-root"
      className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 ease-in-out selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden ${
        isThemeTransitioning ? 'theme-transitioning' : ''
      }`}
    >
      {/* Subtle atmospheric cross-fade glow layer */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20 transition-opacity duration-700 ease-in-out overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-cyan-500/10 dark:from-cyan-500/5 via-indigo-500/5 to-transparent blur-3xl rounded-full transition-all duration-700" />
      </div>

      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        angleMode={calc.angleMode}
        setAngleMode={calc.setAngleMode}
        theme={theme}
        setTheme={setTheme}
        hasMemory={calc.hasMemory}
        historyCount={calc.history.length}
        onOpenVerification={() => setIsVerificationOpen(true)}
        onOpenWorkspaces={() => setIsWorkspaceOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col justify-start">
        {/* TAB 0: Command Hub Dashboard */}
        {activeTab === 'home' && (
          <CommandCenterHome
            onNavigateTab={setActiveTab}
            recentHistory={calc.history}
            onReuseCalculation={calc.reuseHistory}
            onOpenWorkspaces={() => setIsWorkspaceOpen(true)}
            onOpenAudit={() => setIsVerificationOpen(true)}
          />
        )}

        {/* TAB 1: Scientific Calculator */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main Calculator Center Terminal (8 cols on large screens, or 12 if history closed) */}
            <div
              className={`flex flex-col gap-3.5 transition-all ${
                showDesktopHistory ? 'lg:col-span-8' : 'lg:col-span-12'
              }`}
            >
              {/* Display Module */}
              <Display
                expression={calc.expression}
                currentInput={calc.currentInput}
                livePreview={calc.livePreview}
                angleMode={calc.angleMode}
                hasMemory={calc.hasMemory}
                error={calc.error}
                onClearError={calc.clearAll}
                fractionDisplay={calc.fractionDisplay}
                engineeringDisplay={calc.engineeringDisplay}
                precision={calc.precision as any}
                onSetPrecision={calc.setPrecision}
                onToggleFraction={calc.toggleExactFraction}
              />

              {/* Keypad Terminal */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xl">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="text-[11px] font-mono-math uppercase tracking-wider text-slate-400">
                    Scientific Keypad & Matrix
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDesktopHistory((prev) => !prev)}
                      className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                      title="Toggle History Sidebar"
                    >
                      <HistoryIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                      <span>{showDesktopHistory ? 'Hide History' : 'Show History'}</span>
                    </button>
                  </div>
                </div>

                <Keypad
                  onDigit={calc.inputDigit}
                  onDecimal={calc.inputDecimal}
                  onOperator={calc.inputOperator}
                  onFunction={calc.inputFunction}
                  onConstant={calc.inputConstant}
                  onParenthesis={calc.inputParenthesis}
                  onFactorial={calc.inputFactorial}
                  onPercentage={calc.inputPercentage}
                  onReciprocal={calc.inputReciprocal}
                  onSquare={calc.inputSquare}
                  onToggleSign={calc.toggleSign}
                  onClearAll={calc.clearAll}
                  onClearEntry={calc.clearEntry}
                  onBackspace={calc.backspace}
                  onCalculate={calc.calculate}
                  onMemoryClear={calc.memoryClear}
                  onMemoryRecall={calc.memoryRecall}
                  onMemoryStore={calc.memoryStore}
                  onMemoryAdd={calc.memoryAdd}
                  onMemorySubtract={calc.memorySubtract}
                  hasMemory={calc.hasMemory}
                />
              </div>

              {/* Mobile History Section below calculator */}
              <div className="block lg:hidden mt-2">
                <HistoryDrawer
                  history={calc.history}
                  onReuse={calc.reuseHistory}
                  onDeleteItem={calc.deleteHistoryItem}
                  onClearHistory={calc.clearHistory}
                />
              </div>
            </div>

            {/* Desktop History Sidebar (4 cols) */}
            {showDesktopHistory && (
              <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 sticky top-16">
                <HistoryDrawer
                  history={calc.history}
                  onReuse={calc.reuseHistory}
                  onDeleteItem={calc.deleteHistoryItem}
                  onClearHistory={calc.clearHistory}
                />

                {/* Quick AI Tutor Teaser in Sidebar */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 dark:from-purple-950/30 to-indigo-50 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Need Help with a Math Problem?</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Switch to the AI Tutor tab to solve equations, break down complex word problems, and view step-by-step proofs.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className="self-start mt-1 text-xs px-3 py-1.5 rounded-lg bg-purple-600/10 dark:bg-purple-600/30 text-purple-700 dark:text-purple-300 hover:bg-purple-600/20 dark:hover:bg-purple-600/50 border border-purple-300 dark:border-purple-500/30 font-medium transition-colors"
                  >
                    Open AI Tutor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 2D Graphing Workspace */}
        {activeTab === 'graph' && (
          <GraphingPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 3: Equation Solver */}
        {activeTab === 'equations' && (
          <EquationSolverPanel onApplyResultToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 4: Calculus Workspace */}
        {activeTab === 'calculus' && (
          <CalculusPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 5: Linear Algebra Matrix & Vector */}
        {activeTab === 'matrix' && (
          <MatrixPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 6: Programmer Mode */}
        {activeTab === 'programmer' && (
          <ProgrammerPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 7: Statistics & Regression */}
        {activeTab === 'statistics' && (
          <StatisticsPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 8: Engineering & Physics Solvers */}
        {activeTab === 'engineering' && (
          <EngineeringPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 9: Unit Converter */}
        {activeTab === 'units' && (
          <UnitConverterPanel onApplyResultToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 10: Finance Calculator */}
        {activeTab === 'finance' && (
          <FinanceCalculatorPanel onApplyResultToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 11: Formula Library */}
        {activeTab === 'formulas' && (
          <FormulaLibraryPanel onUseFormula={handleApplyToCalculator} />
        )}

        {/* TAB 12: Practice Quiz Mode */}
        {activeTab === 'practice' && (
          <PracticeQuizPanel onSendToCalculator={handleApplyToCalculator} />
        )}

        {/* TAB 13: AI Mathematical Tutor */}
        {(activeTab === 'ai' || activeTab === 'tutor') && (
          <AIAssistantPanel
            currentExpression={calc.expression}
            currentResult={calc.currentInput}
            onApplyToCalculator={handleApplyToCalculator}
          />
        )}
      </main>

      {/* Production Verification Modal (Phase 24) */}
      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
      />

      {/* Workspace & Notes Modal (Phase 20 & 21) */}
      <WorkspaceModal
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        currentHistory={calc.history}
        onLoadHistory={handleLoadWorkspaceHistory}
      />

      {/* Command Palette Modal (Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setActiveTab={setActiveTab}
        setAngleMode={calc.setAngleMode}
        setTheme={setTheme}
        onOpenVerification={() => setIsVerificationOpen(true)}
        onOpenWorkspaces={() => setIsWorkspaceOpen(true)}
      />
    </div>
  );
}
