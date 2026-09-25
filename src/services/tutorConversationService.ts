/**
 * Calcora AI - Tutor Conversation & State Management Service
 *
 * Persists and manages:
 * 1. Current mathematical problem context (expressions, topics, authoritative results, steps)
 * 2. User learning level (mastery by topic, difficulty tier, XP, streak)
 * 3. Message history across conversational sessions
 * 4. Functional tutor modes (Socratic, Step-by-Step, Quiz, Learn, Practice, Explain)
 *
 * Supports both browser localStorage and in-memory fallback for headless/test environments.
 */

import { MathTopic, DifficultyLevel } from '../utils/aiTutor';

export type FunctionalTutorMode =
  | 'socratic'
  | 'step-by-step'
  | 'quiz'
  | 'learn'
  | 'practice'
  | 'explain'
  | 'check-work'
  | 'challenge'
  | 'assistant';

export interface MathProblemContext {
  rawProblem: string;
  canonicalExpression?: string;
  problemType?: 'arithmetic' | 'equation' | 'calculus' | 'statistics' | 'trigonometry' | 'word_problem' | 'general';
  topic: MathTopic | string;
  difficulty: DifficultyLevel;
  authoritativeResult?: string | null;
  derivationSteps?: string[];
  currentSubstepIndex?: number;
  lastCheckedStep?: string;
  stepStatus?: 'correct' | 'partially_correct' | 'incorrect' | 'pending';
  lastUpdated: number;
}

export interface TopicMasteryRecord {
  topic: string;
  level: DifficultyLevel;
  problemsAttempted: number;
  problemsCorrect: number;
  consecutiveSuccess: number;
  lastActivityTimestamp: number;
}

export interface UserLearningLevel {
  difficulty: DifficultyLevel;
  experiencePoints: number;
  consecutiveCorrect: number;
  consecutiveMistakes: number;
  topicMastery: Record<string, TopicMasteryRecord>;
  lastAssessedTimestamp: number;
}

export interface TutorQuizItemData {
  question: string;
  options?: string[];
  correctAnswer?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  expression?: string | null;
  formula?: string | null;
  steps?: string[];
  isVerified?: boolean;
  verificationNote?: string;
  mode?: FunctionalTutorMode;
  problemContextSnapshot?: Partial<MathProblemContext>;
  quizData?: TutorQuizItemData;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeTutorMode: FunctionalTutorMode;
  problemContext: MathProblemContext;
  learningLevel: UserLearningLevel;
  messages: TutorMessage[];
  hintsUsedCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

// Storage keys
const SESSIONS_STORAGE_KEY = 'calcora_tutor_sessions_v2';
const ACTIVE_SESSION_ID_KEY = 'calcora_tutor_active_session_id_v2';
const GLOBAL_LEARNING_LEVEL_KEY = 'calcora_tutor_global_learning_level_v2';

// In-memory fallback for SSR and test execution
let memorySessionsStore: Map<string, ConversationSession> = new Map();
let memoryActiveSessionId: string | null = null;
let memoryGlobalLearningLevel: UserLearningLevel | null = null;

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function getDefaultLearningLevel(): UserLearningLevel {
  return {
    difficulty: 'intermediate',
    experiencePoints: 0,
    consecutiveCorrect: 0,
    consecutiveMistakes: 0,
    topicMastery: {},
    lastAssessedTimestamp: Date.now(),
  };
}

export function getDefaultProblemContext(): MathProblemContext {
  return {
    rawProblem: '',
    canonicalExpression: '',
    problemType: 'general',
    topic: 'Algebra',
    difficulty: 'intermediate',
    authoritativeResult: null,
    derivationSteps: [],
    currentSubstepIndex: 0,
    lastUpdated: Date.now(),
  };
}

export function createDefaultSession(id?: string): ConversationSession {
  const sessionId = id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  return {
    id: sessionId,
    title: 'New Math Exploration',
    createdAt: now,
    updatedAt: now,
    activeTutorMode: 'socratic',
    problemContext: getDefaultProblemContext(),
    learningLevel: loadGlobalLearningLevel(),
    messages: [
      {
        id: `welcome-${sessionId}`,
        role: 'assistant',
        content:
          'Welcome! I am your **Interactive AI Math Tutor 2.0**.\n\nChoose a tutoring mode above (e.g. **Socratic**, **Step-by-Step**, or **Quiz**), enter any math problem or expression, and let us explore together!',
        timestamp: now,
        mode: 'socratic',
      },
    ],
    hintsUsedCount: 0,
    isPinned: false,
    isArchived: false,
  };
}

// ---------------------------------------------------------------------------
// Global Learning Level Persistence
// ---------------------------------------------------------------------------

export function loadGlobalLearningLevel(): UserLearningLevel {
  if (isLocalStorageAvailable()) {
    try {
      const raw = localStorage.getItem(GLOBAL_LEARNING_LEVEL_KEY);
      if (raw) {
        return { ...getDefaultLearningLevel(), ...JSON.parse(raw) };
      }
    } catch {}
  }
  if (!memoryGlobalLearningLevel) {
    memoryGlobalLearningLevel = getDefaultLearningLevel();
  }
  return memoryGlobalLearningLevel;
}

export function saveGlobalLearningLevel(level: UserLearningLevel): void {
  memoryGlobalLearningLevel = level;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(GLOBAL_LEARNING_LEVEL_KEY, JSON.stringify(level));
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Session Collection Persistence
// ---------------------------------------------------------------------------

export function listSessions(): ConversationSession[] {
  if (memorySessionsStore.size === 0 && isLocalStorageAvailable()) {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: ConversationSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const s of parsed) {
            memorySessionsStore.set(s.id, s);
          }
        }
      }
    } catch {}
  }

  if (memorySessionsStore.size > 0) {
    return Array.from(memorySessionsStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Create initial session if none exist without recursion
  const initial = createDefaultSession();
  memorySessionsStore.set(initial.id, initial);
  memoryActiveSessionId = initial.id;

  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([initial]));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, initial.id);
    } catch {}
  }

  return [initial];
}

export function saveSessionsList(sessions: ConversationSession[]): void {
  memorySessionsStore.clear();
  for (const s of sessions) {
    memorySessionsStore.set(s.id, s);
  }

  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }
}

export function getSession(id: string): ConversationSession | null {
  if (memorySessionsStore.has(id)) {
    return memorySessionsStore.get(id) || null;
  }
  const sessions = listSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function saveSession(session: ConversationSession): void {
  const updatedSession = { ...session, updatedAt: Date.now() };
  memorySessionsStore.set(session.id, updatedSession);

  const sessions = Array.from(memorySessionsStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }
}

export function getActiveSessionId(): string {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
      if (stored) return stored;
    } catch {}
  }
  if (memoryActiveSessionId) return memoryActiveSessionId;

  const sessions = listSessions();
  const firstId = sessions[0]?.id || 'default-session';
  setActiveSessionId(firstId);
  return firstId;
}

export function setActiveSessionId(id: string): void {
  memoryActiveSessionId = id;
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
    } catch {}
  }
}

export function getActiveSession(): ConversationSession {
  const activeId = getActiveSessionId();
  const session = getSession(activeId);
  if (session) return session;

  const newSession = createDefaultSession(activeId);
  saveSession(newSession);
  return newSession;
}

export function createNewSession(options?: {
  title?: string;
  mode?: FunctionalTutorMode;
  initialTopic?: MathTopic | string;
}): ConversationSession {
  const session = createDefaultSession();
  if (options?.title) session.title = options.title;
  if (options?.mode) session.activeTutorMode = options.mode;
  if (options?.initialTopic) session.problemContext.topic = options.initialTopic;

  saveSession(session);
  setActiveSessionId(session.id);
  return session;
}

export function deleteSession(id: string): void {
  let sessions = listSessions().filter((s) => s.id !== id);
  if (sessions.length === 0) {
    const fallback = createDefaultSession();
    sessions = [fallback];
    setActiveSessionId(fallback.id);
  } else if (getActiveSessionId() === id) {
    setActiveSessionId(sessions[0].id);
  }
  saveSessionsList(sessions);
}

export function clearActiveSessionHistory(): ConversationSession {
  const session = getActiveSession();
  session.messages = [
    {
      id: `welcome-${session.id}-${Date.now()}`,
      role: 'assistant',
      content: 'Session cleared. Ask a new mathematical question or choose a mode above.',
      timestamp: Date.now(),
      mode: session.activeTutorMode,
    },
  ];
  session.problemContext = getDefaultProblemContext();
  session.updatedAt = Date.now();
  saveSession(session);
  return session;
}

// ---------------------------------------------------------------------------
// Context & State Updates
// ---------------------------------------------------------------------------

export function updateProblemContext(
  updates: Partial<MathProblemContext>,
  sessionId?: string
): MathProblemContext {
  const targetSession = sessionId ? getSession(sessionId) || getActiveSession() : getActiveSession();
  const updatedContext: MathProblemContext = {
    ...targetSession.problemContext,
    ...updates,
    lastUpdated: Date.now(),
  };

  targetSession.problemContext = updatedContext;

  // Auto-generate title if session still has placeholder
  if (
    updates.rawProblem &&
    (targetSession.title === 'New Math Exploration' || targetSession.title.startsWith('Session'))
  ) {
    targetSession.title = updates.rawProblem.slice(0, 32).trim();
  }

  saveSession(targetSession);
  return updatedContext;
}

export function setTutorMode(
  mode: FunctionalTutorMode,
  sessionId?: string
): ConversationSession {
  const targetSession = sessionId ? getSession(sessionId) || getActiveSession() : getActiveSession();
  targetSession.activeTutorMode = mode;
  targetSession.updatedAt = Date.now();
  saveSession(targetSession);
  return targetSession;
}

export function addMessageToActiveSession(
  message: Omit<TutorMessage, 'id' | 'timestamp'>,
  sessionId?: string
): TutorMessage {
  const targetSession = sessionId ? getSession(sessionId) || getActiveSession() : getActiveSession();
  const fullMessage: TutorMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    problemContextSnapshot: message.problemContextSnapshot || { ...targetSession.problemContext },
  };

  targetSession.messages.push(fullMessage);

  // If user provided a mathematical problem in message, update problem context
  if (
    message.role === 'user' &&
    (message.content.includes('=') || /[0-9]/.test(message.content))
  ) {
    if (!targetSession.problemContext.rawProblem) {
      targetSession.problemContext.rawProblem = message.content;
      targetSession.problemContext.lastUpdated = Date.now();
    }
  }

  saveSession(targetSession);
  return fullMessage;
}

// ---------------------------------------------------------------------------
// Adaptive Learning Level Engine
// ---------------------------------------------------------------------------

export function adaptLearningLevel(
  topic: string,
  wasCorrect: boolean,
  sessionId?: string
): UserLearningLevel {
  const globalLevel = loadGlobalLearningLevel();
  const currentLevel = { ...globalLevel };

  const currentTopicRecord: TopicMasteryRecord = currentLevel.topicMastery[topic] || {
    topic,
    level: currentLevel.difficulty,
    problemsAttempted: 0,
    problemsCorrect: 0,
    consecutiveSuccess: 0,
    lastActivityTimestamp: Date.now(),
  };

  currentTopicRecord.problemsAttempted += 1;
  currentTopicRecord.lastActivityTimestamp = Date.now();

  const difficultyProgression: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  const curIdx = difficultyProgression.indexOf(currentLevel.difficulty);

  if (wasCorrect) {
    currentLevel.experiencePoints += 25;
    currentLevel.consecutiveCorrect += 1;
    currentLevel.consecutiveMistakes = 0;
    currentTopicRecord.problemsCorrect += 1;
    currentTopicRecord.consecutiveSuccess += 1;

    // Level up topic or global difficulty if 3 consecutive correct
    if (currentLevel.consecutiveCorrect >= 3 && curIdx < difficultyProgression.length - 1) {
      currentLevel.difficulty = difficultyProgression[curIdx + 1];
      currentTopicRecord.level = currentLevel.difficulty;
      currentLevel.consecutiveCorrect = 0;
    }
  } else {
    currentLevel.experiencePoints = Math.max(0, currentLevel.experiencePoints + 5); // Participation XP
    currentLevel.consecutiveCorrect = 0;
    currentLevel.consecutiveMistakes += 1;
    currentTopicRecord.consecutiveSuccess = 0;

    // Step down difficulty if 2 consecutive mistakes on hard problems
    if (currentLevel.consecutiveMistakes >= 2 && curIdx > 0) {
      currentLevel.difficulty = difficultyProgression[curIdx - 1];
      currentTopicRecord.level = currentLevel.difficulty;
      currentLevel.consecutiveMistakes = 0;
    }
  }

  currentTopicRecord.level = currentLevel.difficulty;
  currentLevel.topicMastery[topic] = currentTopicRecord;
  currentLevel.lastAssessedTimestamp = Date.now();

  saveGlobalLearningLevel(currentLevel);

  // Sync to active session
  const targetSession = sessionId ? getSession(sessionId) || getActiveSession() : getActiveSession();
  targetSession.learningLevel = currentLevel;
  targetSession.problemContext.difficulty = currentLevel.difficulty;
  saveSession(targetSession);

  return currentLevel;
}

// ---------------------------------------------------------------------------
// Export Session to Markdown
// ---------------------------------------------------------------------------

export function exportSessionMarkdown(sessionId?: string): string {
  const session = sessionId ? getSession(sessionId) || getActiveSession() : getActiveSession();
  const dateStr = new Date(session.createdAt).toLocaleDateString();

  let md = `# Calcora AI Tutor Session: ${session.title}\n`;
  md += `**Date**: ${dateStr}  \n`;
  md += `**Mode**: ${session.activeTutorMode.toUpperCase()}  \n`;
  md += `**Topic**: ${session.problemContext.topic} (${session.learningLevel.difficulty})  \n\n`;

  if (session.problemContext.rawProblem) {
    md += `### Active Problem Context\n`;
    md += `**Problem**: ${session.problemContext.rawProblem}  \n`;
    if (session.problemContext.authoritativeResult) {
      md += `**Authoritative Result**: \`${session.problemContext.authoritativeResult}\` (Deterministic Verified)  \n`;
    }
    md += `\n---\n\n`;
  }

  md += `### Conversation Transcript\n\n`;
  for (const m of session.messages) {
    const roleName = m.role === 'user' ? '👤 Student' : m.role === 'assistant' ? '🎓 AI Tutor' : '⚙️ System';
    md += `#### ${roleName} (${new Date(m.timestamp).toLocaleTimeString()})\n\n`;
    md += `${m.content}\n\n`;
    if (m.formula) {
      md += `*Key Formula*: $$${m.formula.replace(/^\$+|\$+$/g, '')}$$\n\n`;
    }
    if (m.steps && m.steps.length > 0) {
      md += `**Derivation Steps**:\n`;
      m.steps.forEach((step, idx) => {
        md += `${idx + 1}. ${step}\n`;
      });
      md += `\n`;
    }
    if (m.isVerified) {
      md += `> ✅ **Deterministic Verification**: ${m.verificationNote || '100% verified by calculation engine'}\n\n`;
    }
  }

  return md;
}
