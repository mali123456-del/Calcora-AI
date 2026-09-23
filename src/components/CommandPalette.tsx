import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
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
  Award,
  Sparkles,
  FolderKanban,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Mic,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { ActiveTab, AngleMode, ThemeMode } from '../types';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Modes' | 'Mathematics' | 'Tools' | 'AI' | 'System';
  icon: any;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setAngleMode: (mode: AngleMode) => void;
  setTheme: (theme: ThemeMode) => void;
  onOpenVerification: () => void;
  onOpenWorkspaces: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveTab,
  setAngleMode,
  setTheme,
  onOpenVerification,
  onOpenWorkspaces,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Modes
    {
      id: 'tab-calculator',
      title: 'Scientific Calculator',
      subtitle: 'Trigonometry, logarithms, powers, and exact fractions',
      category: 'Modes',
      icon: Calculator,
      action: () => setActiveTab('calculator'),
      shortcut: '1',
    },
    {
      id: 'tab-graph',
      title: '2D Function Graphing',
      subtitle: 'Plot equations, find roots, intersections, and extrema',
      category: 'Mathematics',
      icon: TrendingUp,
      action: () => setActiveTab('graph'),
      shortcut: '2',
    },
    {
      id: 'tab-equations',
      title: 'Equation Solver & Algebra',
      subtitle: 'Linear, quadratic, and systems of equations',
      category: 'Mathematics',
      icon: Binary,
      action: () => setActiveTab('equations'),
      shortcut: '3',
    },
    {
      id: 'tab-calculus',
      title: 'Calculus Workspace',
      subtitle: 'Numerical derivatives and definite integrals',
      category: 'Mathematics',
      icon: FunctionSquare,
      action: () => setActiveTab('calculus'),
    },
    {
      id: 'tab-matrix',
      title: 'Matrix & Vector Lab',
      subtitle: 'Determinants, inverses, dot product, and cross product',
      category: 'Mathematics',
      icon: Layers,
      action: () => setActiveTab('matrix'),
    },
    {
      id: 'tab-programmer',
      title: 'Programmer Calculator',
      subtitle: 'HEX, DEC, OCT, BIN and bitwise operations',
      category: 'Modes',
      icon: Binary,
      action: () => setActiveTab('programmer'),
    },
    {
      id: 'tab-statistics',
      title: 'Statistics & Probability',
      subtitle: 'Mean, median, regression, permutations, and binomial',
      category: 'Mathematics',
      icon: BarChart3,
      action: () => setActiveTab('statistics'),
    },
    {
      id: 'tab-engineering',
      title: 'Engineering & Physics Toolkit',
      subtitle: 'Ohm’s law, electrical power, kinematics, and fluid pressure',
      category: 'Tools',
      icon: Wrench,
      action: () => setActiveTab('engineering' as any),
    },
    {
      id: 'tab-units',
      title: 'Unit Converter (16 Categories)',
      subtitle: 'Length, mass, temperature, data, pressure, and energy',
      category: 'Tools',
      icon: ArrowRightLeft,
      action: () => setActiveTab('units'),
    },
    {
      id: 'tab-finance',
      title: 'Financial Calculators',
      subtitle: 'Loans, compound interest, investments, and inflation',
      category: 'Tools',
      icon: DollarSign,
      action: () => setActiveTab('finance'),
    },
    {
      id: 'tab-formulas',
      title: 'Mathematical Formula Library',
      subtitle: 'Searchable formulas across algebra, physics, and calculus',
      category: 'Tools',
      icon: BookOpen,
      action: () => setActiveTab('formulas'),
    },
    {
      id: 'tab-practice',
      title: 'Practice Quiz & Challenges',
      subtitle: 'Test your problem-solving skills across mathematical topics',
      category: 'AI',
      icon: Award,
      action: () => setActiveTab('practice'),
    },
    {
      id: 'tab-ai',
      title: 'AI Math Tutor & Voice Assistant',
      subtitle: 'Natural language math, quick prompts, voice dictation, copy LaTeX, and Markdown export',
      category: 'AI',
      icon: Sparkles,
      action: () => setActiveTab('ai'),
      shortcut: 'A',
    },
    // System Actions
    {
      id: 'act-workspaces',
      title: 'Workspaces & Calculation Notes',
      subtitle: 'Organize problem sets, export JSON, and attach notes',
      category: 'System',
      icon: FolderKanban,
      action: onOpenWorkspaces,
    },
    {
      id: 'act-audit',
      title: 'Run Verification Test Suite',
      subtitle: 'Deterministic mathematical engine unit tests',
      category: 'System',
      icon: CheckCircle2,
      action: onOpenVerification,
    },
    {
      id: 'act-deg',
      title: 'Angle Mode: Degrees (DEG)',
      subtitle: 'Set trigonometry calculation angle mode to DEG',
      category: 'System',
      icon: Calculator,
      action: () => setAngleMode('DEG'),
    },
    {
      id: 'act-rad',
      title: 'Angle Mode: Radians (RAD)',
      subtitle: 'Set trigonometry calculation angle mode to RAD',
      category: 'System',
      icon: Calculator,
      action: () => setAngleMode('RAD'),
    },
    {
      id: 'act-theme-dark',
      title: 'Switch to Dark Theme',
      category: 'System',
      icon: Moon,
      action: () => setTheme('dark'),
    },
    {
      id: 'act-theme-light',
      title: 'Switch to Light Theme',
      category: 'System',
      icon: Sun,
      action: () => setTheme('light'),
    },
  ];

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, tool, or calculation mode..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40"
        >
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands found for "{query}"
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60">
                      {cmd.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Navigate:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↓</kbd>
          </div>
          <div className="flex items-center gap-1">
            <span>Select:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">↵</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
