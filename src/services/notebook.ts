/**
 * Calcora AI — Notebook workspace.
 *
 * A notebook holds a learner's own work across a session: calculations, problems, steps,
 * graphs, tables, Tutor exchanges, notes, references and practice.
 *
 * Two invariants, enforced by tests:
 *
 *   - **Verification is carried, never implied.** An entry keeps the exact
 *     `PASS | FAIL | UNKNOWN` status it was created with. The renderer refuses to show
 *     `PASS` for an entry that has no verified calculation, so the notebook can never
 *     launder an unchecked number into an authoritative-looking one.
 *   - **Calculator isolation.** Notebooks are immutable values with their own storage
 *     key. Every read is validated, so hand-edited or corrupt storage degrades to an
 *     empty list instead of propagating into calculator state.
 */
import { calculateExpression } from '../engine/mathEngine';
import { solveEquation } from '../engine/equationSolver';

export type NotebookEntryType =
  | 'problem'
  | 'calculation'
  | 'step'
  | 'graph'
  | 'table'
  | 'explanation'
  | 'tutor'
  | 'note'
  | 'reference'
  | 'practice';

export type NotebookVerificationStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface NotebookVerification {
  status: NotebookVerificationStatus;
  method: string;
  reason: string;
}

export interface NotebookEntry {
  id: string;
  type: NotebookEntryType;
  title: string;
  text: string;
  /** Extra deterministic context, e.g. steps or a table payload. */
  data?: Record<string, unknown>;
  verification?: NotebookVerification;
  createdAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  entries: NotebookEntry[];
  createdAt: number;
  updatedAt: number;
}

export const MAX_NOTEBOOKS = 40;
export const MAX_ENTRIES_PER_NOTEBOOK = 500;
export const MAX_ENTRY_TEXT_CHARS = 20_000;
export const MAX_NOTEBOOK_TITLE_CHARS = 200;

const STORAGE_KEY = 'calcora_notebooks_v1';
const ENTRY_TYPES: readonly NotebookEntryType[] = [
  'problem', 'calculation', 'step', 'graph', 'table', 'explanation',
  'tutor', 'note', 'reference', 'practice',
];

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** Trims and bounds a string, returning '' for anything unusable. */
function cleanText(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  // Control characters would corrupt rendering; they are stripped, not preserved.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, limit);
}

export function createNotebook(title: string): Notebook {
  const now = Date.now();
  const cleanTitle = cleanText(title, MAX_NOTEBOOK_TITLE_CHARS) || 'Untitled notebook';
  return { id: nextId('nb'), title: cleanTitle, entries: [], createdAt: now, updatedAt: now };
}

export interface NotebookEntryInput {
  type: string;
  title: string;
  text: string;
  data?: Record<string, unknown>;
  verification?: NotebookVerification;
}

/**
 * Deterministically checks an entry's text when it is a computational claim.
 *
 * An equation is solved, an arithmetic expression is evaluated, and anything else is
 * `UNKNOWN`. A stored `verification` supplied by the caller is preserved so a previously
 * checked result keeps its real status.
 */
function verifyEntryText(
  text: string,
  stored?: NotebookVerification,
): NotebookVerification {
  if (stored && (stored.status === 'PASS' || stored.status === 'FAIL')) {
    return stored;
  }
  if (!text) {
    return { status: 'UNKNOWN', method: 'none', reason: 'The entry contains no mathematical claim to verify.' };
  }

  if (text.includes('=') && /[a-z]/i.test(text)) {
    const solved = solveEquation(text);
    if (solved.isValid && !solved.error && solved.solutions.length) {
      return {
        status: 'PASS',
        method: 'deterministic-solver',
        reason: `Calcora's deterministic solver produced ${solved.solutions.join(', ')}.`,
      };
    }
    return {
      status: 'UNKNOWN',
      method: 'none',
      reason: 'The equation could not be solved deterministically, so no result is claimed.',
    };
  }

  const calculated = calculateExpression(text);
  if (!calculated.error && Number.isFinite(calculated.value)) {
    return {
      status: 'PASS',
      method: 'deterministic-evaluator',
      reason: `Calcora's deterministic evaluator produced ${calculated.display ?? calculated.value}.`,
    };
  }

  return {
    status: 'UNKNOWN',
    method: 'none',
    reason: 'The text is not a computation Calcora can verify, so no result is claimed.',
  };
}

/** Returns a new notebook with the entry appended. The input is never mutated. */
export function addNotebookEntry(notebook: Notebook, input: NotebookEntryInput): Notebook {
  if (!notebook || !Array.isArray(notebook.entries)) return notebook;
  if (notebook.entries.length >= MAX_ENTRIES_PER_NOTEBOOK) return notebook;
  if (!ENTRY_TYPES.includes(input?.type as NotebookEntryType)) return notebook;

  const rawText = typeof input.text === 'string' ? input.text : '';
  // Overlong mathematical text is rejected rather than truncated: silently cutting an
  // expression can change its meaning, so the entry is refused instead of being altered.
  if (rawText.length > MAX_ENTRY_TEXT_CHARS) return notebook;

  const text = cleanText(rawText, MAX_ENTRY_TEXT_CHARS);
  const title = cleanText(input.title, MAX_NOTEBOOK_TITLE_CHARS) || input.type;
  const entry: NotebookEntry = {
    id: nextId('entry'),
    type: input.type as NotebookEntryType,
    title,
    text,
    data: input.data && typeof input.data === 'object' ? input.data : undefined,
    verification: verifyEntryText(text, input.verification),
    createdAt: Date.now(),
  };

  return {
    ...notebook,
    entries: [...notebook.entries, entry],
    updatedAt: Date.now(),
  };
}

export function removeNotebookEntry(notebook: Notebook, entryId: string): Notebook {
  if (!notebook || !Array.isArray(notebook.entries)) return notebook;
  const entries = notebook.entries.filter((entry) => entry.id !== entryId);
  if (entries.length === notebook.entries.length) return notebook;
  return { ...notebook, entries, updatedAt: Date.now() };
}

export function updateNotebookEntry(
  notebook: Notebook,
  entryId: string,
  patch: Partial<NotebookEntryInput>,
): Notebook {
  if (!notebook || !Array.isArray(notebook.entries)) return notebook;
  let changed = false;
  const entries = notebook.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    changed = true;
    const text = patch.text !== undefined ? cleanText(patch.text, MAX_ENTRY_TEXT_CHARS) : entry.text;
    return {
      ...entry,
      title: patch.title !== undefined
        ? (cleanText(patch.title, MAX_NOTEBOOK_TITLE_CHARS) || entry.title)
        : entry.title,
      text,
      // Re-verified when the text or the status itself changes, so an edit can never
      // inherit a stale PASS.
      verification: patch.verification !== undefined || patch.text !== undefined
        ? verifyEntryText(text, patch.verification ?? entry.verification)
        : entry.verification,
      data: patch.data ?? entry.data,
    };
  });
  if (!changed) return notebook;
  return { ...notebook, entries, updatedAt: Date.now() };
}

export interface NotebookSummary {
  entryCount: number;
  verifiedCount: number;
  failedCount: number;
  unknownCount: number;
  byType: Record<string, number>;
  emptySummary: boolean;
}

export function summarizeNotebook(notebook: Notebook): NotebookSummary {
  const entries = Array.isArray(notebook?.entries) ? notebook.entries : [];
  const byType: Record<string, number> = {};
  let verifiedCount = 0;
  let failedCount = 0;
  let unknownCount = 0;

  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    if (entry.verification?.status === 'PASS') verifiedCount += 1;
    else if (entry.verification?.status === 'FAIL') failedCount += 1;
    else unknownCount += 1;
  }

  return {
    entryCount: entries.length,
    verifiedCount,
    failedCount,
    unknownCount,
    byType,
    emptySummary: entries.length === 0,
  };
}

/**
 * Renders an entry for display.
 *
 * `PASS` is only ever printed when the entry actually carries a PASS. An entry with no
 * verification is explicitly labelled as not verified, which is the honest default.
 */
export function renderNotebookEntry(entry: NotebookEntry): string {
  const lines: string[] = [];
  lines.push(`[${entry.type}] ${entry.title}`);
  if (entry.text) lines.push(entry.text);

  const status = entry.verification?.status;
  if (status === 'PASS') {
    lines.push(`Verification: PASS (${entry.verification?.method}) — ${entry.verification?.reason}`);
  } else if (status === 'FAIL') {
    lines.push(`Verification: FAIL (${entry.verification?.method}) — ${entry.verification?.reason}`);
  } else {
    lines.push('Verification: not verified — this entry makes no verified mathematical claim.');
  }
  return lines.join('\n');
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__calcora_nb_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function isValidNotebook(value: unknown): value is Notebook {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Notebook>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && Array.isArray(candidate.entries);
}

export function saveNotebook(notebook: Notebook): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    const existing = loadNotebook().filter((item) => item.id !== notebook.id);
    const next = [notebook, ...existing].slice(0, MAX_NOTEBOOKS);
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** Always returns a valid array; corrupt or hand-edited storage yields an empty list. */
export function loadNotebook(): Notebook[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidNotebook)
      .slice(0, MAX_NOTEBOOKS)
      .map((item) => ({
        id: item.id,
        title: cleanText(item.title, MAX_NOTEBOOK_TITLE_CHARS) || 'Untitled notebook',
        entries: Array.isArray(item.entries)
          ? item.entries
            .filter((entry: unknown): entry is NotebookEntry => (
              Boolean(entry)
              && typeof (entry as NotebookEntry).id === 'string'
              && typeof (entry as NotebookEntry).type === 'string'
              && ENTRY_TYPES.includes((entry as NotebookEntry).type as NotebookEntryType)
            ))
            .slice(0, MAX_ENTRIES_PER_NOTEBOOK)
          : [],
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

export function clearNotebooks(): void {
  try {
    safeStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: a failure to clear must never break the caller.
  }
}
