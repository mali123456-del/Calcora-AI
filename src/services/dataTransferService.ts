import type { HistoryItem, WorkspaceSession } from '../types';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_HISTORY = 500;
const MAX_SAVED_PROBLEMS = 200;
const MAX_MISTAKES = 50;
const MAX_MESSAGES = 200;

const STORAGE_KEYS = {
  history: 'calc_history_v2',
  workspaces: 'digital_calc_workspaces',
  activeWorkspace: 'digital_calc_active_workspace_id',
  /** v3 conversations are per-workspace buckets owned by tutorConversationService. */
  tutorConversation: 'calcora_tutor_conversation_state_v3',
  legacyTutorConversation: 'calcora_tutor_conversation_state_v2',
  tutorSettings: 'calcora_tutor_settings_v1',
  tutorStats: 'calcora_tutor_stats_v1',
  tutorMistakes: 'calcora_tutor_mistakes_v1',
  agentData: 'calcora_agent_data_v1',
} as const;

export interface AgentData {
  preferences: {
    language: string;
    learningLevel: string;
    explanationDepth: string;
    pace: string;
    angleMode: string;
  };
  mastery: Record<string, number>;
  mistakes: unknown[];
  savedProblems: Array<{ id: string; problem: string; topic?: string; createdAt: number }>;
}

export interface CalcoraDataSnapshot {
  version: 1;
  exportedAt: number;
  calculationHistory: HistoryItem[];
  workspaces: WorkspaceSession[];
  activeWorkspaceId: string;
  tutorConversation: unknown | null;
  tutorSettings: unknown | null;
  tutorStats: unknown | null;
  tutorMistakes: unknown[];
  agentData: AgentData;
}

const SECRET_KEY = /(api.?key|secret|password|passwd|credential|authorization|bearer|access.?token|refresh.?token|service.?role|private.?key|client.?secret)/i;
const SECRET_VALUE = /(?:AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+)/;

export function containsSecret(value: unknown): boolean {
  if (typeof value === 'string') return SECRET_VALUE.test(value);
  if (Array.isArray(value)) return value.some(containsSecret);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, child]) => SECRET_KEY.test(key) || containsSecret(child));
  }
  return false;
}

export function stripSecretsRecursively<T>(value: T): T {
  if (Array.isArray(value)) return value.filter((item) => !(typeof item === 'string' && containsSecret(item))).map((item) => stripSecretsRecursively(item)) as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(key) || (typeof child === 'string' && SECRET_VALUE.test(child))) continue;
      output[key] = stripSecretsRecursively(child);
    }
    return output as T;
  }
  return value;
}

function validateHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_HISTORY).filter((item): item is HistoryItem => {
    if (!item || typeof item !== 'object') return false;
    const h = item as Partial<HistoryItem>;
    return typeof h.id === 'string' && typeof h.expression === 'string' && typeof h.result === 'string' &&
      typeof h.timestamp === 'number' && ['DEG', 'RAD', 'GRAD'].includes(String(h.angleMode));
  });
}

function validateWorkspaces(value: unknown): WorkspaceSession[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).filter((item): item is WorkspaceSession => {
    if (!item || typeof item !== 'object') return false;
    const w = item as Partial<WorkspaceSession>;
    return typeof w.id === 'string' && typeof w.name === 'string' && Array.isArray(w.historyItems) && Array.isArray(w.notes);
  }).map((w) => ({
    ...w,
    historyItems: validateHistory(w.historyItems),
    notes: w.notes.slice(0, 500).filter((n) => n && typeof n === 'object').map((n) => ({
      id: typeof n.id === 'string' ? n.id : 'note-imported',
      title: typeof n.title === 'string' ? n.title : 'Untitled Note',
      content: typeof n.content === 'string' ? n.content : '',
      timestamp: typeof n.timestamp === 'number' ? n.timestamp : Date.now(),
    })),
  } as WorkspaceSession));
}

function validateAgentData(value: unknown): AgentData {
  if (!value || typeof value !== 'object') {
    return { preferences: { language: 'en', learningLevel: 'intermediate', explanationDepth: 'balanced', pace: 'normal', angleMode: 'DEG' }, mastery: {}, mistakes: [], savedProblems: [] };
  }
  const v = value as Partial<AgentData>;
  const preferences = v.preferences && typeof v.preferences === 'object' ? v.preferences as AgentData['preferences'] : {
    language: 'en', learningLevel: 'intermediate', explanationDepth: 'balanced', pace: 'normal', angleMode: 'DEG',
  };
  const savedProblems = Array.isArray(v.savedProblems) ? v.savedProblems.slice(0, MAX_SAVED_PROBLEMS).filter((p): p is AgentData['savedProblems'][number] => !!p && typeof p === 'object' && typeof (p as any).id === 'string' && typeof (p as any).problem === 'string').map((p) => ({ id: p.id, problem: p.problem, topic: typeof p.topic === 'string' ? p.topic : undefined, createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now() })) : [];
  const mastery = v.mastery && typeof v.mastery === 'object' ? Object.fromEntries(Object.entries(v.mastery).filter(([, n]) => typeof n === 'number').slice(0, 100)) : {};
  return {
    preferences: {
      language: typeof preferences.language === 'string' ? preferences.language : 'en',
      learningLevel: typeof preferences.learningLevel === 'string' ? preferences.learningLevel : 'intermediate',
      explanationDepth: typeof preferences.explanationDepth === 'string' ? preferences.explanationDepth : 'balanced',
      pace: typeof preferences.pace === 'string' ? preferences.pace : 'normal',
      angleMode: typeof preferences.angleMode === 'string' ? preferences.angleMode : 'DEG',
    },
    mastery,
    mistakes: Array.isArray(v.mistakes) ? v.mistakes.slice(0, MAX_MISTAKES) : [],
    savedProblems,
  };
}

export function validateAndImportCalcoraData(json: string): CalcoraDataSnapshot {
  if (new TextEncoder().encode(json).byteLength > MAX_IMPORT_BYTES) throw new Error('Import exceeds the 2 MB safety limit');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error('Invalid JSON format'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Import root must be an object');
  if (containsSecret(parsed)) throw new Error('Import contains credentials or secrets and was rejected');
  const value = parsed as Record<string, unknown>;
  if (value.version !== 1) throw new Error('Unsupported Calcora data version');
  const snapshot = stripSecretsRecursively<CalcoraDataSnapshot>({
    version: 1,
    exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : Date.now(),
    calculationHistory: validateHistory(value.calculationHistory),
    workspaces: validateWorkspaces(value.workspaces),
    activeWorkspaceId: typeof value.activeWorkspaceId === 'string' ? value.activeWorkspaceId : 'default-workspace',
    tutorConversation: value.tutorConversation ?? null,
    tutorSettings: value.tutorSettings ?? null,
    tutorStats: value.tutorStats ?? null,
    tutorMistakes: Array.isArray(value.tutorMistakes) ? value.tutorMistakes.slice(0, MAX_MISTAKES) : [],
    agentData: validateAgentData(value.agentData),
  });
  if (containsSecret(snapshot)) throw new Error('Import contains unsupported secret material');
  return snapshot as CalcoraDataSnapshot;
}

export function exportCalcoraData(snapshot: CalcoraDataSnapshot): string {
  return JSON.stringify(stripSecretsRecursively({
    ...snapshot,
    version: 1,
    exportedAt: Date.now(),
  }), null, 2);
}

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

function readJSON(key: string): unknown {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Reads the tutor conversation for a workspace from the v3 per-workspace store,
 * falling back to the legacy v2 single-conversation value for exports taken
 * before the scoping change.
 */
function readTutorConversationFor(activeWorkspaceId: string): unknown | null {
  const workspaceStore = readJSON(STORAGE_KEYS.tutorConversation) as
    | { version?: number; conversations?: Record<string, unknown> }
    | null;
  const bucket = workspaceStore?.conversations && typeof workspaceStore.conversations === 'object'
    ? workspaceStore.conversations[activeWorkspaceId]
    : undefined;
  if (bucket) return bucket;
  return readJSON(STORAGE_KEYS.legacyTutorConversation);
}

export function loadCalcoraDataSnapshot(): CalcoraDataSnapshot {
  const workspaces = readJSON(STORAGE_KEYS.workspaces);
  const history = readJSON(STORAGE_KEYS.history);
  const activeWorkspaceId = storage()?.getItem(STORAGE_KEYS.activeWorkspace) || 'default-workspace';
  return {
    version: 1,
    exportedAt: Date.now(),
    calculationHistory: validateHistory(history),
    workspaces: validateWorkspaces(workspaces),
    activeWorkspaceId,
    tutorConversation: readTutorConversationFor(activeWorkspaceId),
    tutorSettings: readJSON(STORAGE_KEYS.tutorSettings),
    tutorStats: readJSON(STORAGE_KEYS.tutorStats),
    tutorMistakes: Array.isArray(readJSON(STORAGE_KEYS.tutorMistakes)) ? (readJSON(STORAGE_KEYS.tutorMistakes) as unknown[]).slice(0, MAX_MISTAKES) : [],
    agentData: validateAgentData(readJSON(STORAGE_KEYS.agentData)),
  };
}

export function saveCalcoraDataSnapshot(snapshot: CalcoraDataSnapshot): void {
  const safe = validateAndImportCalcoraData(exportCalcoraData(snapshot));
  const store = storage();
  if (!store) throw new Error('Local Calcora storage is unavailable');
  store.setItem(STORAGE_KEYS.history, JSON.stringify(safe.calculationHistory));
  store.setItem(STORAGE_KEYS.workspaces, JSON.stringify(safe.workspaces));
  store.setItem(STORAGE_KEYS.activeWorkspace, safe.activeWorkspaceId);
  if (safe.tutorConversation) {
    // Write into the v3 per-workspace store so imported conversations land in the
    // active workspace instead of replacing every conversation (Phase I).
    const parsed = readJSON(STORAGE_KEYS.tutorConversation) as
      | { version?: number; conversations?: Record<string, unknown> }
      | null;
    const conversations = parsed?.version === 3 && parsed.conversations && typeof parsed.conversations === 'object'
      ? { ...parsed.conversations }
      : {};
    conversations[safe.activeWorkspaceId] = safe.tutorConversation;
    store.setItem(STORAGE_KEYS.tutorConversation, JSON.stringify({ version: 3, conversations }));
    store.removeItem(STORAGE_KEYS.legacyTutorConversation);
  } else {
    store.removeItem(STORAGE_KEYS.tutorConversation);
    store.removeItem(STORAGE_KEYS.legacyTutorConversation);
  }
  if (safe.tutorSettings) store.setItem(STORAGE_KEYS.tutorSettings, JSON.stringify(safe.tutorSettings));
  else store.removeItem(STORAGE_KEYS.tutorSettings);
  if (safe.tutorStats) store.setItem(STORAGE_KEYS.tutorStats, JSON.stringify(safe.tutorStats));
  else store.removeItem(STORAGE_KEYS.tutorStats);
  store.setItem(STORAGE_KEYS.tutorMistakes, JSON.stringify(safe.tutorMistakes));
  store.setItem(STORAGE_KEYS.agentData, JSON.stringify(safe.agentData));
}

export function deleteCalcoraData(kind: 'history' | 'saved-problems' | 'learning' | 'tutor' | 'all'): void {
  const store = storage();
  if (!store) return;
  if (kind === 'history' || kind === 'all') store.removeItem(STORAGE_KEYS.history);
  if (kind === 'saved-problems' || kind === 'all') {
    const agent = validateAgentData(readJSON(STORAGE_KEYS.agentData));
    agent.savedProblems = [];
    store.setItem(STORAGE_KEYS.agentData, JSON.stringify(agent));
  }
  if (kind === 'learning' || kind === 'all') {
    store.removeItem(STORAGE_KEYS.tutorStats);
    store.removeItem(STORAGE_KEYS.tutorMistakes);
    const agent = validateAgentData(readJSON(STORAGE_KEYS.agentData));
    agent.mastery = {};
    agent.mistakes = [];
    store.setItem(STORAGE_KEYS.agentData, JSON.stringify(agent));
  }
  if (kind === 'tutor' || kind === 'all') {
    // Deleting tutor data removes every workspace's conversation, not just the
    // active one: the control promises deletion of tutor transcripts.
    store.removeItem(STORAGE_KEYS.tutorConversation);
    store.removeItem(STORAGE_KEYS.legacyTutorConversation);
  }
  if (kind === 'all') {
    store.removeItem(STORAGE_KEYS.workspaces);
    store.removeItem(STORAGE_KEYS.activeWorkspace);
    store.removeItem(STORAGE_KEYS.tutorSettings);
    store.removeItem(STORAGE_KEYS.agentData);
  }
}
