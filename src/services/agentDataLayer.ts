import { stripSecretsRecursively, type AgentData } from './dataTransferService';

export type { AgentData };

export const AGENT_DATA_STORAGE_KEY = 'calcora_agent_data_v1';

const DEFAULT_AGENT_DATA: AgentData = {
  preferences: {
    language: 'en',
    learningLevel: 'intermediate',
    explanationDepth: 'balanced',
    pace: 'normal',
    angleMode: 'DEG',
  },
  mastery: {},
  mistakes: [],
  savedProblems: [],
};

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

function normalize(value: unknown): AgentData {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_AGENT_DATA);
  const input = value as Partial<AgentData>;
  const preferences = input.preferences && typeof input.preferences === 'object' ? input.preferences as AgentData['preferences'] : DEFAULT_AGENT_DATA.preferences;
  const mastery = input.mastery && typeof input.mastery === 'object'
    ? Object.fromEntries(Object.entries(input.mastery).filter(([, score]) => typeof score === 'number').slice(0, 100))
    : {};
  const savedProblems = Array.isArray(input.savedProblems)
    ? input.savedProblems.slice(0, 200).filter((p): p is AgentData['savedProblems'][number] =>
      !!p && typeof p === 'object' && typeof (p as any).id === 'string' && typeof (p as any).problem === 'string')
      .map((p) => ({ id: p.id, problem: p.problem, topic: typeof p.topic === 'string' ? p.topic : undefined, createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now() }))
    : [];
  return {
    preferences: {
      language: typeof preferences.language === 'string' ? preferences.language : 'en',
      learningLevel: typeof preferences.learningLevel === 'string' ? preferences.learningLevel : 'intermediate',
      explanationDepth: typeof preferences.explanationDepth === 'string' ? preferences.explanationDepth : 'balanced',
      pace: typeof preferences.pace === 'string' ? preferences.pace : 'normal',
      angleMode: typeof preferences.angleMode === 'string' ? preferences.angleMode : 'DEG',
    },
    mastery,
    mistakes: Array.isArray(input.mistakes) ? input.mistakes.slice(0, 50) : [],
    savedProblems,
  };
}

export function loadAgentData(): AgentData {
  try {
    const raw = storage()?.getItem(AGENT_DATA_STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : DEFAULT_AGENT_DATA);
  } catch {
    return structuredClone(DEFAULT_AGENT_DATA);
  }
}

export function saveAgentData(data: AgentData): AgentData {
  const safe = normalize(stripSecretsRecursively(data));
  storage()?.setItem(AGENT_DATA_STORAGE_KEY, JSON.stringify(safe));
  return safe;
}

export function updateAgentData(update: Partial<AgentData>): AgentData {
  return saveAgentData({ ...loadAgentData(), ...update });
}

export function resetAgentData(): void {
  storage()?.removeItem(AGENT_DATA_STORAGE_KEY);
}

export function deleteAgentLearning(): AgentData {
  return saveAgentData({ ...loadAgentData(), mastery: {}, mistakes: [] });
}

export function deleteSavedProblems(): AgentData {
  return saveAgentData({ ...loadAgentData(), savedProblems: [] });
}
