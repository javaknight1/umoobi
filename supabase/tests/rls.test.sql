-- Row-level security: what the filmmaker, a buyer, a stranger, staff and anonymous visitors can reach.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Start from an empty database (seed data is restored by the rollback).
truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000c', 'sam@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000d', 'staff@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000e', 'leilani@umoobi.test');
update public.profiles set roles = array['viewer', 'staff'] where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set roles = array['viewer', 'filmmaker'] where id = '00000000-0000-0000-0000-00000000000a';

insert into public.waitlist_signups (email, role) values ('fan@umoobi.test', 'viewer');

insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide Pictures', 'low-tide', 'approved');
insert into public.films (id, account_id, slug, title, runtime_seconds, status, vetting_score, published_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'salt-and-static', 'Salt & Static', 5640, 'published', 97, now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'draft-film', 'Draft Film', 3000, 'draft', null, null);
insert into public.film_assets (film_id, kind, status) values
  ('20000000-0000-0000-0000-000000000001', 'master', 'ready'),
  ('20000000-0000-0000-0000-000000000001', 'trailer', 'ready');
insert into public.offers (id, film_id, kind, price_cents) values
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'buy', 1299);
insert into public.people (id, slug, name, claimed_by) values
  ('40000000-0000-0000-0000-000000000002', 'leilani-kahale', 'Leilani Kahale', '00000000-0000-0000-0000-00000000000e');
insert into public.credits (film_id, person_id, role) values
  ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Lead');
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, license_ack_at) values
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'buy', 1299, now());
select public.record_sale('50000000-0000-0000-0000-000000000002', 117, 71, 'pi', 'ch');
insert into public.playback_events (session_id, film_id, position_seconds, event) values
  (gen_random_uuid(), '20000000-0000-0000-0000-000000000001', 0, 'start');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ─── Anonymous ──────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from public.films), 1, 'visitors see only published films');
select is((select count(*)::int from public.film_assets), 1, 'visitors see trailers, not masters');
select is((select count(*)::int from public.waitlist_signups), 0, 'visitors cannot read the waitlist');
select is((select count(*)::int from public.credits), 1, 'credits on published films are public');
select throws_ok($$ select invite_token from public.people $$, '42501', null, 'invite tokens are never exposed');
reset role;

-- ─── Filmmaker ──────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.films), 2, 'the filmmaker sees own drafts');
select is((select count(*)::int from public.orders), 0, 'the filmmaker cannot see who bought (VPPA)');
select is((select count(*)::int from public.ledger_entries), 6, 'the filmmaker sees own ledger lines');
select throws_ok($$ update public.films set vetting_score = 100 where id = '20000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'the filmmaker cannot set a vetting score');
select throws_ok($$ update public.films set status = 'published' where id = '20000000-0000-0000-0000-000000000002' $$,
  '42501', null, 'the filmmaker cannot publish by editing status');
select throws_ok($$ update public.filmmaker_accounts set fee_bps = 0 $$, '42501', null, 'the filmmaker cannot change the fee');
select lives_ok($$ update public.filmmaker_accounts set display_name = 'Low Tide' where id = '10000000-0000-0000-0000-000000000001' $$,
  'the filmmaker edits the account name');
select throws_ok($$ insert into public.reviews (film_id, author_id, rating) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 5) $$,
  '42501', null, 'the filmmaker cannot review own film');
select throws_ok($$ select public.publish_film('20000000-0000-0000-0000-000000000002') $$,
  '23514', null, 'publishing a draft with blockers is refused');
select is((select count(*)::int from public.playback_events), 0, 'raw playback events are not readable');
reset role;

-- ─── Buyer ──────────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.orders), 1, 'the buyer sees own order');
select is((select count(*)::int from public.entitlements), 1, 'the buyer sees own entitlement');
select is((select count(*)::int from public.ledger_entries), 0, 'the buyer cannot see the ledger');
select throws_ok($$ update public.profiles set roles = array['staff'] where id = auth.uid() $$, '42501', null, 'nobody can grant themselves a role');
select lives_ok($$ insert into public.reviews (film_id, author_id, rating, body) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 5, 'Loved it') $$,
  'a buyer can review');
select throws_ok($$ insert into public.offers (film_id, kind, price_cents) values ('20000000-0000-0000-0000-000000000001', 'buy', 99) $$,
  '42501', null, 'a viewer cannot add offers to someone else''s film');
select throws_ok($$ insert into public.filmmaker_accounts (owner_id, display_name, slug, status) values (auth.uid(), 'Me', 'me', 'approved') $$,
  '42501', null, 'a viewer cannot create a pre-approved account');
select lives_ok($$ insert into public.filmmaker_accounts (owner_id, display_name, slug) values (auth.uid(), 'Jordan Films', 'jordan-films') $$,
  'a viewer can start a filmmaker application');
select lives_ok($$ insert into public.consents (viewer_id, account_id) values (auth.uid(), '10000000-0000-0000-0000-000000000001') $$,
  'a buyer can consent to share identity with a filmmaker');
reset role;

-- ─── Stranger and credited person ───────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.entitlements), 0, 'a stranger cannot see others'' entitlements');
select throws_ok($$ insert into public.reviews (film_id, author_id, rating) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 1) $$,
  '42501', null, 'non-buyers cannot review');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select lives_ok($$ update public.people set bio = 'Actor' where id = '40000000-0000-0000-0000-000000000002' $$, 'a claimant edits own page');
reset role;

-- ─── Staff ──────────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.waitlist_signups), 1, 'staff read the waitlist');
select is((select count(*)::int from public.films), 2, 'staff see drafts');
select is((select count(*)::int from public.staff_audit_log), 0, 'only admins read the audit log');
reset role;

select * from finish();
rollback;
