/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useCalculator } from './hooks/useCalculator';
import { useTheme } from './hooks/useTheme';
import { useKeyboard } from './hooks/useKeyboard';
import { Header } from './components/Header';
import { Display } from './components/Display';
import { Keypad } from './components/Keypad';
import { HistoryDrawer } from './components/HistoryDrawer';
const EquationSolverPanel = lazy(() => import('./components/EquationSolverPanel').then(m => ({ default: m.EquationSolverPanel })));
const CalculusPanel = lazy(() => import('./components/CalculusPanel').then(m => ({ default: m.CalculusPanel })));
const GraphingPanel = lazy(() => import('./components/GraphingPanel').then(m => ({ default: m.GraphingPanel })));
const MatrixPanel = lazy(() => import('./components/MatrixPanel').then(m => ({ default: m.MatrixPanel })));
const EngineeringPanel = lazy(() => import('./components/EngineeringPanel').then(m => ({ default: m.EngineeringPanel })));
const ProgrammerPanel = lazy(() => import('./components/ProgrammerPanel').then(m => ({ default: m.ProgrammerPanel })));
const StatisticsPanel = lazy(() => import('./components/StatisticsPanel').then(m => ({ default: m.StatisticsPanel })));
const UnitConverterPanel = lazy(() => import('./components/UnitConverterPanel').then(m => ({ default: m.UnitConverterPanel })));
const FinanceCalculatorPanel = lazy(() => import('./components/FinanceCalculatorPanel').then(m => ({ default: m.FinanceCalculatorPanel })));
const CurrencyConverterPanel = lazy(() => import('./components/CurrencyConverterPanel').then(m => ({ default: m.CurrencyConverterPanel })));
const FormulaLibraryPanel = lazy(() => import('./components/FormulaLibraryPanel').then(m => ({ default: m.FormulaLibraryPanel })));
const PracticeQuizPanel = lazy(() => import('./components/PracticeQuizPanel').then(m => ({ default: m.PracticeQuizPanel })));
const AIAssistantPanel = lazy(() => import('./components/AIAssistantPanel').then(m => ({ default: m.AIAssistantPanel })));
const VerificationModal = lazy(() => import('./components/VerificationModal').then(m => ({ default: m.VerificationModal })));
const WorkspaceModal = lazy(() => import('./components/WorkspaceModal').then(m => ({ default: m.WorkspaceModal })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const AdvancedMathDashboard = lazy(() => import('./components/AdvancedMathDashboard').then(m => ({ default: m.AdvancedMathDashboard })));
const MultimodalMathStudio = lazy(() => import('./components/MultimodalMathStudio').then(m => ({ default: m.MultimodalMathStudio })));
const DataAnalysisPanel = lazy(() => import('./components/DataAnalysisPanel').then(m => ({ default: m.DataAnalysisPanel })));
const NotebookPanel = lazy(() => import('./components/NotebookPanel').then(m => ({ default: m.NotebookPanel })));
const DeveloperPanel = lazy(() => import('./components/DeveloperPanel'));
import { ActiveTab, HistoryItem } from './types';
import { traceCalculatorState } from './services/developerTrace';
import { History as HistoryIcon } from 'lucide-react';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showDesktopHistory, setShowDesktopHistory] = useState(true);
  const [pendingTutorPrompt, setPendingTutorPrompt] = useState<string | undefined>();
  const { theme, setTheme } = useTheme(); const calc = useCalculator();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const isEditable = target instanceof HTMLElement && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        Boolean(target.closest('[contenteditable="true"], [role="textbox"]'))
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (isEditable || isKeyboardShortcutsOpen) return;
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditable) {
        if (isCommandPaletteOpen || isVerificationOpen || isWorkspaceOpen) return;
        e.preventDefault();
        setIsKeyboardShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isKeyboardShortcutsOpen, isVerificationOpen, isWorkspaceOpen]);
  useKeyboard({ onDigit: calc.inputDigit, onDecimal: calc.inputDecimal, onOperator: calc.inputOperator, onParenthesis: calc.inputParenthesis, onCalculate: calc.calculate, onClear: calc.clearAll, onBackspace: calc.backspace, onFactorial: calc.inputFactorial }, activeTab === 'calculator' && !isCommandPaletteOpen && !isVerificationOpen && !isWorkspaceOpen && !isKeyboardShortcutsOpen);
  const handleApplyToCalculator = (expr: string) => { calc.applyExpressionDirectly(expr); setActiveTab('calculator'); };
  const handleAutoCalculateFromTutor = (expr: string) => { calc.applyExpressionAndCalculate(expr); setActiveTab('calculator'); };
  const handleSendMultimodalToTutor = useCallback((prompt: string) => { setPendingTutorPrompt(prompt); setActiveTab('ai'); }, []);
  const handleConsumeTutorPrompt = useCallback(() => setPendingTutorPrompt(undefined), []);
  const handleLoadWorkspaceHistory = (items: HistoryItem[]) => { calc.clearHistory(); try { localStorage.setItem('calc_history_v2', JSON.stringify(items)); window.location.reload(); } catch {} };
  // The developer trace is derived from live calculator state through the SAME independent
  // verifier the Tutor uses, so what a developer inspects is the engine's own verdict.
  // It is built from the last COMPLETED calculation, not from the in-progress entry: the live
  // `currentInput` is a partially typed operand, and verifying "2+3" against the operand "3"
  // would report a correct expression as UNVERIFIED for no reason.
  const lastComputed = calc.history[0];
  const developerTrace = lastComputed
    ? traceCalculatorState({
        expression: lastComputed.expression,
        reportedResult: lastComputed.result,
        engineSucceeded: !calc.error,
      })
    : null;
  return <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-cyan-500 selection:text-slate-950">
    <Header activeTab={activeTab} setActiveTab={setActiveTab} angleMode={calc.angleMode} setAngleMode={calc.setAngleMode} theme={theme} setTheme={setTheme} hasMemory={calc.hasMemory} historyCount={calc.history.length} onOpenVerification={() => setIsVerificationOpen(true)} onOpenWorkspaces={() => setIsWorkspaceOpen(true)} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
    <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 flex flex-col justify-start"><Suspense fallback={<div className="flex-1 min-h-[360px] grid place-items-center"><div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-xl"><div className="text-xs font-bold text-slate-500">Loading workspace…</div><div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full w-1/2 animate-pulse bg-cyan-500" /></div></div></div>}>
      {activeTab === 'home' && <AdvancedMathDashboard onNavigateTab={setActiveTab} />}
      {activeTab === 'calculator' && <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"><div className={`flex flex-col gap-3.5 transition-all ${showDesktopHistory ? 'lg:col-span-8' : 'lg:col-span-12'}`}><Display expression={calc.expression} currentInput={calc.currentInput} livePreview={calc.livePreview} angleMode={calc.angleMode} hasMemory={calc.hasMemory} error={calc.error} onClearError={calc.clearAll} fractionDisplay={calc.fractionDisplay} engineeringDisplay={calc.engineeringDisplay} precision={calc.precision as any} onSetPrecision={calc.setPrecision} onToggleFraction={calc.toggleExactFraction} /><div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xl"><div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/60"><div className="text-[11px] font-mono-math uppercase tracking-wider text-slate-400">Scientific Keypad & Matrix</div><button type="button" onClick={() => setShowDesktopHistory((prev) => !prev)} className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"><HistoryIcon className="w-3.5 h-3.5 text-cyan-500" /><span>{showDesktopHistory ? 'Hide History' : 'Show History'}</span></button></div><Keypad onDigit={calc.inputDigit} onDecimal={calc.inputDecimal} onOperator={calc.inputOperator} onFunction={calc.inputFunction} onConstant={calc.inputConstant} onParenthesis={calc.inputParenthesis} onFactorial={calc.inputFactorial} onPercentage={calc.inputPercentage} onReciprocal={calc.inputReciprocal} onSquare={calc.inputSquare} onToggleSign={calc.toggleSign} onClearAll={calc.clearAll} onClearEntry={calc.clearEntry} onBackspace={calc.backspace} onCalculate={calc.calculate} onMemoryClear={calc.memoryClear} onMemoryRecall={calc.memoryRecall} onMemoryStore={calc.memoryStore} onMemoryAdd={calc.memoryAdd} onMemorySubtract={calc.memorySubtract} hasMemory={calc.hasMemory} /></div><div className="block lg:hidden mt-2"><HistoryDrawer history={calc.history} onReuse={calc.reuseHistory} onDeleteItem={calc.deleteHistoryItem} onClearHistory={calc.clearHistory} /></div></div>{showDesktopHistory && <div className="hidden lg:flex lg:col-span-4 flex-col gap-4 sticky top-16"><HistoryDrawer history={calc.history} onReuse={calc.reuseHistory} onDeleteItem={calc.deleteHistoryItem} onClearHistory={calc.clearHistory} /></div>}</div>}
{activeTab === 'multimodal' && <MultimodalMathStudio onAskTutorWithPrompt={handleSendMultimodalToTutor} onAskTutorAboutDocument={() => setActiveTab('ai')} />}
      {activeTab === 'datalab' && <DataAnalysisPanel />}
      {activeTab === 'developer' && (
        <DeveloperPanel trace={developerTrace} />
      )}
      {activeTab === 'notebook' && <NotebookPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'graph' && <GraphingPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'equations' && <EquationSolverPanel onApplyResultToCalculator={handleApplyToCalculator} />}
      {activeTab === 'calculus' && <CalculusPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'matrix' && <MatrixPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'programmer' && <ProgrammerPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'statistics' && <StatisticsPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'engineering' && <EngineeringPanel onSendToCalculator={handleApplyToCalculator} />}
      {activeTab === 'units' && <UnitConverterPanel onApplyResultToCalculator={handleApplyToCalculator} />}
      {activeTab === 'finance' && <FinanceCalculatorPanel onApplyResultToCalculator={handleApplyToCalculator} />}
      {activeTab === 'currency' && <CurrencyConverterPanel />}
      {activeTab === 'formulas' && <FormulaLibraryPanel onUseFormula={handleApplyToCalculator} />}
      {activeTab === 'practice' && <PracticeQuizPanel onSendToCalculator={handleApplyToCalculator} />}
{(activeTab === 'ai' || activeTab === 'tutor') && <AIAssistantPanel currentExpression={calc.expression} currentResult={calc.currentInput} onApplyToCalculator={handleApplyToCalculator} onAutoCalculate={handleAutoCalculateFromTutor} initialPrompt={pendingTutorPrompt} onInitialPromptConsumed={handleConsumeTutorPrompt} />}
    </Suspense>
    </main>
    <KeyboardShortcutsModal isOpen={isKeyboardShortcutsOpen} onClose={() => setIsKeyboardShortcutsOpen(false)} /><VerificationModal isOpen={isVerificationOpen} onClose={() => setIsVerificationOpen(false)} /><WorkspaceModal isOpen={isWorkspaceOpen} onClose={() => setIsWorkspaceOpen(false)} currentHistory={calc.history} onLoadHistory={handleLoadWorkspaceHistory} /><CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} setActiveTab={setActiveTab} setAngleMode={calc.setAngleMode} setTheme={setTheme} onOpenVerification={() => setIsVerificationOpen(true)} onOpenWorkspaces={() => setIsWorkspaceOpen(true)} />
  </div>;
}
