/**
 * Local persistence for the student model.
 *
 * Deliberately offline-first: the adaptive Tutor must keep working when Gemini and
 * Supabase are both unavailable, because a learner tracking their own progress must not
 * depend on a network round trip. Storage failures degrade to an in-memory model rather
 * than throwing, so a blocked browser never breaks the Tutor.
 */
import {
  createEmptyStudentModel,
  recordLearningEvents,
  analyseStudent,
  MAX_TRACKED_EVENTS,
  type LearningEvent,
  type StudentAnalysis,
  type StudentModel,
} from './studentModel';

const STORAGE_KEY = 'calcora_student_model_v1';

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Private-mode Safari and some embedded webviews throw on setItem.
    const probe = '__calcora_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function loadStudentModel(): StudentModel {
  const storage = safeStorage();
  if (!storage) return createEmptyStudentModel();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStudentModel();
    const parsed = JSON.parse(raw) as { events?: LearningEvent[]; goals?: string[] };
    const events = Array.isArray(parsed.events)
      ? parsed.events
        .filter((event): event is LearningEvent => Boolean(event && typeof event.conceptId === 'string'))
        .slice(-MAX_TRACKED_EVENTS)
      : [];
    return { events, goals: Array.isArray(parsed.goals) ? parsed.goals.slice(0, 20) : [] };
  } catch {
    // Corrupt or hand-edited storage must not take the Tutor down with it.
    return createEmptyStudentModel();
  }
}

export function saveStudentModel(model: StudentModel): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      events: model.events.slice(-MAX_TRACKED_EVENTS),
      goals: model.goals,
    }));
    return true;
  } catch {
    return false;
  }
}

/** Records an attempt and persists. Returns the updated analysis for immediate use. */
export function logLearningEvent(
  model: StudentModel,
  event: LearningEvent,
): { model: StudentModel; analysis: StudentAnalysis; persisted: boolean } {
  const next = recordLearningEvents(model, [event]);
  return { model: next, analysis: analyseStudent(next), persisted: saveStudentModel(next) };
}

export function clearStudentModel(): void {
  safeStorage()?.removeItem(STORAGE_KEY);
}

export function exportStudentModel(model: StudentModel): string {
  return JSON.stringify({ events: model.events, goals: model.goals }, null, 2);
}
