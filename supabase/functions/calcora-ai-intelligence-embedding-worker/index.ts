import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-calcora-intelligence-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceRoleKey)
const model = new Supabase.ai.Session('gte-small')

async function authorized(req: Request) {
  const supplied = req.headers.get('x-calcora-intelligence-token')
  if (!supplied) return false
  const { data, error } = await admin.from('ai_intelligence_runtime').select('worker_token').eq('id', 1).maybeSingle()
  return !error && !!data?.worker_token && supplied === data.worker_token
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405, headers: corsHeaders })
  if (!(await authorized(req))) return Response.json({ error: 'Worker authentication required' }, { status: 401, headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 20)
    const { data: items, error } = await admin.from('ai_intelligence_items').select('id,title,summary,content,created_at').order('created_at', { ascending: true }).limit(20)
    if (error) throw error
    const { data: embedded, error: embeddedError } = await admin.from('ai_intelligence_embeddings').select('id')
    if (embeddedError) throw embeddedError
    const embeddedIds = new Set((embedded ?? []).map((row) => row.id))
    const pending = (items ?? []).filter((item) => !embeddedIds.has(item.id)).slice(0, limit)
    const results = []
    for (const item of pending) {
      try {
        const text = [item.title, item.summary, item.content].join('\n').slice(0, 30000)
        const embedding = await model.run(text, { mean_pool: true, normalize: true })
        const { error: writeError } = await admin.from('ai_intelligence_embeddings').upsert({ id: item.id, embedding: Array.from(embedding), embedding_model: 'gte-small', updated_at: new Date().toISOString() })
        if (writeError) throw writeError
        results.push({ id: item.id, status: 'completed' })
      } catch (error) {
        results.push({ id: item.id, status: 'failed', error: error instanceof Error ? error.message : 'Embedding failed' })
      }
    }
    return Response.json({ success: true, embeddingModel: 'gte-small', claimed: pending.length, completed: results.filter((r) => r.status === 'completed').length, failed: results.filter((r) => r.status === 'failed').length, results }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'AI intelligence embedding worker failed' }, { status: 500, headers: corsHeaders })
  }
})