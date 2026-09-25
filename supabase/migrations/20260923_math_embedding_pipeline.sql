-- Calcora AI: durable embedding queue, content hashing, deterministic verification audit.
-- The live Supabase project is updated through MCP; this file mirrors that schema for source control.

create table if not exists public.math_embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('math_knowledge','math_tutor_examples','math_questions')),
  source_id uuid not null,
  content_hash text not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  embedding_model text not null default 'gte-small',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_table, source_id, content_hash)
);
alter table public.math_embedding_jobs enable row level security;

create table if not exists public.math_verification_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.math_questions(id) on delete cascade,
  dataset_id text,
  external_record_id text,
  status text not null check (status in ('verified','unverified','rejected')),
  verifier text not null default 'calcora-deterministic',
  note text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.math_verification_events enable row level security;

alter table public.math_knowledge add column if not exists content_hash text;
alter table public.math_tutor_examples add column if not exists content_hash text;
alter table public.math_questions add column if not exists content_hash text;

create unique index if not exists math_knowledge_content_hash_key on public.math_knowledge(content_hash) where content_hash is not null;
create unique index if not exists math_tutor_examples_content_hash_key on public.math_tutor_examples(content_hash) where content_hash is not null;
create unique index if not exists math_questions_content_hash_key on public.math_questions(content_hash) where content_hash is not null;
create index if not exists math_embedding_jobs_pending_idx on public.math_embedding_jobs(status, available_at) where status in ('pending','failed');

create or replace function public.math_normalized_hash(input_text text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(regexp_replace(lower(trim(coalesce(input_text,''))), '\\s+', ' ', 'g'),'sha256'),'hex')
$$;

create or replace function public.math_queue_embedding_job()
returns trigger language plpgsql security invoker set search_path = public as $$
declare next_hash text;
begin
  next_hash := public.math_normalized_hash(coalesce(new.searchable_text,''));
  new.content_hash := next_hash;
  return new;
end
$$;

create or replace function public.math_enqueue_embedding_after_write()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.searchable_text is null or trim(new.searchable_text) = '' then return new; end if;
  if tg_table_name = 'math_questions' and new.status <> 'verified' then return new; end if;
  if new.embedding is not null and (tg_op <> 'UPDATE' or new.content_hash is not distinct from old.content_hash) then return new; end if;

  insert into public.math_embedding_jobs(source_table, source_id, content_hash)
  values (tg_table_name, new.id, new.content_hash)
  on conflict (source_table, source_id, content_hash) do update
    set status = case when math_embedding_jobs.status = 'completed' then 'completed' else 'pending' end,
        available_at = case when math_embedding_jobs.status = 'completed' then math_embedding_jobs.available_at else now() end,
        updated_at = now();
  return new;
end
$$;

drop trigger if exists math_knowledge_embedding_before on public.math_knowledge;
create trigger math_knowledge_embedding_before before insert or update of searchable_text on public.math_knowledge for each row execute function public.math_queue_embedding_job();
drop trigger if exists math_tutor_embedding_before on public.math_tutor_examples;
create trigger math_tutor_embedding_before before insert or update of searchable_text on public.math_tutor_examples for each row execute function public.math_queue_embedding_job();
drop trigger if exists math_questions_embedding_before on public.math_questions;
create trigger math_questions_embedding_before before insert or update of searchable_text,status on public.math_questions for each row execute function public.math_queue_embedding_job();

drop trigger if exists math_knowledge_embedding_after on public.math_knowledge;
create trigger math_knowledge_embedding_after after insert or update of searchable_text on public.math_knowledge for each row execute function public.math_enqueue_embedding_after_write();
drop trigger if exists math_tutor_embedding_after on public.math_tutor_examples;
create trigger math_tutor_embedding_after after insert or update of searchable_text on public.math_tutor_examples for each row execute function public.math_enqueue_embedding_after_write();
drop trigger if exists math_questions_embedding_after on public.math_questions;
create trigger math_questions_embedding_after after insert or update of searchable_text,status on public.math_questions for each row execute function public.math_enqueue_embedding_after_write();

update public.math_knowledge set content_hash = public.math_normalized_hash(searchable_text) where content_hash is null;
update public.math_tutor_examples set content_hash = public.math_normalized_hash(searchable_text) where content_hash is null;
update public.math_questions set content_hash = public.math_normalized_hash(searchable_text) where content_hash is null;

insert into public.math_embedding_jobs(source_table,source_id,content_hash)
select 'math_knowledge',id,content_hash from public.math_knowledge where embedding is null
on conflict do nothing;
insert into public.math_embedding_jobs(source_table,source_id,content_hash)
select 'math_tutor_examples',id,content_hash from public.math_tutor_examples where embedding is null
on conflict do nothing;
insert into public.math_embedding_jobs(source_table,source_id,content_hash)
select 'math_questions',id,content_hash from public.math_questions where embedding is null and status='verified'
on conflict do nothing;

insert into public.math_verification_events(question_id,dataset_id,external_record_id,status,note,provenance)
select id,dataset_id,external_record_id,status,verification_note,source
from public.math_questions q
where not exists (select 1 from public.math_verification_events e where e.question_id=q.id);

create or replace function public.claim_math_embedding_jobs(batch_size integer default 10)
returns setof public.math_embedding_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id from public.math_embedding_jobs
    where status in ('pending','failed') and available_at <= now() and attempts < max_attempts
    order by created_at
    for update skip locked
    limit greatest(1, least(batch_size, 50))
  ), claimed as (
    update public.math_embedding_jobs j
    set status='processing', attempts=j.attempts+1, locked_at=now(), updated_at=now()
    from candidates c where j.id=c.id returning j.*
  )
  select * from claimed;
end
$$;
revoke all on function public.claim_math_embedding_jobs(integer) from public, anon, authenticated;

create or replace function public.match_math_questions(query_embedding vector, match_threshold double precision default 0.65, match_count integer default 5)
returns table(id uuid, question text, final_answer text, topic text, status text, verification_note text, similarity double precision)
language sql stable set search_path = public, extensions as $$
  select q.id,q.question,q.final_answer,q.topic,q.status,q.verification_note,1-(q.embedding <=> query_embedding)
  from public.math_questions q
  where q.status='verified' and q.embedding is not null
    and 1-(q.embedding <=> query_embedding) >= match_threshold
  order by q.embedding <=> query_embedding asc
  limit least(greatest(match_count,1),20)
$$;
