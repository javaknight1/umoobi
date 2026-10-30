-- Uploads and checks: per-kind job claiming, tier upgrades, asset error messages.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Start from an empty database (seed data is restored by the rollback).
truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000c', 'new@umoobi.test');

-- ─── claim_jobs_of ──────────────────────────────────────────────────────────
insert into public.jobs (kind, payload) values ('check_film', '{}'), ('send_receipt', '{}'), ('check_film', '{}');
select is((select count(*)::int from public.claim_jobs_of(array['check_film'], 10)), 2, 'claims only the requested kind');
select is((select status from public.jobs where kind = 'send_receipt'), 'queued', 'other kinds stay queued');
select is((select count(*)::int from public.claim_jobs_of(array['check_film'], 10)), 0, 'claimed jobs are not claimed twice');

-- ─── upgrade_tiers (D13) ────────────────────────────────────────────────────
insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status, approved_at) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide', 'low-tide', 'approved', now() - interval '120 days'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'New', 'new-films', 'approved', now() - interval '10 days');
insert into public.films (id, account_id, slug, title, runtime_seconds, status, vetting_score) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'salt', 'Salt', 5640, 'published', 95),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'fresh', 'Fresh', 5640, 'published', 95);
insert into public.offers (id, film_id, kind, price_cents, rental_hours) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rent', 499, 48),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'rent', 499, 48);
insert into public.orders (viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, status, total_cents, paid_at)
select '00000000-0000-0000-0000-00000000000b', o.offer, o.film, o.acct, 'rent', 499, 'paid', 499, now()
from (values ('30000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid),
             ('30000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid)) o(offer, film, acct),
     generate_series(1, 10);

select is(public.upgrade_tiers(), 1, 'one account qualifies');
select is((select tier from public.filmmaker_accounts where id = '10000000-0000-0000-0000-000000000001'), 'established', '90+ days and 10 sales → established');
select is((select tier from public.filmmaker_accounts where id = '10000000-0000-0000-0000-000000000002'), 'new', 'under 90 days stays new');

update public.filmmaker_accounts set tier = 'new' where id = '10000000-0000-0000-0000-000000000001';
insert into public.strikes (account_id, reason) values ('10000000-0000-0000-0000-000000000001', 'undeclared_ai');
select is(public.upgrade_tiers(), 0, 'a strike blocks the upgrade');

-- ─── film_assets.error_message ──────────────────────────────────────────────
select has_column('public', 'film_assets', 'error_message', 'assets keep an error message for the filmmaker');

select * from finish();
rollback;
