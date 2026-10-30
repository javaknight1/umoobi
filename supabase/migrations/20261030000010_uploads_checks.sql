-- Uploads and automatic checks (T006, T009). Re-runnable.

alter table public.film_assets add column if not exists error_message text;

-- Public buckets for posters and subtitle files. Writes go through the server (service role)
-- after an ownership check, so there are no insert policies.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true), ('subtitles', 'subtitles', true)
on conflict (id) do nothing;

-- Claim only some job kinds (lets one worker or a test drain a single kind).
create or replace function public.claim_jobs_of(p_kinds text[], p_limit int default 10) returns setof public.jobs
language sql security definer set search_path = '' as $$
  update public.jobs j set status = 'running', attempts = j.attempts + 1
  where j.id in (
    select id from public.jobs
    where status = 'queued' and run_after <= now() and kind = any (p_kinds)
    order by run_after, id
    limit p_limit
    for update skip locked
  )
  returning j.*;
$$;
revoke execute on function public.claim_jobs_of(text[], int) from public, anon, authenticated;

-- Accounts that qualify for the established tier (D13): approved 90+ days, 10+ paid sales,
-- no strikes.
create or replace function public.upgrade_tiers() returns int
language sql security definer set search_path = '' as $$
  with up as (
    update public.filmmaker_accounts a set tier = 'established'
    where a.tier = 'new' and a.status = 'approved' and a.approved_at <= now() - interval '90 days'
      and (select count(*) from public.orders o where o.account_id = a.id and o.status = 'paid') >= 10
      and not exists (select 1 from public.strikes s where s.account_id = a.id)
    returning 1
  ) select count(*)::int from up;
$$;
revoke execute on function public.upgrade_tiers() from public, anon, authenticated;
