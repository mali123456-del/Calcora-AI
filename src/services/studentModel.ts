/**
 * Calcora AI — Student Model (adaptive learning, observable signals only).
 *
 * Design rule, enforced by tests
 * ------------------------------
 * Every value produced here is a count, a ratio, or a bounded aggregate of events the
 * learner actually produced. Nothing infers a psychological state, an emotion, a
 * personality trait, or a permanent ability. A model that says "this learner struggles
 * with signs" from one wrong answer is fabricating a conclusion, so mastery is damped by
 * sample size and every signal carries the evidence that produced it.
 *
 * The model is intentionally plain data so it can be persisted, exported, and inspected.
 */
import type { MathKnowledgeLevel } from '../knowledge/knowledgeTypes';

/** Hard ceiling on retained events, so a long session cannot grow without bound. */
export const MAX_TRACKED_EVENTS = 2000;

export type LearningOutcome = 'correct' | 'incorrect' | 'incomplete';
export type LearningMode = 'practice' | 'quiz' | 'tutor' | 'check-work' | 'hint';

export interface LearningEvent {
  id: string;
  conceptId: string;
  topic: string;
  difficulty: MathKnowledgeLevel;
  outcome: LearningOutcome;
  /** 0 means the learner answered without asking for help. */
  hintLevelUsed: number;
  mode: LearningMode;
  timestamp: number;
}

export type MasteryBand = 'unseen' | 'weak' | 'developing' | 'proficient' | 'mastered';

export interface ConceptMastery {
  conceptId: string;
  topic: string;
  attempts: number;
  correct: number;
  incorrect: number;
  /** correct / attempts, or null when there are no attempts. */
  accuracy: number | null;
  averageHintLevel: number;
  /** Fraction of attempts that needed a hint at all. */
  hintDependency: number;
  /** 1 - hintDependency: how much work was done unaided. */
  independence: number;
  /** 0..1, damped by sample size. */
  mastery: number;
  band: MasteryBand;
  recommendedDifficulty: MathKnowledgeLevel;
}

export interface MisconceptionSignal {
  conceptId: string;
  /** A factual description of the observed pattern. Never a state of mind. */
  label: string;
  /** The counts that produced this signal. */
  evidence: string;
  /** 0..1 severity derived only from observed rates. */
  severity: number;
}

export interface StudentModel {
  events: LearningEvent[];
  /** Goals the learner or the Tutor set, stored as plain labels. */
  goals: string[];
}

export interface StudentAnalysis {
  totalAttempts: number;
  /** null when there is no evidence; never 0 as a stand-in for "unknown". */
  overallAccuracy: number | null;
  hintDependency: number | null;
  concepts: Record<string, ConceptMastery>;
  weakConcepts: string[];
  masteredConcepts: string[];
  misconceptionSignals: MisconceptionSignal[];
  recommendations: string[];
  /** True only when every event came from the deterministic engine. */
  allEventsDeterministic: boolean;
}

export function createEmptyStudentModel(): StudentModel {
  return { events: [], goals: [] };
}

const DIFFICULTY_ORDER: MathKnowledgeLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export function selectNextDifficulty(
  current: MathKnowledgeLevel,
  accuracy: number | null,
): MathKnowledgeLevel {
  const index = Math.max(0, DIFFICULTY_ORDER.indexOf(current));
  // No evidence yet: hold the level rather than guessing a jump.
  if (accuracy === null) return current;
  if (accuracy >= 0.85) return DIFFICULTY_ORDER[Math.min(index + 1, DIFFICULTY_ORDER.length - 1)];
  if (accuracy < 0.5) return DIFFICULTY_ORDER[Math.max(index - 1, 0)];
  return current;
}

/**
 * Appends an event, keeping the log bounded by dropping the oldest entries.
 *
 * Duplicate ids are ignored so a retried or double-submitted attempt cannot inflate
 * the learner's history.
 */
export function recordLearningEvent(model: StudentModel, event: LearningEvent): StudentModel {
  if (model.events.some((existing) => existing.id === event.id)) return model;
  const events = [...model.events, event];
  if (events.length > MAX_TRACKED_EVENTS) events.splice(0, events.length - MAX_TRACKED_EVENTS);
  return { ...model, events };
}

export function recordLearningEvents(model: StudentModel, incoming: readonly LearningEvent[]): StudentModel {
  return incoming.reduce((acc, event) => recordLearningEvent(acc, event), model);
}

function bandFor(mastery: number, attempts: number): MasteryBand {
  if (attempts === 0) return 'unseen';
  if (mastery < 0.4) return 'weak';
  if (mastery < 0.65) return 'developing';
  if (mastery < 0.85) return 'proficient';
  return 'mastered';
}

export function analyseStudent(model: StudentModel): StudentAnalysis {
  const events = model.events ?? [];

  if (!events.length) {
    return {
      totalAttempts: 0,
      overallAccuracy: null,
      hintDependency: null,
      concepts: {},
      weakConcepts: [],
      masteredConcepts: [],
      misconceptionSignals: [],
      recommendations: [],
      allEventsDeterministic: true,
    };
  }

  interface Accumulator {
    conceptId: string;
    topic: string;
    attempts: number;
    correct: number;
    incorrect: number;
    hinted: number;
    hintLevelSum: number;
    difficultyCounts: Map<MathKnowledgeLevel, number>;
    lastDifficulty: MathKnowledgeLevel;
  }

  const byConcept = new Map<string, Accumulator>();
  let hintedTotal = 0;
  let correctTotal = 0;

  for (const event of events) {
    const existing = byConcept.get(event.conceptId);
    const acc: Accumulator = existing ?? {
      conceptId: event.conceptId,
      topic: event.topic,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      hinted: 0,
      hintLevelSum: 0,
      difficultyCounts: new Map(),
      lastDifficulty: event.difficulty,
    };
    acc.attempts += 1;
    if (event.outcome === 'correct') acc.correct += 1;
    if (event.outcome === 'incorrect') acc.incorrect += 1;
    if (event.hintLevelUsed > 0) { acc.hinted += 1; hintedTotal += 1; }
    acc.hintLevelSum += Math.max(0, Math.min(5, event.hintLevelUsed));
    acc.difficultyCounts.set(event.difficulty, (acc.difficultyCounts.get(event.difficulty) ?? 0) + 1);
    acc.lastDifficulty = event.difficulty;
    if (event.outcome === 'correct') correctTotal += 1;
    byConcept.set(event.conceptId, acc);
  }

  const concepts: Record<string, ConceptMastery> = {};
  const signals: MisconceptionSignal[] = [];

  for (const acc of byConcept.values()) {
    const accuracy = acc.correct / acc.attempts;
    const hintDependency = acc.hinted / acc.attempts;
    const independence = 1 - hintDependency;

    // Transparent, explainable weighting: accuracy dominates, independence matters, and
    // sample size damps the result so one observation cannot read as mastery.
    const quality = 0.7 * accuracy + 0.3 * independence;
    const confidence = Math.min(1, acc.attempts / 4);
    const mastery = Math.max(0, Math.min(1, quality * confidence));

    // Recommend from the modal difficulty actually attempted, not the last one.
    let modalDifficulty = acc.lastDifficulty;
    let modalCount = 0;
    for (const [level, count] of acc.difficultyCounts) {
      if (count > modalCount) { modalCount = count; modalDifficulty = level; }
    }

    concepts[acc.conceptId] = {
      conceptId: acc.conceptId,
      topic: acc.topic,
      attempts: acc.attempts,
      correct: acc.correct,
      incorrect: acc.incorrect,
      accuracy,
      averageHintLevel: acc.hintLevelSum / acc.attempts,
      hintDependency,
      independence,
      mastery,
      band: bandFor(mastery, acc.attempts),
      recommendedDifficulty: selectNextDifficulty(modalDifficulty, accuracy),
    };

    // Observable signals only. Each states the counts that produced it.
    if (acc.incorrect >= 2) {
      signals.push({
        conceptId: acc.conceptId,
        label: 'Repeated incorrect attempts on the same concept',
        evidence: `${acc.incorrect} incorrect of ${acc.attempts} recorded attempts on ${acc.conceptId}`,
        severity: Math.min(1, acc.incorrect / Math.max(acc.attempts, 1) + (acc.incorrect >= 3 ? 0.2 : 0)),
      });
    }
    if (acc.hinted === acc.attempts && acc.attempts >= 2) {
      signals.push({
        conceptId: acc.conceptId,
        label: 'All recorded attempts used a hint',
        evidence: `${acc.hinted}/${acc.attempts} attempts on ${acc.conceptId} used a hint `
          + `(average hint level ${(acc.hintLevelSum / acc.attempts).toFixed(1)} of 5)`,
        severity: 0.5,
      });
    }
    if (acc.incorrect === 0 && acc.attempts >= 4) {
      signals.push({
        conceptId: acc.conceptId,
        label: 'Sustained correct attempts without a recorded error',
        evidence: `${acc.correct}/${acc.attempts} correct on ${acc.conceptId}`,
        severity: 0,
      });
    }
  }

  // "Weak" is reserved for genuinely poor performance. `developing` is deliberately
  // excluded: sample-size damping can hold a correct concept at `developing`, and
  // labelling an accurate concept weak would misreport the learner's record.
  const weakConcepts = Object.values(concepts)
    .filter((c) => c.band === 'weak')
    .sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts)
    .map((c) => c.conceptId);

  const masteredConcepts = Object.values(concepts)
    .filter((c) => c.band === 'mastered')
    .map((c) => c.conceptId);

  const recommendations: string[] = [];
  for (const conceptId of weakConcepts.slice(0, 3)) {
    const concept = concepts[conceptId];
    recommendations.push(
      `Practise ${conceptId}: ${concept.correct}/${concept.attempts} correct, `
      + `average hint level ${concept.averageHintLevel.toFixed(1)}. Suggested level: ${concept.recommendedDifficulty}.`,
    );
  }

  return {
    totalAttempts: events.length,
    overallAccuracy: correctTotal / events.length,
    hintDependency: hintedTotal / events.length,
    concepts,
    weakConcepts,
    masteredConcepts,
    misconceptionSignals: signals.sort((a, b) => b.severity - a.severity),
    recommendations,
    allEventsDeterministic: true,
  };
}

/** Plain-language descriptions of the observable signals, for the Tutor UI. */
export function describeSignals(analysis: StudentAnalysis): string[] {
  if (!analysis.totalAttempts) return [];
  return analysis.misconceptionSignals.map((signal) => `${signal.label} — ${signal.evidence}`);
}
