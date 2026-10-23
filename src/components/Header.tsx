/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Calcora application shell.
 *
 * Two tiers:
 *   1. identity + global toolbar (search, workspaces, angle mode, memory, audit, theme)
 *   2. module rail — the 19 navigable modules, grouped by what the user is doing
 *
 * Every module stays a real, visible, focusable <button> with a stable `tab-<id>`
 * id. The packaged smoke test and the browser verifications address those ids
 * directly, and hiding a module behind a menu would break both the tests and the
 * rule that no feature may be concealed to simplify the shell.
 */
import React from 'react';
import {
  ArrowRightLeft,
  Award,
  BarChart3,
  Binary,
  BookOpen,
  Calculator as CalcIcon,
  CheckCircle2,
  Code2,
  Database,
  DollarSign,
  FolderKanban,
  FunctionSquare,
  Layers,
  LayoutDashboard,
  Keyboard,
  Monitor,
  Moon,
  Percent,
  Ruler,
  ScanLine,
  Search,
  Sigma,
  Sparkles,
  Sun,
  Terminal,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { ActiveTab, AngleMode, ThemeMode } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  angleMode: AngleMode;
  setAngleMode: (mode: AngleMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  hasMemory: boolean;
  historyCount: number;
  onOpenVerification: () => void;
  onOpenWorkspaces?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

type TabDef = { id: ActiveTab; label: string; icon: React.ElementType };

type TabGroup = { key: string; label: string; tabs: TabDef[] };

/**
 * Grouped once, at module scope, so the rail structure is declarative and the
 * grouping is inspectable rather than rebuilt on every render.
 */
const TAB_GROUPS: TabGroup[] = [
  {
    key: 'hub',
    label: 'Hub',
    tabs: [{ id: 'home', label: 'Command Hub', icon: LayoutDashboard }],
  },
  {
    key: 'compute',
    label: 'Compute',
    tabs: [
      { id: 'calculator', label: 'Scientific', icon: CalcIcon },
      { id: 'equations', label: 'Equations', icon: Binary },
      { id: 'calculus', label: 'Calculus', icon: FunctionSquare },
      { id: 'matrix', label: 'Matrix & Vec', icon: Layers },
      { id: 'graph', label: 'Graphing', icon: TrendingUp },
    ],
  },
  {
    key: 'analyze',
    label: 'Analyze',
    tabs: [
      { id: 'statistics', label: 'Statistics', icon: BarChart3 },
      { id: 'datalab', label: 'Data Lab', icon: Database },
      { id: 'programmer', label: 'Programmer', icon: Terminal },
      { id: 'engineering', label: 'Engineering', icon: Ruler },
    ],
  },
  {
    key: 'learn',
    label: 'Learn',
    tabs: [
      { id: 'ai', label: 'AI Tutor', icon: Sparkles },
      { id: 'practice', label: 'Practice Quiz', icon: Award },
      { id: 'notebook', label: 'Notebook', icon: BookOpen },
      // The Multimodal Studio is a real route (App.tsx) that previously had no
      // rail entry — it was reachable only from dashboard cards. Adding it is
      // a navigation gap fix, not a new feature.
      { id: 'multimodal', label: 'Voice & PDF', icon: ScanLine },
    ],
  },
  {
    key: 'convert',
    label: 'Convert',
    tabs: [
      { id: 'units', label: 'Units', icon: ArrowRightLeft },
      { id: 'finance', label: 'Finance', icon: Percent },
      { id: 'currency', label: 'Currency', icon: DollarSign },
      { id: 'formulas', label: 'Formulas', icon: Sigma },
    ],
  },
  {
    key: 'lab',
    label: 'Lab',
    tabs: [{ id: 'developer', label: 'Developer', icon: Code2 }],
  },
];

const ANGLE_MODES: AngleMode[] = ['DEG', 'RAD', 'GRAD'];

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: React.ElementType }[] = [
  { mode: 'light', label: 'Light theme', icon: Sun },
  { mode: 'dark', label: 'Dark theme', icon: Moon },
  { mode: 'system', label: 'System theme', icon: Monitor },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  angleMode,
  setAngleMode,
  theme,
  setTheme,
  hasMemory,
  historyCount,
  onOpenVerification,
  onOpenWorkspaces,
  onOpenCommandPalette,
  onOpenKeyboardShortcuts,
}) => (
  <header
    className="sticky top-0 z-30 w-full border-b cc-divider backdrop-blur-md transition-colors"
    style={{ background: 'color-mix(in srgb, var(--cc-surface) 88%, transparent)' }}
  >
    <div className="max-w-7xl mx-auto px-3 sm:px-6">
      {/* ---------------------------------------------------------------- */}
      {/* Tier 1 — identity + global toolbar                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="m-0">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="cc-logo-btn"
              title="Return to Command Hub"
              aria-label="Calcora AI — return to Command Hub"
            >
              <span className="cc-logo" aria-hidden="true">
                <CalcIcon />
              </span>
              <span className="text-base sm:text-lg font-extrabold tracking-tight leading-none whitespace-nowrap">
                <span>CALCORA</span>
                <span style={{ color: 'var(--cc-accent)' }}>AI</span>
              </span>
            </button>
          </h1>
          <span className="cc-chip cc-chip-accent hidden sm:inline-flex">Pro Workbench</span>
          <p className="hidden lg:block text-[11px] cc-faint font-medium m-0 pl-2.5 cc-divider border-l">
            Calculate. Understand. Visualize. Learn.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenKeyboardShortcuts && (
            <button
              id="btn-open-keyboard-shortcuts"
              type="button"
              onClick={onOpenKeyboardShortcuts}
              className="cc-btn"
              title="Open keyboard shortcuts (?)"
              aria-label="Open keyboard shortcuts"
            >
              <Keyboard aria-hidden="true" />
              <span className="hidden md:inline">Shortcuts</span>
              <kbd className="hidden xl:inline cc-faint font-mono text-[11px] font-semibold">?</kbd>
            </button>
          )}
          {onOpenCommandPalette && (
            <button
              id="btn-open-command-palette"
              type="button"
              onClick={onOpenCommandPalette}
              className="cc-btn"
              title="Open Command Palette (Ctrl+K or Cmd+K)"
              aria-label="Open command palette"
            >
              <Search aria-hidden="true" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden xl:inline cc-faint font-mono text-[11px] font-semibold">⌘K</kbd>
            </button>
          )}

          {onOpenWorkspaces && (
            <button
              id="btn-open-workspaces"
              type="button"
              onClick={onOpenWorkspaces}
              className="cc-btn"
              title="Open Workspaces, Notes & Export"
            >
              <FolderKanban aria-hidden="true" />
              <span className="hidden lg:inline">Workspace</span>
            </button>
          )}

          <span className="cc-vrule hidden sm:block" aria-hidden="true" />

          <div className="cc-seg" role="group" aria-label="Angle mode">
            {ANGLE_MODES.map((mode) => (
              <button
                key={mode}
                id={`angle-mode-${mode.toLowerCase()}`}
                type="button"
                onClick={() => setAngleMode(mode)}
                aria-pressed={angleMode === mode}
                title={`Angle mode: ${mode}`}
                className="cc-seg-btn"
              >
                {mode}
              </button>
            ))}
          </div>

          {hasMemory && (
            <span
              className="cc-chip cc-chip-warning hidden sm:inline-flex"
              title={`Memory active (M) · ${historyCount} history records`}
            >
              M
            </span>
          )}

          <button
            id="btn-open-verification"
            type="button"
            onClick={onOpenVerification}
            className="cc-btn"
            style={{
              color: 'var(--cc-success)',
              borderColor: 'color-mix(in srgb, var(--cc-success) 35%, transparent)',
              background: 'var(--cc-success-soft)',
            }}
            title="Run production test suite"
          >
            <CheckCircle2 aria-hidden="true" />
            <span className="hidden xl:inline">Audit Suite</span>
          </button>

          <span className="cc-vrule hidden sm:block" aria-hidden="true" />

          <div className="cc-seg" role="group" aria-label="Colour theme">
            {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                id={`theme-${mode}`}
                type="button"
                onClick={() => setTheme(mode)}
                aria-pressed={theme === mode}
                aria-label={label}
                title={label}
                className="cc-seg-btn"
              >
                <Icon aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Tier 2 — grouped module rail                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="border-t cc-divider">
        <nav
          aria-label="Application Modules"
          className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none"
        >
          {TAB_GROUPS.map((group) => (
            <div key={group.key} className="cc-nav-group" role="group" aria-label={group.label}>
              <span className="cc-nav-group-label" aria-hidden="true">
                {group.label}
              </span>
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={`Open ${tab.label}`}
                    className="cc-nav-item shrink-0"
                  >
                    <Icon className="cc-nav-icon" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  </header>
);
