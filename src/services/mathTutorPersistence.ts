import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

const MATH_CORPUS_SYNC_KEY = 'calcora_math_corpus_sync_v1_4_0';

export interface PersistedTutorMessage {
  id?: string;
  conversation_id?: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  provider?: string;
  status?: string;
  tokens?: number;
  created_at?: string;
}

export interface MathRAGResult {
  knowledge: Array<{
    knowledge_id: string;
    concept: string;
    topic: string;
    definition: string;
    formulas: string[];
    examples: string[];
    common_mistakes: string[];
    similarity: number;
  }>;
  questions: Array<{
    id: string;
    question: string;
    final_answer?: string;
    topic?: string;
    status: string;
    verification_note?: string;
    similarity: number;
  }>;
  tutorExamples: Array<{
    id: string;
    example_key: string;
    topic: string;
    ideal_behavior: string;
    answer_strategy: string;
    similarity: number;
  }>;
  retrievalMode: string;
}

export async function getCurrentSupabaseUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function retrieveMathRAG(query: string, limit = 5): Promise<MathRAGResult | null> {
  if (!supabase) return null;
  const user = await getCurrentSupabaseUser();
  if (!user) return null;

  const { data, error } = await supabase.functions.invoke('math-rag', {
    body: { query: query.slice(0, 4000), limit },
  });

  if (error) throw error;
  return data as MathRAGResult;
}

export async function createTutorConversation(title = 'Math Tutor Session') {
  if (!supabase) return null;
  const user = await getCurrentSupabaseUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title, model: 'calcora-math-tutor' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function saveTutorMessage(message: PersistedTutorMessage) {
  if (!supabase) return null;
  const user = await getCurrentSupabaseUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: message.conversation_id,
      user_id: user.id,
      role: message.role,
      content: message.content,
      model: message.model,
      provider: message.provider,
      status: message.status ?? 'complete',
      tokens: message.tokens,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function logMathRetrieval(payload: {
  queryText: string;
  knowledgeIds: string[];
  questionIds?: string[];
  tutorExampleIds?: string[];
  conversationId?: string;
  retrievalMode?: string;
}) {
  if (!supabase) return;
  const user = await getCurrentSupabaseUser();
  if (!user) return;

  const { error } = await supabase.from('math_retrieval_events').insert({
    user_id: user.id,
    conversation_id: payload.conversationId,
    query_text: payload.queryText.slice(0, 4000),
    retrieved_knowledge_ids: payload.knowledgeIds.slice(0, 20),
    retrieved_question_ids: (payload.questionIds ?? []).slice(0, 20),
    retrieved_tutor_example_ids: (payload.tutorExampleIds ?? []).slice(0, 20),
    retrieval_mode: payload.retrievalMode ?? 'local-index',
  });

  if (error) throw error;
}

export async function saveMathAttempt(payload: {
  conversationId?: string;
  topic?: string;
  problem: string;
  submittedAnswer?: string;
  expectedAnswer?: string;
  isCorrect?: boolean;
  verificationStatus?: string;
  verificationNote?: string;
  hintsUsed?: number;
  difficulty?: string;
}) {
  if (!supabase) return;
  const user = await getCurrentSupabaseUser();
  if (!user) return;

  const { error } = await supabase.from('math_attempts').insert({
    user_id: user.id,
    conversation_id: payload.conversationId,
    topic: payload.topic,
    problem: payload.problem.slice(0, 10000),
    submitted_answer: payload.submittedAnswer?.slice(0, 5000),
    expected_answer: payload.expectedAnswer?.slice(0, 5000),
    is_correct: payload.isCorrect,
    verification_status: payload.verificationStatus,
    verification_note: payload.verificationNote?.slice(0, 1000),
    hints_used: Math.max(0, payload.hintsUsed ?? 0),
    difficulty: payload.difficulty,
  });

  if (error) throw error;
}

export async function upsertMathProgress(progress: {
  questionsAttempted?: number;
  questionsCorrect?: number;
  hintsUsed?: number;
  mistakesCount?: number;
  currentDifficulty?: string;
  strengths?: string[];
  weakTopics?: string[];
  topicStats?: Record<string, unknown>;
}) {
  if (!supabase) return;
  const user = await getCurrentSupabaseUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('math_tutor_progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const next = {
    user_id: user.id,
    questions_attempted: progress.questionsAttempted ?? existing?.questions_attempted ?? 0,
    questions_correct: progress.questionsCorrect ?? existing?.questions_correct ?? 0,
    hints_used: progress.hintsUsed ?? existing?.hints_used ?? 0,
    mistakes_count: progress.mistakesCount ?? existing?.mistakes_count ?? 0,
    current_difficulty: progress.currentDifficulty ?? existing?.current_difficulty ?? 'intermediate',
    strengths: progress.strengths ?? existing?.strengths ?? [],
    weak_topics: progress.weakTopics ?? existing?.weak_topics ?? [],
    topic_stats: progress.topicStats ?? existing?.topic_stats ?? {},
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('math_tutor_progress').upsert(next, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function loadRecentTutorMessages(conversationId: string, limit = 100) {
  if (!supabase) return [];
  const user = await getCurrentSupabaseUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, user_id, role, content, model, provider, status, tokens, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) throw error;
  return (data ?? []) as PersistedTutorMessage[];
}


export async function syncLocalMathCorpus(
  knowledge: Array<Record<string, unknown>>,
  tutorExamples: Array<Record<string, unknown>>,
) {
  if (!supabase) return null;
  const user = await getCurrentSupabaseUser();
  if (!user) return null;
  if (localStorage.getItem(MATH_CORPUS_SYNC_KEY) === 'complete') return { skipped: true };

  const { data, error } = await supabase.functions.invoke('math-corpus-sync', {
    body: {
      knowledge: knowledge.slice(0, 100),
      tutorExamples: tutorExamples.slice(0, 50),
    },
  });
  if (error) throw error;
  const knowledgeComplete = knowledge.length === 0 || data?.knowledgeSynced === knowledge.length;
  const tutorExamplesComplete = tutorExamples.length === 0 || data?.tutorExamplesSynced === tutorExamples.length;
  // The sync function currently receives knowledge + tutor examples only.
  // Do not reference an out-of-scope questions array or falsely claim question sync completion.
  // Questions are ingested through the dataset pipeline and verified separately.
  if (knowledgeComplete && tutorExamplesComplete) {
    localStorage.setItem(MATH_CORPUS_SYNC_KEY, 'complete');
  }
  return data;
}
