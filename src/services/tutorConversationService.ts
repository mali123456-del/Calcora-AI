import type { AIMessage } from '../types';
import type { DifficultyLevel, MathTopic, TutorMode } from '../utils/aiTutor';

export type TutorLearningLevel = DifficultyLevel;
export type FunctionalTutorMode = TutorMode;
export type MathProblemContext = TutorProblemContext;
export type UserLearningLevel = TutorLearningState;

export interface TutorQuizItemData {
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  hint?: string;
  explanation: string;
}

export interface TutorProblemContext {
  rawProblem: string;
  canonicalExpression?: string;
  problemType?: string;
  topic: MathTopic;
  difficulty: DifficultyLevel;
  authoritativeResult?: string;
  derivationSteps: string[];
  currentSubstepIndex: number;
  messageCount: number;
  updatedAt: number;
}

export interface TutorLearningState {
  level: TutorLearningLevel;
  xp: number;
  consecutiveCorrect: number;
  consecutiveMistakes: number;
  topicMastery: Partial<Record<MathTopic, number>>;
}

export interface TutorConversationState {
  id: string;
  title: string;
  mode: TutorMode;
  messages: AIMessage[];
  problemContext: TutorProblemContext | null;
  learning: TutorLearningState;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'calcora_tutor_conversation_state_v2';
const MAX_MESSAGES = 200;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function persist(state: TutorConversationState): TutorConversationState {
  const value = { ...state, updatedAt: Date.now() };
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
  return value;
}

export function createTutorConversationState(id = `tutor-${Date.now()}`, title = 'Math Tutor Session'): TutorConversationState {
  const now = Date.now();
  return {
    id,
    title,
    mode: 'tutor',
    messages: [{
      id: `welcome-${now}`,
      role: 'assistant',
      content: 'Tutor session ready. Give me a problem, ask a question, or choose a tutoring mode.',
      timestamp: now,
    }],
    problemContext: null,
    learning: {
      level: 'intermediate',
      xp: 0,
      consecutiveCorrect: 0,
      consecutiveMistakes: 0,
      topicMastery: {},
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function loadTutorConversationState(): TutorConversationState {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return createTutorConversationState();
    const parsed = JSON.parse(raw) as TutorConversationState;
    if (!parsed?.id || !Array.isArray(parsed.messages) || !parsed.learning) return createTutorConversationState();
    return parsed;
  } catch {
    return createTutorConversationState();
  }
}

export function appendTutorMessage(state: TutorConversationState, message: AIMessage): TutorConversationState {
  const messages = [...state.messages, message].slice(-MAX_MESSAGES);
  const nextContext = state.problemContext
    ? { ...state.problemContext, messageCount: messages.length, updatedAt: Date.now() }
    : state.problemContext;
  return persist({ ...state, messages, problemContext: nextContext });
}

export function updateTutorProblemContext(
  state: TutorConversationState,
  update: Partial<Omit<TutorProblemContext, 'messageCount' | 'updatedAt'>>,
): TutorConversationState {
  const current = state.problemContext;
  const next: TutorProblemContext = {
    rawProblem: update.rawProblem ?? current?.rawProblem ?? '',
    canonicalExpression: update.canonicalExpression ?? current?.canonicalExpression,
    problemType: update.problemType ?? current?.problemType,
    topic: update.topic ?? current?.topic ?? 'Algebra',
    difficulty: update.difficulty ?? current?.difficulty ?? state.learning.level,
    authoritativeResult: update.authoritativeResult ?? current?.authoritativeResult,
    derivationSteps: update.derivationSteps ?? current?.derivationSteps ?? [],
    currentSubstepIndex: update.currentSubstepIndex ?? current?.currentSubstepIndex ?? 0,
    messageCount: state.messages.length,
    updatedAt: Date.now(),
  };
  return persist({ ...state, problemContext: next });
}

export function adaptTutorLearningLevel(state: TutorConversationState, outcome: { correct: boolean; topic?: MathTopic }): TutorConversationState {
  const levels: TutorLearningLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  let consecutiveCorrect = outcome.correct ? state.learning.consecutiveCorrect + 1 : 0;
  let consecutiveMistakes = outcome.correct ? 0 : state.learning.consecutiveMistakes + 1;
  let level = state.learning.level;
  let xp = state.learning.xp + (outcome.correct ? 25 : 5);
  const index = levels.indexOf(level);
  if (consecutiveCorrect >= 3 && index < levels.length - 1) {
    level = levels[index + 1];
    consecutiveCorrect = 0;
  } else if (consecutiveMistakes >= 2 && index > 0) {
    level = levels[index - 1];
    consecutiveMistakes = 0;
  }
  const topic = outcome.topic ?? state.problemContext?.topic;
  const topicMastery = { ...state.learning.topicMastery };
  if (topic) topicMastery[topic] = Math.min(100, Math.max(0, (topicMastery[topic] ?? 0) + (outcome.correct ? 5 : -3)));
  return persist({ ...state, learning: { level, xp, consecutiveCorrect, consecutiveMistakes, topicMastery } });
}

export function setTutorMode(state: TutorConversationState, mode: TutorMode): TutorConversationState {
  const reset = createTutorConversationState(state.id, state.title);
  return persist({ ...reset, mode, createdAt: state.createdAt });
}

export function resetTutorSession(state: TutorConversationState): TutorConversationState {
  return persist(createTutorConversationState(state.id, state.title));
}

export function exportTutorSessionMarkdown(state: TutorConversationState): string {
  const lines = [
    '# Math Tutor Session',
    '',
    `- Mode: ${state.mode}`,
    `- Learning level: ${state.learning.level}`,
    `- XP: ${state.learning.xp}`,
    state.problemContext ? `- Problem: ${state.problemContext.rawProblem}` : '- Problem: none',
    '',
    '## Transcript',
    '',
  ];
  for (const message of state.messages) {
    lines.push(`### ${message.role === 'user' ? 'User' : 'Tutor'}`, '', message.content, '');
    if (message.steps?.length) lines.push(...message.steps.map((step, i) => `${i + 1}. ${step}`), '');
  }
  return lines.join('\n');
}
