import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
      const body = await req.json()
      const query = typeof body.query === 'string' ? body.query.trim().slice(0, 4000) : ''
      if (!query) return Response.json({ error: 'query is required' }, { status: 400, headers: corsHeaders })

      const model = new Supabase.ai.Session('gte-small')
      const embedding = await model.run(query, { mean_pool: true, normalize: true })
      const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20)
      const threshold = Math.min(Math.max(Number(body.threshold) || 0.65, 0), 1)

      const [knowledge, questions, examples] = await Promise.all([
        ctx.supabase.rpc('match_math_knowledge', { query_embedding: embedding, match_threshold: threshold, match_count: limit }),
        ctx.supabase.rpc('match_math_questions', { query_embedding: embedding, match_threshold: threshold, match_count: limit }),
        ctx.supabase.rpc('match_math_tutor_examples', { query_embedding: embedding, match_threshold: threshold, match_count: limit }),
      ])

      const firstError = knowledge.error || questions.error || examples.error
      if (firstError) return Response.json({ error: firstError.message }, { status: 500, headers: corsHeaders })

      await ctx.supabase.from('math_retrieval_events').insert({
        user_id: ctx.userClaims?.sub,
        query_text: query,
        retrieved_knowledge_ids: (knowledge.data ?? []).map((x: any) => x.knowledge_id),
        retrieved_question_ids: (questions.data ?? []).map((x: any) => x.id),
        retrieved_tutor_example_ids: (examples.data ?? []).map((x: any) => x.id),
        retrieval_mode: 'supabase-pgvector-gte-small',
      })

      return Response.json({
        query,
        model: 'gte-small',
        retrievalMode: 'supabase-pgvector-gte-small',
        knowledge: knowledge.data ?? [],
        questions: questions.data ?? [],
        tutorExamples: examples.data ?? [],
      }, { headers: corsHeaders })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Math RAG request failed' }, { status: 500, headers: corsHeaders })
    }
  }),
}
