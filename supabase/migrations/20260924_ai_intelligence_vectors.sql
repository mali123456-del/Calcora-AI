create table if not exists public.ai_intelligence_embeddings (
  id uuid primary key references public.ai_intelligence_items(id) on delete cascade,
  embedding extensions.vector(384) not null,
  embedding_model text not null default 'gte-small',
  updated_at timestamptz not null default now()
);
alter table public.ai_intelligence_embeddings enable row level security;
revoke all on table public.ai_intelligence_embeddings from anon, authenticated;
create index if not exists ai_intelligence_embeddings_hnsw_idx
  on public.ai_intelligence_embeddings using hnsw (embedding vector_cosine_ops);

create or replace function public.search_ai_intelligence(
  query_embedding extensions.vector(384),
  match_threshold float default 0.72,
  match_count int default 8
)
returns table (
  id uuid, title text, source_name text, kind text, url text, summary text, tags text[],
  relevance_score numeric, similarity float
)
language sql stable
as $$
  select i.id, i.title, i.source_name, i.kind, i.url, i.summary, i.tags, i.relevance_score,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.ai_intelligence_embeddings e
  join public.ai_intelligence_items i on i.id = e.id
  where i.status = 'active'
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;
revoke all on function public.search_ai_intelligence(extensions.vector(384),float,int) from public, anon, authenticated;