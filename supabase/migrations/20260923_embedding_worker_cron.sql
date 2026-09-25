-- Calcora AI embedding worker schedule and private runtime token
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table if not exists public.math_embedding_runtime(id integer primary key check(id=1),worker_token text not null,updated_at timestamptz not null default now());
alter table public.math_embedding_runtime enable row level security;
revoke all on public.math_embedding_runtime from anon,authenticated;
insert into public.math_embedding_runtime(id,worker_token) values(1,encode(gen_random_bytes(32),'hex')) on conflict(id) do nothing;
do $$ declare token text; begin select worker_token into token from public.math_embedding_runtime where id=1; begin perform cron.unschedule('calcora-math-embedding-worker'); exception when others then null; end; perform cron.schedule('calcora-math-embedding-worker','*/30 * * * * *',format($cron$select net.http_post(url:='https://igjqepnucigbuxrsvwup.supabase.co/functions/v1/math-embedding-worker',headers:=jsonb_build_object('Content-Type','application/json','x-calcora-worker-token',%L),body:=jsonb_build_object('limit',5))$cron$,token)); end $$;