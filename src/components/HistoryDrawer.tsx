import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types';
import { generateCalculationExplanation, MathStep } from '../engine/stepExplainer';
import {
  History,
  Trash2,
  Copy,
  Check,
  Search,
  BookOpen,
  CornerDownRight,
  X,
} from 'lucide-react';

interface HistoryDrawerProps {
  history: HistoryItem[];
  onReuse: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onReuse,
  onDeleteItem,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeExplainItem, setActiveExplainItem] = useState<{
    item: HistoryItem;
    explanation: { steps: MathStep[]; summary: string; finalAnswer: string };
  } | null>(null);

  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return history;
    const term = searchTerm.toLowerCase();
    return history.filter(
      (h) =>
        h.expression.toLowerCase().includes(term) ||
        h.result.toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExplain = (item: HistoryItem) => {
    const expl = generateCalculationExplanation(item.expression, item.angleMode);
    setActiveExplainItem({ item, explanation: expl });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-300">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="font-display-math font-bold text-base text-white dark:text-white light:text-slate-900">
            Calculation History
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 dark:bg-slate-950 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 text-xs text-white dark:text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Explanation Modal / Popup if clicked */}
      {activeExplainItem && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-cyan-300">
                Step-by-Step Breakdown: {activeExplainItem.item.expression}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveExplainItem(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono-math flex flex-col gap-1.5">
            {activeExplainItem.explanation.steps.map((st, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-cyan-400 font-semibold">{st.stepNumber}.</span>
                <div>
                  <span className="text-slate-200">{st.operation}</span>
                  <span className="text-cyan-400 ml-2 font-bold">⇒ {st.result}</span>
                  {st.note && (
                    <span className="text-slate-500 text-[11px] block">{st.note}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs font-medium">
          {searchTerm ? 'No calculations match your search.' : 'No calculations recorded yet.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
          {filteredHistory.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={item.id}
                className="group p-3.5 rounded-xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-slate-700 transition-all flex flex-col gap-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>{dateStr}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[11px]">
                      {item.angleMode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleExplain(item)}
                      title="Explain calculation steps"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.result)}
                      title="Copy result"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete entry"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="font-mono-math text-xs text-slate-400 break-all">
                  {item.expression}
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-mono-math text-lg font-bold text-cyan-400 dark:text-cyan-400 light:text-cyan-600">
                    = {item.result}
                  </div>

                  <button
                    type="button"
                    onClick={() => onReuse(item)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 font-medium transition-colors"
                  >
                    <span>Use</span>
                    <CornerDownRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
