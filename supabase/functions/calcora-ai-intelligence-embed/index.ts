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

  const body = await req.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const content = typeof body.content === "string" ? body.content.slice(0, 30000) : "";
  if (!itemId || !content) return Response.json({ error: "itemId and content are required" }, { status: 400, headers: corsHeaders });

  const model = new Supabase.ai.Session("gte-small");
  const embedding = await model.run(content, { mean_pool: true, normalize: true });
  const vector = Array.from(embedding);
  const { error: writeError } = await ctx.supabaseAdmin.from("ai_intelligence_embeddings").upsert({
    id: itemId,
    embedding: vector,
    embedding_model: "gte-small",
    updated_at: new Date().toISOString(),
  });
  if (writeError) return Response.json({ error: writeError.message }, { status: 500, headers: corsHeaders });
  return Response.json({ success: true, itemId, dimensions: vector.length }, { headers: corsHeaders });
});
