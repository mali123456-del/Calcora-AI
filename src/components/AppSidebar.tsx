/**
 * Desktop sidebar navigation.
 *
 * Hidden below the `lg` breakpoint (the existing header bar remains the
 * mobile/compact navigation). Every item maps to a real rendered workspace in
 * App.tsx — there are no dead links. The offline footer indicator uses the
 * browser's own connectivity events only; it never invents state.
 */
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  BrainCircuit,
  Calculator,
  CloudOff,
  FunctionSquare,
  GraduationCap,
  Home,
  LayoutGrid,
  ListChecks,
  MonitorPlay,
  Notebook,
  Sigma,
  Table2,
  Thermometer,
  Wrench,
} from 'lucide-react';import type { ActiveTab } from '../types';

interface SidebarItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}

interface AppSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const PRIMARY_ITEMS: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calculator', label: 'Scientific Calculator', icon: Wrench },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'tutor', label: 'AI Tutor', icon: GraduationCap },
  { id: 'multimodal', label: 'Documents', icon: MonitorPlay },
  { id: 'developer', label: 'Developer Panel', icon: BrainCircuit },
];

const TOOL_ITEMS: SidebarItem[] = [
  { id: 'practice', label: 'Practice Quiz', icon: ListChecks },
  { id: 'graph', label: 'Graphing', icon: Table2 },
  { id: 'equations', label: 'Equations', icon: Sigma },
  { id: 'calculus', label: 'Calculus', icon: FunctionSquare },
  { id: 'matrix', label: 'Matrix & Vectors', icon: LayoutGrid },
  { id: 'statistics', label: 'Statistics', icon: ListChecks },
  { id: 'finance', label: 'Finance', icon: Calculator },
  { id: 'currency', label: 'Currency', icon: Calculator },
  { id: 'units', label: 'Unit Converter', icon: Thermometer },
  { id: 'formulas', label: 'Formula Library', icon: BookOpen },
  { id: 'notebook', label: 'Notebook', icon: Notebook },
  { id: 'datalab', label: 'Data Lab', icon: Table2 },
];

export function AppSidebar({ activeTab, setActiveTab }: AppSidebarProps) {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const renderItem = (item: SidebarItem) => {
    const isActive = activeTab === item.id || (item.id === 'ai' && activeTab === 'tutor');
    return (
      <li key={item.id}>
        <button
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => setActiveTab(item.id)}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
            isActive
              ? 'bg-cyan-600/15 text-cyan-700 dark:bg-blue-600/20 dark:text-blue-200'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
          }`}
        >
          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-blue-300' : 'text-slate-400'}`} aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Primary" className="hidden w-56 shrink-0 flex-col gap-1 self-start p-3 lg:flex" data-testid="app-sidebar">
      <ul className="flex flex-col gap-1">{PRIMARY_ITEMS.map(renderItem)}</ul>
      <p className="mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Math tools</p>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">{TOOL_ITEMS.map(renderItem)}</ul>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] dark:border-slate-800 dark:bg-slate-900/60" aria-live="polite" data-testid="connectivity-indicator">
        <span className={`flex items-center gap-1.5 font-semibold ${online ? 'text-slate-500 dark:text-slate-300' : 'text-amber-500 dark:text-amber-300'}`}>
          <CloudOff className={`h-3.5 w-3.5 ${online ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true" />
          {online ? 'Online mode' : 'Offline mode'}
        </span>
        <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
          {online
            ? 'Cloud features (if configured) and updates available.'
            : 'Deterministic calculator, tutor and stored data keep working.'}
        </p>
      </div>
    </nav>
  );
}
