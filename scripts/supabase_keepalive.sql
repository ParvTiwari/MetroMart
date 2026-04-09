-- Supabase keepalive maintenance job
-- Inserts one heartbeat row every 5 days and removes expired rows.

-- Ensures pg_cron is enabled
create extension if not exists pg_cron;

create table if not exists public.db_keepalive (
  id bigserial primary key,
  note text not null default 'supabase_keepalive_ping',
  created_at timestamptz not null default now()
);

-- Function run by cron: insert one row and prune rows older than 5 days
create or replace function public.run_keepalive_cycle()
returns void
language plpgsql
security definer
as $$
begin
  insert into public.db_keepalive (note)
  values ('scheduled heartbeat');

  delete from public.db_keepalive
  where created_at < now() - interval '5 days';
end;
$$;

-- remove old schedule with same name before recreating it
select cron.unschedule(jobid)
from cron.job
where jobname = 'db-keepalive-every-5-days';

-- Schedule every 5 days at 00:00 UTC
-- Cron format in pg_cron: minute hour day-of-month month day-of-week
select cron.schedule(
  'db-keepalive-every-5-days',
  '0 0 */5 * *',
  $$select public.run_keepalive_cycle();$$
);