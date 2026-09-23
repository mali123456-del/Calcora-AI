/**
 * Workspaces & Calculation Sessions Engine
 * Session management, notes & annotations, and safe import/export validation.
 */

import { CalculationNote, HistoryItem, WorkspaceSession } from '../types';

const STORAGE_KEY_WORKSPACES = 'digital_calc_workspaces';
const STORAGE_KEY_ACTIVE_WORKSPACE = 'digital_calc_active_workspace_id';

export const DEFAULT_WORKSPACE: WorkspaceSession = {
  id: 'default-workspace',
  name: 'Default Workspace',
  description: 'General mathematical scratchpad and scientific calculations',
  category: 'general',
  historyItems: [],
  notes: [
    {
      id: 'welcome-note',
      title: 'Welcome to Workspaces',
      content:
        'You can organize your calculations into distinct sessions (Physics, Finance, Calculus, etc.) and attach notes directly to expressions.',
      timestamp: Date.now(),
    },
  ],
  created: Date.now(),
  lastModified: Date.now(),
};

export function loadWorkspaces(): WorkspaceSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKSPACES);
    if (!raw) return [DEFAULT_WORKSPACE];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [DEFAULT_WORKSPACE];
  } catch {
    return [DEFAULT_WORKSPACE];
  }
}

export function saveWorkspaces(workspaces: WorkspaceSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
  } catch (err) {
    console.error('Failed to save workspaces to localStorage:', err);
  }
}

export function getActiveWorkspaceId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_WORKSPACE) || DEFAULT_WORKSPACE.id;
  } catch {
    return DEFAULT_WORKSPACE.id;
  }
}

export function setActiveWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_WORKSPACE, id);
  } catch (err) {
    console.error('Failed to set active workspace id:', err);
  }
}

/**
 * Export History to CSV
 */
export function exportHistoryToCSV(history: HistoryItem[]): string {
  const header = ['ID', 'Timestamp', 'Expression', 'Result', 'AngleMode', 'Verified'];
  const rows = history.map((item) => [
    `"${item.id}"`,
    `"${new Date(item.timestamp).toISOString()}"`,
    `"${item.expression.replace(/"/g, '""')}"`,
    `"${item.result.replace(/"/g, '""')}"`,
    `"${item.angleMode}"`,
    `"${item.verified ? 'YES' : 'NO'}"`,
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export History to Plain Text
 */
export function exportHistoryToTXT(history: HistoryItem[]): string {
  return history
    .map(
      (item) =>
        `[${new Date(item.timestamp).toLocaleTimeString()}] ${item.expression} = ${item.result} (${item.angleMode})`
    )
    .join('\n');
}

/**
 * Export Workspace to JSON string
 */
export function exportWorkspaceToJSON(workspace: WorkspaceSession): string {
  return JSON.stringify(workspace, null, 2);
}

/**
 * Validate and Import Workspace JSON
 * Strictly parses and checks all required fields before insertion.
 */
export function validateAndImportWorkspace(jsonStr: string): WorkspaceSession {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON format');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Workspace root must be a JSON object');
  }

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Workspace must contain a valid "name" string');
  }

  const validCategory = ['general', 'physics', 'finance', 'engineering', 'math'].includes(
    parsed.category
  )
    ? parsed.category
    : 'general';

  const validated: WorkspaceSession = {
    id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: parsed.name.trim(),
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    category: validCategory,
    historyItems: Array.isArray(parsed.historyItems)
      ? parsed.historyItems.map((h: any) => ({
          id: typeof h.id === 'string' ? h.id : `hist-${Date.now()}`,
          expression: String(h.expression || ''),
          result: String(h.result || ''),
          angleMode: ['DEG', 'RAD', 'GRAD'].includes(h.angleMode) ? h.angleMode : 'DEG',
          timestamp: typeof h.timestamp === 'number' ? h.timestamp : Date.now(),
        }))
      : [],
    notes: Array.isArray(parsed.notes)
      ? parsed.notes.map((n: any) => ({
          id: typeof n.id === 'string' ? n.id : `note-${Date.now()}`,
          title: String(n.title || 'Untitled Note'),
          content: String(n.content || ''),
          associatedExpression: n.associatedExpression ? String(n.associatedExpression) : undefined,
          associatedResult: n.associatedResult ? String(n.associatedResult) : undefined,
          timestamp: typeof n.timestamp === 'number' ? n.timestamp : Date.now(),
        }))
      : [],
    created: Date.now(),
    lastModified: Date.now(),
  };

  return validated;
}
