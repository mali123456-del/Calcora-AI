import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type KnowledgeRecord = Record<string, unknown>
type TutorRecord = Record<string, unknown>
type QuestionRecord = Record<string, unknown>

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceRoleKey)
const model = new Supabase.ai.Session('gte-small')

async function embed(text: string) {
  return await model.run(text.slice(0, 20000), { mean_pool: true, normalize: true })
}

async function hashText(text: string) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ')
  const bytes = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function syncRows(table: 'math_knowledge' | 'math_tutor_examples' | 'math_questions', rows: Record<string, unknown>[]) {
  let synced = 0
  let embedded = 0
  for (const item of rows.slice(0, 100)) {
    const searchable = typeof item.searchable_text === 'string' ? item.searchable_text : ''
    if (!searchable) continue
    const content_hash = await hashText(searchable)
    const payload = { ...item, content_hash, updated_at: new Date().toISOString() }

    if (table === 'math_questions' && item.status !== 'verified') {
      const { error } = await admin.from(table).upsert(payload, { onConflict: 'dataset_id,external_record_id' })
      if (error) throw error
      synced++
      continue
    }

    const embedding = await embed(searchable)
    const { error } = await admin.from(table).upsert(
      { ...payload, embedding: JSON.stringify(embedding) },
      { onConflict: table === 'math_knowledge' ? 'knowledge_id' : 'example_key' },
    )
    if (error) throw error
    synced++
    embedded++
  }
  return { synced, embedded }
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: corsHeaders })

    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return Response.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders })
    const { data: userData, error: authError } = await admin.auth.getUser(auth.slice(7))
    if (authError || !userData.user) return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders })

    try {
      const body = await req.json()
      const knowledge = Array.isArray(body.knowledge) ? body.knowledge as KnowledgeRecord[] : []
      const tutorExamples = Array.isArray(body.tutorExamples) ? body.tutorExamples as TutorRecord[] : []
      const questions = Array.isArray(body.questions) ? body.questions as QuestionRecord[] : []

      const knowledgeResult = await syncRows('math_knowledge', knowledge)
      const tutorResult = await syncRows('math_tutor_examples', tutorExamples)
      const questionResult = await syncRows('math_questions', questions)

      return Response.json({
        userId: userData.user.id,
        knowledgeSynced: knowledgeResult.synced,
        tutorExamplesSynced: tutorResult.synced,
        questionsSynced: questionResult.synced,
        embeddingsGenerated: knowledgeResult.embedded + tutorResult.embedded + questionResult.embedded,
        embeddingModel: 'gte-small',
        rejectedOrUnverifiedQuestionsAreStoredWithoutEmbedding: true,
      }, { headers: corsHeaders })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Corpus sync failed' }, { status: 500, headers: corsHeaders })
    }
  },
}
