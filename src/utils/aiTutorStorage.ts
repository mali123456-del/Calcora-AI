/**
 * Tutoring Session Local Storage & Mistake Persistence
 * Connects directly with project localStorage keys without introducing secondary stores.
 */

import {
  TutoringMistakeItem,
  TutorMode,
  LearningObjective,
  DifficultyLevel,
  MathTopic,
} from './aiTutor';

const MISTAKES_STORAGE_KEY = 'calcora_tutor_mistakes_v1';
const SETTINGS_STORAGE_KEY = 'calcora_tutor_settings_v1';
const STATS_STORAGE_KEY = 'calcora_tutor_stats_v1';

export interface TutorStoredSettings {
  mode: TutorMode;
  learningObjective: LearningObjective;
  difficulty: DifficultyLevel;
  topicOverride?: MathTopic;
  socraticMode: boolean;
  examMode: boolean;
  savedHintLevel?: number;
}

export interface TutorStoredStats {
  sessionsCompleted: number;
  totalProblemsAttempted: number;
  totalCorrect: number;
  hintsUsedCount: number;
  lastActiveTimestamp: number;
  streakDays: number;
}

export const DEFAULT_TUTOR_SETTINGS: TutorStoredSettings = {
  mode: 'tutor',
  learningObjective: 'concept',
  difficulty: 'intermediate',
  socraticMode: true,
  examMode: false,
};

export const DEFAULT_TUTOR_STATS: TutorStoredStats = {
  sessionsCompleted: 0,
  totalProblemsAttempted: 0,
  totalCorrect: 0,
  hintsUsedCount: 0,
  lastActiveTimestamp: Date.now(),
  streakDays: 1,
};

// ---------------------------------------------------------------------------
// Mistake Items Storage
// ---------------------------------------------------------------------------

export function loadSavedMistakes(): TutoringMistakeItem[] {
  try {
    const raw = localStorage.getItem(MISTAKES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse saved mistakes from localStorage:', err);
    return [];
  }
}

export function saveMistake(item: Omit<TutoringMistakeItem, 'id' | 'timestamp'>): TutoringMistakeItem {
  const mistakes = loadSavedMistakes();
  const newItem: TutoringMistakeItem = {
    ...item,
    id: `mistake-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };
  // Avoid exact duplicate problem + mistake within 1 minute
  const filtered = mistakes.filter(
    (m) => m.originalProblem !== item.originalProblem || m.userAnswerOrStep !== item.userAnswerOrStep
  );
  const updated = [newItem, ...filtered].slice(0, 50); // Keep last 50 mistakes
  try {
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return newItem;
}

export function dismissMistake(id: string): void {
  const mistakes = loadSavedMistakes();
  const updated = mistakes.filter((m) => m.id !== id);
  try {
    localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearAllMistakes(): void {
  try {
    localStorage.removeItem(MISTAKES_STORAGE_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Tutor Settings Storage
// ---------------------------------------------------------------------------

export function loadTutorSettings(): TutorStoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_TUTOR_SETTINGS;
    return { ...DEFAULT_TUTOR_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TUTOR_SETTINGS;
  }
}

export function saveTutorSettings(settings: Partial<TutorStoredSettings>): void {
  try {
    const current = loadTutorSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

// ---------------------------------------------------------------------------
// Tutor Stats Storage
// ---------------------------------------------------------------------------

export function loadTutorStats(): TutorStoredStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_TUTOR_STATS;
    return { ...DEFAULT_TUTOR_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TUTOR_STATS;
  }
}

export function recordPracticeSessionResult(
  totalAttempted: number,
  correct: number,
  hintsUsed: number
): TutorStoredStats {
  const current = loadTutorStats();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const daysSinceLast = Math.floor((now - current.lastActiveTimestamp) / oneDayMs);

  let newStreak = current.streakDays;
  if (daysSinceLast === 1) {
    newStreak += 1;
  } else if (daysSinceLast > 1) {
    newStreak = 1;
  }

  const updated: TutorStoredStats = {
    sessionsCompleted: current.sessionsCompleted + 1,
    totalProblemsAttempted: current.totalProblemsAttempted + totalAttempted,
    totalCorrect: current.totalCorrect + correct,
    hintsUsedCount: current.hintsUsedCount + hintsUsed,
    lastActiveTimestamp: now,
    streakDays: newStreak,
  };

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
}
