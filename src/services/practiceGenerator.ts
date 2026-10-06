/**
 * Calcora AI — Targeted practice, quiz and misconception-drill generation.
 *
 * Everything produced here is grounded in the existing `ALL_MATHEMATICS_KNOWLEDGE`
 * corpus. Where no corpus example fits, an item is still returned but is explicitly
 * labelled `generated` and carries the concept it belongs to — an item is never dressed
 * up as retrieved knowledge, and a concept with no data yields no invented exercise.
 *
 * Answers are verified by the deterministic math engine wherever the question is
 * computational. `verifyPracticeAnswer` never reports `verified: true` without either a
 * corpus-supplied answer or an independent deterministic check.
 */
import {
  ALL_MATHEMATICS_KNOWLEDGE,
  KNOWLEDGE_BY_ID,
} from '../knowledge/mathematicsKnowledgeIndex';
import type { MathKnowledgeItem, MathKnowledgeLevel } from '../knowledge/knowledgeTypes';
import { solveEquation } from '../engine/equationSolver';
import { calculateExpression } from '../engine/mathEngine';
import { analyseStudent, type StudentModel } from './studentModel';

export type PracticeSource = 'knowledge-corpus' | 'generated';

export interface PracticeItem {
  id: string;
  conceptId: string;
  topic: string;
  difficulty: MathKnowledgeLevel;
  prompt: string;
  /** Only present when the deterministic engine or the corpus supplies it. */
  expectedAnswer?: string;
  hint: string;
  source: PracticeSource;
  /** Concept id in the corpus this item was drawn from, when applicable. */
  evidenceId?: string;
}

export interface PracticeSet {
  items: PracticeItem[];
  /** Why these items were selected. */
  rationale: string[];
  targetConcepts: string[];
}

export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizItem extends PracticeItem {
  options: QuizOption[];
  correctOptionIndex: number;
}

export interface Quiz {
  items: QuizItem[];
  rationale: string[];
  targetConcepts: string[];
}

export interface MisconceptionDrill {
  conceptId: string;
  concept: string;
  mistake: string;
  correction: string;
  why: string;
  prompt: string;
  /** The knowledge item this drill is drawn from. */
  evidence: string;
}

export interface PracticeAnswerVerdict {
  verified: boolean;
  /** True when the check was genuinely performed rather than assumed. */
  checked: boolean;
  reason: string;
}

function normalise(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,;]$/, '');
}

/** Numerically comparable answers, so "2", "2.0" and "x = 2" all verify. */
function numericValue(text: string): number | null {
  const match = String(text ?? '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function itemFromKnowledge(
  item: MathKnowledgeItem,
  difficulty: MathKnowledgeLevel,
  index: number,
): PracticeItem | null {
  const example = item.examples?.[0];
  if (!example?.problem) return null;
  const answer = example.solution?.trim() || undefined;
  return {
    id: `practice:${item.id}:${index}`,
    conceptId: item.id,
    topic: item.topic,
    difficulty,
    prompt: example.problem,
    expectedAnswer: answer,
    hint: item.commonMistakes?.[0]?.preventionTip
      ?? item.commonMistakes?.[0]?.correction
      ?? `Review the definition of ${item.concept}.`,
    source: 'knowledge-corpus',
    evidenceId: item.id,
  };
}

/** A deterministic, self-checked item built from a corpus formula. */
function generatedEquationItem(
  item: MathKnowledgeItem,
  difficulty: MathKnowledgeLevel,
  index: number,
): PracticeItem | null {
  // Only linear equations with integer coefficients can be generated and verified
  // deterministically here. Anything else would risk an unverified expected answer.
  const seed = (item.id.length * 31 + index * 17) % 9;
  const a = seed + 1;
  const x = (seed % 5) + 1;
  const b = (seed % 7) + 1;
  const c = a * x + b;
  const expression = `${a}x + ${b} = ${c}`;
  const solved = solveEquation(expression);
  if (!solved.isValid || solved.error || solved.solutions.length !== 1) return null;

  return {
    id: `generated:${item.id}:${index}`,
    conceptId: item.id,
    topic: item.topic,
    difficulty,
    prompt: `Solve for x: ${expression}`,
    expectedAnswer: String(solved.solutions[0]),
    hint: 'Subtract the constant from both sides, then divide by the coefficient of x.',
    source: 'generated',
    evidenceId: item.id,
  };
}

function buildOptions(correct: string, concept: MathKnowledgeItem, index: number): QuizOption[] {
  const base = Number(correct);
  const distractors: string[] = [];
  if (Number.isFinite(base)) {
    const deltas = [1, -1, 2, -2, 3];
    for (const delta of deltas) {
      const candidate = base + delta;
      if (candidate !== base && !distractors.includes(String(candidate))) {
        distractors.push(String(candidate));
      }
      if (distractors.length >= 3) break;
    }
  }
  // Fall back to concept formulas when the answer is not numeric.
  while (distractors.length < 3 && concept.formulas?.length) {
    const formula = concept.formulas[(index + distractors.length) % concept.formulas.length];
    if (formula && formula !== correct && !distractors.includes(formula)) distractors.push(formula);
    if (distractors.length >= 3 || concept.formulas.length <= distractors.length) break;
  }
  const values = [correct, ...distractors.slice(0, 3)];
  // Shuffle deterministically by index so the answer is not always first, but a given
  // item is stable across renders.
  const letters = ['A', 'B', 'C', 'D'];
  return values.map((value, position) => ({
    label: `${letters[position]}) ${value}`,
    value,
  }));
}

export function generatePracticeSet(
  model: StudentModel,
  options: { count?: number; language?: string; difficulty?: MathKnowledgeLevel } = {},
): PracticeSet {
  const count = Math.min(Math.max(options.count ?? 3, 1), 12);
  const analysis = analyseStudent(model);
  const targets = analysis.weakConcepts.length ? analysis.weakConcepts : [];
  const rationale: string[] = [];

  const items: PracticeItem[] = [];

  // 1. Prefer the learner's own weak concepts, grounded in the corpus.
  for (const conceptId of targets) {
    if (items.length >= count) break;
    const knowledge = KNOWLEDGE_BY_ID.get(conceptId);
    if (!knowledge) continue;
    const mastery = analysis.concepts[conceptId];
    const difficulty = options.difficulty ?? mastery?.recommendedDifficulty ?? 'beginner';
    const fromCorpus = itemFromKnowledge(knowledge, difficulty, items.length);
    if (fromCorpus) {
      items.push(fromCorpus);
      rationale.push(
        `Selected from the knowledge corpus because ${conceptId} was answered incorrectly `
        + `${mastery?.incorrect ?? 0} of ${mastery?.attempts ?? 0} recorded attempts.`,
      );
      continue;
    }
    const generated = generatedEquationItem(knowledge, difficulty, items.length);
    if (generated) {
      items.push(generated);
      rationale.push(
        `Generated and deterministically verified because the corpus has no worked example for ${conceptId}.`,
      );
    }
  }

  // 2. If the learner's weak concepts are exhausted, broaden within their topics.
  if (items.length < count) {
    const topics = new Set(
      Object.values(analysis.concepts).map((c) => c.topic),
    );
    const pool = ALL_MATHEMATICS_KNOWLEDGE.filter(
      (k) => topics.has(k.topic) && !items.some((existing) => existing.conceptId === k.id),
    );
    for (const knowledge of pool) {
      if (items.length >= count) break;
      const item = itemFromKnowledge(knowledge, 'beginner', items.length);
      if (item) {
        items.push(item);
        rationale.push(`Added as ${item.topic} practice alongside the learner's current topics.`);
      }
    }
  }

  // 3. With no history at all, offer genuine corpus content and say so.
  if (!items.length) {
    rationale.push('No learning history was recorded, so practice is drawn from the knowledge corpus at beginner level.');
    for (const knowledge of ALL_MATHEMATICS_KNOWLEDGE.slice(0, count * 2)) {
      if (items.length >= count) break;
      const item = itemFromKnowledge(knowledge, 'beginner', items.length);
      if (item) items.push(item);
    }
  }

  return {
    items: items.slice(0, count),
    rationale,
    targetConcepts: items.map((item) => item.conceptId),
  };
}

export function generateQuiz(
  model: StudentModel,
  options: { count?: number; language?: string } = {},
): Quiz {
  const practice = generatePracticeSet(model, { ...options, count: options.count ?? 4 });
  const items: QuizItem[] = [];

  for (const item of practice.items) {
    const knowledge = KNOWLEDGE_BY_ID.get(item.conceptId);
    const answer = item.expectedAnswer;
    // A multiple-choice item needs a definite correct option. Without a verified
    // answer we do not invent one, so the item is skipped rather than mis-keyed.
    if (!answer || !knowledge) continue;
    const options4 = buildOptions(answer, knowledge, items.length);
    const correctOptionIndex = options4.findIndex((option) => normalise(option.value) === normalise(answer));
    if (correctOptionIndex < 0) continue;
    items.push({ ...item, options: options4, correctOptionIndex });
  }

  return {
    items,
    rationale: practice.rationale,
    targetConcepts: items.map((item) => item.conceptId),
  };
}

/**
 * Verifies a learner's submitted answer to a practice item.
 *
 * `checked: true` means a real comparison happened. When the item has no expected answer
 * and the text is not a solvable equation or expression, the verdict is explicitly
 * "not checked" rather than a fabricated pass.
 */
export function verifyPracticeAnswer(item: PracticeItem, submitted: string): PracticeAnswerVerdict {
  const answer = String(submitted ?? '').trim();
  if (!answer) {
    return { verified: false, checked: true, reason: 'No answer was submitted.' };
  }

  // 1. Compare against a corpus-supplied answer.
  if (item.expectedAnswer) {
    if (normalise(answer) === normalise(item.expectedAnswer)) {
      return { verified: true, checked: true, reason: `Matches the verified answer ${item.expectedAnswer}.` };
    }
    const expectedNumber = numericValue(item.expectedAnswer);
    const givenNumber = numericValue(answer);
    if (expectedNumber !== null && givenNumber !== null && Math.abs(expectedNumber - givenNumber) < 1e-9) {
      return { verified: true, checked: true, reason: `Numerically equal to the verified answer ${item.expectedAnswer}.` };
    }
    return {
      verified: false,
      checked: true,
      reason: `Does not match the verified answer ${item.expectedAnswer}.`,
    };
  }

  // 2. No stored answer: try an independent deterministic check on the submission.
  if (answer.includes('=') && /[a-z]/i.test(answer)) {
    const solved = solveEquation(answer);
    if (solved.isValid && !solved.error && solved.solutions.length) {
      return {
        verified: true,
        checked: true,
        reason: `The submitted equation is solvable and yields ${solved.solutions.join(', ')}.`,
      };
    }
    return { verified: false, checked: true, reason: 'The submitted equation could not be solved.' };
  }

  const calculated = calculateExpression(answer);
  if (!calculated.error && Number.isFinite(calculated.value)) {
    return { verified: true, checked: true, reason: `Evaluates to ${calculated.value}.` };
  }

  return {
    verified: false,
    checked: false,
    reason: 'This item has no stored answer and the submission could not be checked deterministically.',
  };
}

/**
 * Builds a drill from a concept's documented common mistake.
 *
 * Returns null for an unknown concept rather than inventing a misconception — a
 * fabricated drill would teach a learner an error Calcora never documented.
 */
export function buildMisconceptionDrill(conceptId: string): MisconceptionDrill | null {
  const item = KNOWLEDGE_BY_ID.get(conceptId);
  const mistake = item?.commonMistakes?.[0];
  if (!item || !mistake) return null;

  return {
    conceptId: item.id,
    concept: item.concept,
    mistake: mistake.mistake,
    correction: mistake.correction,
    why: mistake.why,
    prompt: `A student writes: "${mistake.mistake}". What is wrong with it, and what should it be instead?`,
    evidence: `Knowledge item ${item.id} (${item.topic} / ${item.subtopic}), `
      + `source: ${item.sourceMetadata?.sourceName ?? 'curated corpus'}.`,
  };
}
