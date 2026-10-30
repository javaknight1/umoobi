-- Job queue helpers (D48). The worker route claims a batch, runs handlers, then marks each
-- job done or schedules a retry with backoff.

create function public.claim_jobs(p_limit int default 10) returns setof public.jobs
language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now()
    order by run_after, id
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;

create function public.finish_job(p_id bigint, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
begin
  select * into j from public.jobs where id = p_id for update;
  if p_error is null then
    update public.jobs set status = 'done', last_error = null where id = p_id;
  elsif j.attempts >= 5 then
    update public.jobs set status = 'failed', last_error = p_error where id = p_id;
  else
    -- 1, 4, 9, 16 minutes
    update public.jobs set status = 'queued', last_error = p_error,
      run_after = now() + make_interval(mins => j.attempts * j.attempts)
    where id = p_id;
  end if;
end $$;

-- Jobs stuck in 'running' (worker crashed) go back to the queue after 15 minutes.
create function public.requeue_stale_jobs() returns int
language sql security definer set search_path = '' as $$
  with r as (
    update public.jobs set status = 'queued'
    where status = 'running' and run_after < now() - interval '15 minutes'
    returning 1
  ) select count(*)::int from r;
$$;

revoke execute on function public.claim_jobs(int), public.finish_job(bigint, text), public.requeue_stale_jobs()
  from public, anon, authenticated;
