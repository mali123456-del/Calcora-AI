import type { AIMessage } from '../types';
import type { DifficultyLevel, MathTopic, TutorMode } from '../utils/aiTutor';
import { getActiveWorkspaceId } from '../engine/workspaceEngine';

export type TutorLearningLevel = DifficultyLevel;

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

/**
 * Storage layout.
 *
 * Version 2 kept one conversation per origin, so tutor transcripts and learning
 * state leaked across workspaces on the same machine. Version 3 stores one
 * conversation bucket per workspace id, so each workspace keeps its own session.
 * The legacy v2 value is migrated into the active workspace's bucket on first
 * read and then removed, so no user data is lost.
 */
const LEGACY_STORAGE_KEY = 'calcora_tutor_conversation_state_v2';
const STORAGE_KEY = 'calcora_tutor_conversation_state_v3';
const MAX_MESSAGES = 200;
/** Bound the store so many workspaces cannot grow localStorage without limit. */
const MAX_WORKSPACE_BUCKETS = 25;

interface WorkspaceConversationStore {
  version: 3;
  conversations: Record<string, TutorConversationState>;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isConversationState(value: unknown): value is TutorConversationState {
  const v = value as Partial<TutorConversationState> | null;
  return Boolean(v && typeof v === 'object' && typeof v.id === 'string' && Array.isArray(v.messages) && typeof v.learning === 'object' && v.learning !== null);
}

function readWorkspaceStore(): WorkspaceConversationStore {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return { version: 3, conversations: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceConversationStore>;
    if (parsed?.version !== 3 || !parsed.conversations || typeof parsed.conversations !== 'object') {
      return { version: 3, conversations: {} };
    }
    const conversations: Record<string, TutorConversationState> = {};
    for (const [workspaceId, state] of Object.entries(parsed.conversations)) {
      // Corrupt or hand-edited buckets are dropped, never fatal (Phase L).
      if (typeof workspaceId === 'string' && isConversationState(state)) {
        conversations[workspaceId] = state;
      }
    }
    return { version: 3, conversations };
  } catch {
    return { version: 3, conversations: {} };
  }
}

function writeWorkspaceStore(store: WorkspaceConversationStore): void {
  const s = storage();
  if (!s) return;
  try {
    // Evict the least recently updated buckets beyond the bound.
    const entries = Object.entries(store.conversations)
      .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0));
    const bounded = Object.fromEntries(entries.slice(0, MAX_WORKSPACE_BUCKETS));
    s.setItem(STORAGE_KEY, JSON.stringify({ version: 3, conversations: bounded } satisfies WorkspaceConversationStore));
  } catch {}
}

/**
 * Migrates any legacy v2 conversation into the active workspace's bucket. Called
 * on load so nothing a user wrote before this change is silently dropped.
 */
function migrateLegacyConversation(store: WorkspaceConversationStore, workspaceId: string): void {
  const raw = storage()?.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as TutorConversationState;
    if (isConversationState(parsed) && !store.conversations[workspaceId]) {
      store.conversations[workspaceId] = parsed;
      writeWorkspaceStore(store);
    }
    // Remove the legacy value only after a successful store write; on storage
    // failure the legacy data stays and migration retries next load.
    if (storage()?.getItem(STORAGE_KEY)) storage()?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Legacy value is unreadable; leave it in place and continue fresh.
    try { storage()?.removeItem(LEGACY_STORAGE_KEY); } catch {}
  }
}

function persist(state: TutorConversationState): TutorConversationState {
  const value = { ...state, updatedAt: Date.now() };
  const workspaceId = getActiveWorkspaceId();
  const store = readWorkspaceStore();
  store.conversations[workspaceId] = value;
  writeWorkspaceStore(store);
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
    const workspaceId = getActiveWorkspaceId();
    const store = readWorkspaceStore();
    const bucket = store.conversations[workspaceId];
    if (bucket && isConversationState(bucket)) return bucket;
    migrateLegacyConversation(store, workspaceId);
    const migrated = readWorkspaceStore().conversations[workspaceId];
    if (migrated && isConversationState(migrated)) return migrated;
    return createTutorConversationState();
  } catch {
    return createTutorConversationState();
  }
}

export function appendTutorMessage(
  state: TutorConversationState,
  message: Partial<AIMessage> & Pick<AIMessage, 'role' | 'content'>,
): TutorConversationState {
  const fullMessage: AIMessage = {
    id: message.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp ?? Date.now(),
    steps: message.steps,
    verificationNote: message.verificationNote,
    formula: message.formula,
    expression: message.expression,
    result: message.result,
    isVerified: message.isVerified,
    isError: message.isError,
  };
  const messages = [...state.messages, fullMessage].slice(-MAX_MESSAGES);
  const nextContext = state.problemContext
    ? { ...state.problemContext, messageCount: messages.length, updatedAt: Date.now() }
    : state.problemContext;
  return persist({ ...state, messages, problemContext: nextContext });
}

/**
 * Removes the trailing exchange (from the last user message onward, including
 * the assistant reply) so a regenerated answer replaces the previous one
 * instead of duplicating it in the persisted Tutor conversation. Returns the
 * truncated, persisted state; a state with no answerable exchange is unchanged.
 */
export function truncateLastTutorExchange(state: TutorConversationState): TutorConversationState {
  const messages = state.messages;
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  // Nothing to truncate without a user question, or when the user message is
  // itself the last entry (a question still awaiting its first answer).
  if (lastUserIdx === -1 || lastUserIdx === messages.length - 1) return state;
  const nextMessages = messages.slice(0, lastUserIdx);
  const nextContext = state.problemContext
    ? { ...state.problemContext, messageCount: nextMessages.length, updatedAt: Date.now() }
    : state.problemContext;
  return persist({ ...state, messages: nextMessages, problemContext: nextContext });
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
  const learning = update.difficulty
    ? { ...state.learning, level: update.difficulty }
    : state.learning;
  return persist({ ...state, problemContext: next, learning });
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
  return persist({
    ...reset,
    mode,
    createdAt: state.createdAt,
    problemContext: state.problemContext,
    learning: state.learning,
  });
}

export function resetTutorSession(state: TutorConversationState): TutorConversationState {
  return persist(createTutorConversationState(state.id, state.title));
}

export interface TutorFollowUpContext {
  isFollowUp: boolean;
  reason: 'explicit' | 'referential' | 'continuation' | 'new-problem';
  activeProblem: TutorProblemContext | null;
  learningLevel: TutorLearningLevel;
  topicMastery: Partial<Record<MathTopic, number>>;
  recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const FOLLOW_UP_PATTERNS = [
  /\b(what next|what do i do next|the next step|next step|continue|go on|keep going|explain more|more detail|why|how did you|how do i|what does (this|that) mean|i don't understand|check (my|this) answer|is (my|this) answer|another step)\b/i,
  /\b(this|that|it|the answer|the step|the equation|the problem)\b/i,
];

export function isTutorFollowUpPrompt(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) return false;
  return FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildTutorFollowUpContext(
  state: TutorConversationState,
  prompt: string,
  maxTurns = 6,
): TutorFollowUpContext {
  const activeProblem = state.problemContext;
  const isFollowUp = Boolean(activeProblem) && isTutorFollowUpPrompt(prompt);
  const recentTurns = state.messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-Math.max(2, Math.min(maxTurns, 12)))
    .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content }));

  let reason: TutorFollowUpContext['reason'] = 'new-problem';
  if (isFollowUp) {
    if (/\b(what next|what do i do next|the next step|next step|continue|go on|keep going)\b/i.test(prompt)) reason = 'continuation';
    else if (/\b(this|that|it|the step|the equation|the problem|the answer)\b/i.test(prompt)) reason = 'referential';
    else reason = 'explicit';
  }

  return {
    isFollowUp,
    reason,
    activeProblem,
    learningLevel: state.learning.level,
    topicMastery: state.learning.topicMastery,
    recentTurns,
  };
}

export function formatTutorContinuityContext(context: TutorFollowUpContext): string {
  const problem = context.activeProblem;
  const mastery = Object.entries(context.topicMastery)
    .filter(([, value]) => typeof value === 'number')
    .map(([topic, value]) => `${topic}: ${Math.round(value)}%`)
    .join(', ');

  const recent = context.recentTurns
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Tutor'}: ${turn.content}`)
    .join('\n');

  return [
    '[TUTOR CONTINUITY CONTEXT]',
    `Follow-up detected: ${context.isFollowUp ? 'yes' : 'no'}`,
    `Follow-up reason: ${context.reason}`,
    `Learning level: ${context.learningLevel}`,
    mastery ? `Topic mastery: ${mastery}` : 'Topic mastery: no recorded mastery yet',
    problem
      ? [
          `Active problem: ${problem.rawProblem}`,
          problem.canonicalExpression ? `Canonical expression: ${problem.canonicalExpression}` : '',
          `Topic: ${problem.topic}`,
          `Difficulty: ${problem.difficulty}`,
          problem.authoritativeResult ? `Authoritative result: ${problem.authoritativeResult}` : '',
          problem.currentSubstepIndex >= 0 ? `Current substep index: ${problem.currentSubstepIndex}` : '',
        ].filter(Boolean).join('\n')
      : 'Active problem: none',
    recent ? `Recent conversation:\n${recent}` : 'Recent conversation: none',
    'Use this context to resolve references such as “this”, “that”, “the next step”, and “why”. Do not invent a new problem when an active problem exists.',
  ].join('\n');
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

export type FunctionalTutorMode = TutorMode;
export type MathProblemContext = TutorProblemContext;
export type UserLearningLevel = TutorLearningLevel;
export interface TutorQuizItemData {
  question: string;
  options?: string[];
  answerIndex?: number;
  correctAnswer?: string;
  explanation: string;
  userAnswer?: string;
  isCorrect?: boolean;
}
