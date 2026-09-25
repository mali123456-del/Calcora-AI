import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseContext } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405, headers: corsHeaders });

  const { data: ctx, error } = await createSupabaseContext(req, { auth: "secret" });
  if (error) return Response.json({ error: "Service authorization required" }, { status: 401, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 2000) : "";
    const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 20);
    const threshold = Math.min(Math.max(Number(body.threshold) || 0.72, 0), 1);

    if (!query) {
      return Response.json({ matches: [], model: "gte-small", retrievalMode: "supabase-pgvector-gte-small" }, { headers: corsHeaders });
    }

    const model = new Supabase.ai.Session("gte-small");
    const embedding = await model.run(query, { mean_pool: true, normalize: true });
    const { data, error: searchError } = await ctx.supabaseAdmin.rpc("search_ai_intelligence", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (searchError) {
      return Response.json({ error: searchError.message }, { status: 500, headers: corsHeaders });
    }

    return Response.json({
      matches: data ?? [],
      model: "gte-small",
      retrievalMode: "supabase-pgvector-gte-small",
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "AI intelligence search failed",
    }, { status: 500, headers: corsHeaders });
  }
});
