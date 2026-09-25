-- Private AI intelligence embedding worker runtime and schedule.
create table if not exists public.ai_intelligence_runtime (id integer primary key check (id = 1), worker_token text not null, updated_at timestamptz not null default now());
alter table public.ai_intelligence_runtime enable row level security;
revoke all on public.ai_intelligence_runtime from anon, authenticated;
insert into public.ai_intelligence_runtime(id, worker_token) values (1, encode(gen_random_bytes(32), 'hex')) on conflict (id) do nothing;
do $$ declare token text; begin
  select worker_token into token from public.ai_intelligence_runtime where id = 1;
  begin perform cron.unschedule('calcora-ai-intelligence-embedding-worker'); exception when others then null; end;
  perform cron.schedule('calcora-ai-intelligence-embedding-worker','* * * * *',format($cron$select net.http_post(url:='https://igjqepnucigbuxrsvwup.supabase.co/functions/v1/calcora-ai-intelligence-embedding-worker',headers:=jsonb_build_object('Content-Type','application/json','x-calcora-intelligence-token',%L),body:=jsonb_build_object('limit',10))$cron$,token));
end $$;