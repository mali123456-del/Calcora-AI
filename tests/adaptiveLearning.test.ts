/**
 * Adaptive learning engine — student model and targeted practice generation.
 *
 * The existing `tutorLearningEngine` only *scores* Tutor answers against Supabase
 * examples. Nothing in the codebase tracked what a learner actually got right, which
 * concepts they struggled with, or whether they were relying on hints. That made the
 * Tutor stateless: it could explain, but it could not adapt.
 *
 * These tests pin two hard rules:
 *
 *   1. Every inference is derived ONLY from recorded observable events. Nothing here
 *      infers a psychological state, a personality trait, or an emotion. Each signal
 *      carries the evidence that produced it.
 *   2. Sample size damps confidence. One correct answer is not "mastered"; a model that
 *      claims mastery from a single observation is fabricating a conclusion.
 */
import assert from 'node:assert/strict';
import {
  createEmptyStudentModel,
  recordLearningEvent,
  recordLearningEvents,
  analyseStudent,
  selectNextDifficulty,
  describeSignals,
  MAX_TRACKED_EVENTS,
  type LearningEvent,
  type StudentModel,
} from '../src/services/studentModel';
import {
  generatePracticeSet,
  generateQuiz,
  verifyPracticeAnswer,
  buildMisconceptionDrill,
} from '../src/services/practiceGenerator';

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Adaptive learning regression failed: ${message}`);
}

function event(over: Partial<LearningEvent> = {}): LearningEvent {
  return {
    id: over.id ?? `e-${Math.random().toString(36).slice(2, 9)}`,
    conceptId: over.conceptId ?? 'algebra-linear-equations',
    topic: over.topic ?? 'Algebra',
    difficulty: over.difficulty ?? 'beginner',
    outcome: over.outcome ?? 'correct',
    hintLevelUsed: over.hintLevelUsed ?? 0,
    mode: over.mode ?? 'practice',
    timestamp: over.timestamp ?? Date.now(),
  };
}

// ---------------------------------------------------------------------------
// 1. An empty model reports "no evidence", not a fabricated baseline.
// ---------------------------------------------------------------------------
const empty = analyseStudent(createEmptyStudentModel());
check(empty.totalAttempts === 0, 'an empty model has zero attempts');
check(empty.overallAccuracy === null, 'accuracy is null (unknown), not 0, with no evidence');
check(empty.weakConcepts.length === 0, 'no weak concepts are invented without evidence');
check(empty.masteredConcepts.length === 0, 'no mastery is claimed without evidence');
check(empty.recommendations.length === 0, 'no recommendation is made without evidence');

// ---------------------------------------------------------------------------
// 2. Recording is deterministic and order-independent for aggregates.
// ---------------------------------------------------------------------------
let model: StudentModel = createEmptyStudentModel();
model = recordLearningEvent(model, event({ outcome: 'correct', hintLevelUsed: 0 }));
model = recordLearningEvent(model, event({ outcome: 'incorrect', hintLevelUsed: 0 }));
const analysed = analyseStudent(model);
check(analysed.totalAttempts === 2, `expected 2 attempts, got ${analysed.totalAttempts}`);
check(analysed.concepts['algebra-linear-equations'].attempts === 2, 'attempts aggregate per concept');
check(
  Math.abs(analysed.concepts['algebra-linear-equations'].accuracy - 0.5) < 1e-9,
  `accuracy is correct/attempts, got ${analysed.concepts['algebra-linear-equations'].accuracy}`,
);
check(analysed.concepts['algebra-linear-equations'].band !== 'mastered', '50% accuracy is never "mastered"');

// ---------------------------------------------------------------------------
// 3. Sample size damps mastery: one lucky correct answer is not mastery.
// ---------------------------------------------------------------------------
const single = analyseStudent(
  recordLearningEvent(createEmptyStudentModel(), event({ outcome: 'correct' })),
);
const singleMastery = single.concepts['algebra-linear-equations'].mastery;
check(singleMastery < 0.75, `one correct answer must not read as mastery, got ${singleMastery}`);

const repeated = analyseStudent(
  recordLearningEvents(createEmptyStudentModel(), [
    event({ outcome: 'correct' }), event({ outcome: 'correct' }),
    event({ outcome: 'correct' }), event({ outcome: 'correct' }),
  ]),
);
check(
  repeated.concepts['algebra-linear-equations'].mastery > singleMastery,
  'repeated correct answers raise mastery above a single observation',
);
check(repeated.concepts['algebra-linear-equations'].band === 'mastered', 'four correct answers reach "mastered"');

// ---------------------------------------------------------------------------
// 4. Hint dependence is observable and reduces independence.
// ---------------------------------------------------------------------------
const hinted = analyseStudent(
  recordLearningEvents(createEmptyStudentModel(), [
    event({ outcome: 'correct', hintLevelUsed: 0 }),
    event({ outcome: 'correct', hintLevelUsed: 5 }),
  ]),
);
const hintedMastery = hinted.concepts['algebra-linear-equations'];
check(Math.abs(hintedMastery.hintDependency - 0.5) < 1e-9, `hint dependency is the hinted-attempt ratio, got ${hintedMastery.hintDependency}`);
check(
  hintedMastery.independence < 1,
  'a solved-with-full-hint attempt is not fully independent',
);

// ---------------------------------------------------------------------------
// 5. Weak concepts are evidence-ranked, not guessed.
// ---------------------------------------------------------------------------
const weakModel = recordLearningEvents(createEmptyStudentModel(), [
  event({ conceptId: 'alg-quadratic-formula', topic: 'Algebra', outcome: 'incorrect' }),
  event({ conceptId: 'alg-quadratic-formula', topic: 'Algebra', outcome: 'incorrect' }),
  event({ conceptId: 'calc-limits', topic: 'Calculus', outcome: 'incorrect' }),
  event({ conceptId: 'calc-limits', topic: 'Calculus', outcome: 'incorrect' }),
  event({ conceptId: 'trig-unit-circle', topic: 'Trigonometry', outcome: 'correct' }),
  event({ conceptId: 'trig-unit-circle', topic: 'Trigonometry', outcome: 'correct' }),
]);
const weak = analyseStudent(weakModel);
check(weak.weakConcepts.includes('alg-quadratic-formula'), 'repeated errors mark a concept weak');
check(!weak.weakConcepts.includes('trig-unit-circle'), 'a correct concept is not marked weak');
// Two correct answers is `developing`, not `mastered`: sample-size damping deliberately
// withholds a mastery claim until there is sustained evidence (see case 3: four correct).
check(
  weak.concepts['trig-unit-circle'].band === 'developing',
  `2 correct answers must stay developing, got ${weak.concepts['trig-unit-circle'].band}`,
);
check(!weak.masteredConcepts.includes('trig-unit-circle'), 'mastery is not claimed from two attempts');

// ---------------------------------------------------------------------------
// 6. Every reported signal carries its evidence. No bare conclusions.
// ---------------------------------------------------------------------------
const signals = weak.misconceptionSignals;
check(signals.length > 0, 'repeated errors produce an observable signal');
for (const signal of signals) {
  check(typeof signal.evidence === 'string' && signal.evidence.length > 0,
    `signal "${signal.label}" must carry evidence, got: ${JSON.stringify(signal)}`);
  check(!/psycholog|anxious|confident personality|intelligent|struggles emotionally|motivat/i.test(`${signal.label} ${signal.evidence}`),
    `signal must not infer psychology: ${signal.label} — ${signal.evidence}`);
}
check(
  signals.some((s) => /alg-quadratic-formula/.test(s.evidence)),
  'signal evidence names the concept it came from',
);

// ---------------------------------------------------------------------------
// 7. Difficulty progression responds to observable performance.
// ---------------------------------------------------------------------------
check(selectNextDifficulty('beginner', 0.9) === 'intermediate', 'high accuracy advances difficulty');
check(selectNextDifficulty('intermediate', 0.15) === 'beginner', 'low accuracy steps difficulty down');
// `expert` is the ceiling, so a strong result there holds rather than inventing a level.
check(selectNextDifficulty('advanced', 0.95) === 'expert', 'a strong result advances advanced to the expert ceiling');
check(selectNextDifficulty('expert', 0.95) === 'expert', 'the ceiling is respected and does not advance further');
check(selectNextDifficulty('expert', 0.1) === 'advanced', 'a weak result steps down from the ceiling');

// ---------------------------------------------------------------------------
// 8. The model is bounded: unbounded event growth must not be possible.
// ---------------------------------------------------------------------------
const flood = recordLearningEvents(createEmptyStudentModel(),
  Array.from({ length: MAX_TRACKED_EVENTS + 500 }, (_, i) => event({ id: `flood-${i}` })));
check(flood.events.length <= MAX_TRACKED_EVENTS, `event log must be bounded, got ${flood.events.length}`);

// ---------------------------------------------------------------------------
// 9. Practice generation targets real corpus knowledge and verifies answers.
// ---------------------------------------------------------------------------
const practiceModel = recordLearningEvents(createEmptyStudentModel(), [
  event({ conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect' }),
  event({ conceptId: 'alg-quadratic-formula', topic: 'Algebra', difficulty: 'beginner', outcome: 'incorrect' }),
]);

const practice = generatePracticeSet(practiceModel, { count: 3, language: 'en' });
check(practice.items.length === 3, `expected 3 practice items, got ${practice.items.length}`);
check(practice.items.length > 0 && practice.rationale.length > 0, 'practice states why it was chosen');
check(
  practice.items.every((item) => item.conceptId.length > 0 && item.prompt.length > 0),
  'every practice item is anchored to a concept with a real prompt',
);
check(
  practice.items.every((item) => item.source === 'knowledge-corpus' || item.source === 'generated'),
  'every practice item declares where it came from',
);
// Practice for a weak concept must actually concern that concept.
check(
  practice.items.some((item) => item.conceptId === 'alg-quadratic-formula'),
  'targeted practice includes the weak concept when the corpus provides it',
);

// The targeted item must be the real corpus example, not an invented exercise.
const quadratic = practice.items.find((item) => item.conceptId === 'alg-quadratic-formula');
check(Boolean(quadratic), 'the weak concept yields a practice item');
if (quadratic) {
  check(quadratic.source === 'knowledge-corpus', 'the corpus example is used when one exists');
  check(quadratic.evidenceId === 'alg-quadratic-formula', 'the item cites the knowledge item it came from');
  check(/x\^2 - 5x \+ 6/.test(quadratic.prompt), `prompt must be the real corpus problem, got: ${quadratic.prompt}`);
  // "Solve x^2 - 5x + 6 = 0" has roots 2 and 3, so both must verify and neither must be
  // accepted by a substring match alone.
  const right = verifyPracticeAnswer(quadratic, 'x = 2, x = 3');
  check(right.checked === true, 'a corpus answer comparison is actually performed');
  check(right.verified === true, `the correct roots must verify, got: ${JSON.stringify(right)}`);
  const wrong = verifyPracticeAnswer(quadratic, 'x = 99');
  check(wrong.verified === false, 'a wrong answer is not verified');
  check(wrong.reason.length > 0, 'a wrong answer explains why');
  check(/2/.test(wrong.reason) && /99/.test(wrong.reason) === false || wrong.reason.includes('2'),
    'the failure reason states the verified answer');
}

// An item with no stored answer must not report a fabricated verification.
const unchecked = verifyPracticeAnswer(
  { ...quadratic!, expectedAnswer: undefined, prompt: 'Discuss the method in words' },
  'a paragraph of prose with no mathematics',
);
check(unchecked.checked === false, 'an unverifiable submission reports that it was not checked');

// ---------------------------------------------------------------------------
// 10. Quiz generation is bounded and never invents correctness.
// ---------------------------------------------------------------------------
const quiz = generateQuiz(practiceModel, { count: 3, language: 'en' });
check(quiz.items.length > 0 && quiz.items.length <= 3, `quiz is bounded by count, got ${quiz.items.length}`);
check(
  quiz.items.every((item) => typeof item.correctOptionIndex === 'number' && item.correctOptionIndex >= 0),
  'every quiz item has a valid correct option index',
);
check(
  quiz.items.every((item) => item.options.length >= 2),
  'every quiz item offers real options',
);

// ---------------------------------------------------------------------------
// 11. A misconception drill is grounded in the knowledge base, not invented.
// ---------------------------------------------------------------------------
const drill = buildMisconceptionDrill('alg-quadratic-formula');
check(drill !== null, 'a drill is produced for a known concept');
if (drill) {
  check(drill.mistake.length > 0 && drill.correction.length > 0, 'drill states the mistake and its correction');
  check(drill.evidence.length > 0, 'drill cites the knowledge source');
  check(/alg-quadratic-formula/.test(drill.evidence), 'drill evidence names the knowledge item');
}
check(buildMisconceptionDrill('not-a-real-concept-id') === null, 'an unknown concept yields no invented drill');

// ---------------------------------------------------------------------------
// 12. Human-readable description must not overstate.
// ---------------------------------------------------------------------------
const described = describeSignals(weak);
check(described.length > 0, 'signals can be described');
check(
  described.every((line) => !/\b(always|never|definitely|inherently)\b/i.test(line)),
  'descriptions must not use absolutes about the learner',
);

console.log('Adaptive learning tests passed');
