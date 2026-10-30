-- Business rules enforced in Postgres: pricing, free footage, caps, splits, publishing, money.
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- Start from an empty database (seed data is restored by the rollback).
truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

-- Maya (filmmaker), Jordan (viewer), Kid (too young).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test');

select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values
     ('00000000-0000-0000-0000-0000000000ff', 'kid@umoobi.test', jsonb_build_object('birth_year', extract(year from now())::int - 10)) $$,
  'P0001', 'Umoobi accounts are for people 13 and over', 'under-13s cannot sign up (COPPA)');

insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide Pictures', 'low-tide', 'approved');

insert into public.films (id, account_id, slug, title, runtime_seconds) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'salt-and-static', 'Salt & Static', 5640),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'tidepool', 'Tidepool', 240);

-- ─── Pricing (D17, D22) ─────────────────────────────────────────────────────
select throws_ok($$ insert into public.offers (film_id, kind, price_cents, rental_hours)
  values ('20000000-0000-0000-0000-000000000001', 'rent', 50, 48) $$, '23514', 'The lowest paid price is $0.99', 'price under $0.99 is refused');
select throws_ok($$ insert into public.offers (film_id, kind, price_cents)
  values ('20000000-0000-0000-0000-000000000001', 'buy', 0) $$, '23514', 'Free is only allowed for films under 5 minutes', 'a feature cannot be free');
select lives_ok($$ insert into public.offers (film_id, kind, price_cents)
  values ('20000000-0000-0000-0000-000000000002', 'buy', 0) $$, 'a short under 5 minutes can be free');
select throws_ok($$ update public.films set runtime_seconds = 400 where id = '20000000-0000-0000-0000-000000000002' $$,
  '23514', 'Free is only allowed for films under 5 minutes', 'a free film cannot grow past 5 minutes');
select lives_ok($$ insert into public.offers (id, film_id, kind, price_cents, rental_hours) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rent', 499, 48),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'buy', 1299, null) $$,
  'rent $4.99 / 48 h and buy $12.99 are accepted');
select throws_ok($$ insert into public.offers (film_id, kind, price_cents) values ('20000000-0000-0000-0000-000000000001', 'rent', 499) $$,
  '23514', null, 'a rental needs a rental window');

-- ─── Free footage (D23) ─────────────────────────────────────────────────────
insert into public.film_assets (film_id, kind, duration_seconds) values
  ('20000000-0000-0000-0000-000000000001', 'trailer', 150),
  ('20000000-0000-0000-0000-000000000001', 'trailer', 120),
  ('20000000-0000-0000-0000-000000000001', 'trailer', 90);
select throws_ok($$ insert into public.film_assets (film_id, kind) values ('20000000-0000-0000-0000-000000000001', 'trailer') $$,
  '23514', 'A film can have at most 3 trailers', 'a fourth trailer is refused');
select throws_ok($$ insert into public.film_assets (film_id, kind, duration_seconds) values ('20000000-0000-0000-0000-000000000001', 'clip', 130) $$,
  '23514', 'Clips can be at most 2 minutes', 'a clip over 2 minutes is refused');
insert into public.film_assets (film_id, kind, duration_seconds) values
  ('20000000-0000-0000-0000-000000000001', 'clip', 120), ('20000000-0000-0000-0000-000000000001', 'clip', 120),
  ('20000000-0000-0000-0000-000000000001', 'clip', 120);
-- 360 + 360 = 720 s used of 846 s (15% of 5640)
select throws_ok($$ insert into public.film_assets (film_id, kind, duration_seconds) values ('20000000-0000-0000-0000-000000000001', 'clip', 120),
  ('20000000-0000-0000-0000-000000000001', 'clip', 120) $$,
  '23514', 'Free trailers and clips can total at most 15% of the runtime', 'free footage over 15% of runtime is refused');
select lives_ok($$ insert into public.film_assets (film_id, kind, duration_seconds) values ('20000000-0000-0000-0000-000000000001', 'clip', 100) $$,
  'free footage within 15% is accepted');

-- ─── Yearly caps (D13) ──────────────────────────────────────────────────────
insert into public.films (account_id, slug, title, runtime_seconds) values
  ('10000000-0000-0000-0000-000000000001', 'feature-two', 'Feature Two', 3000),
  ('10000000-0000-0000-0000-000000000001', 'feature-three', 'Feature Three', 3000);
select throws_ok($$ insert into public.films (account_id, slug, title, runtime_seconds) values
  ('10000000-0000-0000-0000-000000000001', 'feature-four', 'Feature Four', 3000) $$,
  '23514', null, 'a new account cannot add a 4th feature in a year');
select is(public.films_used('10000000-0000-0000-0000-000000000001', extract(year from now())::int, 'feature'), 3,
  'films_used counts features this year');
select lives_ok($$ insert into public.films (account_id, slug, title, runtime_seconds, cap_year) values
  ('10000000-0000-0000-0000-000000000001', 'feature-next-year', 'Next Year', 3000, extract(year from now())::int + 1) $$,
  'the cap resets each calendar year');
update public.filmmaker_accounts set tier = 'established' where id = '10000000-0000-0000-0000-000000000001';
select lives_ok($$ insert into public.films (account_id, slug, title, runtime_seconds) values
  ('10000000-0000-0000-0000-000000000001', 'feature-five', 'Feature Five', 3000) $$, 'established accounts get 12 features');
update public.filmmaker_accounts set tier = 'new' where id = '10000000-0000-0000-0000-000000000001';

-- ─── Revenue shares (D15) ───────────────────────────────────────────────────
insert into public.people (id, slug, name) values
  ('40000000-0000-0000-0000-000000000001', 'maya-okafor', 'Maya Okafor'),
  ('40000000-0000-0000-0000-000000000002', 'leilani-kahale', 'Leilani Kahale');
select throws_ok($$
  insert into public.credits (film_id, person_id, role, share_bps) values
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Director', 6000),
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Lead', 3000);
  set constraints credits_shares immediate $$,
  '23514', 'Revenue shares for a film must total exactly 100%', 'shares that total 90% are refused');
set constraints credits_shares deferred;
select lives_ok($$
  insert into public.credits (film_id, person_id, role, share_bps) values
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Director', 7000),
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Lead', 3000);
  set constraints credits_shares immediate $$, 'shares that total 100% are accepted');
set constraints credits_shares deferred;

-- ─── Publishing (D11, D42, D46) ─────────────────────────────────────────────
select ok(cardinality(public.publish_blockers('20000000-0000-0000-0000-000000000001')) >= 3, 'a fresh film has publish blockers');
update public.films set ai_declared_at = now(), rights_statement_at = now(), vetting_score = 97
  where id = '20000000-0000-0000-0000-000000000001';
insert into public.film_assets (film_id, kind, status, mux_playback_id) values
  ('20000000-0000-0000-0000-000000000001', 'master', 'ready', 'dev-playback');
select is(public.publish_blockers('20000000-0000-0000-0000-000000000001'), '{}'::text[], 'a checked, priced, declared film has no blockers');
update public.films set ai_flagged = true where id = '20000000-0000-0000-0000-000000000001';
select ok(cardinality(public.publish_blockers('20000000-0000-0000-0000-000000000001')) = 1, 'an AI flag on an undeclared film blocks publishing');
update public.films set ai_generated = true where id = '20000000-0000-0000-0000-000000000001';
select is(public.publish_blockers('20000000-0000-0000-0000-000000000001'), '{}'::text[], 'labeling the film AI-generated clears the block');
update public.films set ai_flagged = false, ai_generated = false where id = '20000000-0000-0000-0000-000000000001';
update public.films set vetting_score = 65 where id = '20000000-0000-0000-0000-000000000001';
select ok(cardinality(public.publish_blockers('20000000-0000-0000-0000-000000000001')) = 1, 'a score of 65 needs staff approval');
update public.films set vetting_score = 97, status = 'published', published_at = now()
  where id = '20000000-0000-0000-0000-000000000001';
select ok(public.film_is_purchasable('20000000-0000-0000-0000-000000000001'), 'a published, cleared film is purchasable');

-- ─── Fees (D2, D34, D35) ────────────────────────────────────────────────────
select is(public.fee_cents('10000000-0000-0000-0000-000000000001', 499), 50, '10% of $4.99 is 50¢');
select is(public.fee_cents('10000000-0000-0000-0000-000000000001', 99), 25, '$0.25 minimum fee on a $0.99 sale');
select is(public.fee_cents('10000000-0000-0000-0000-000000000001', 0), 0, 'no fee on a free film');
update public.filmmaker_accounts set founding_rate_until = current_date + 365 where id = '10000000-0000-0000-0000-000000000001';
select is(public.fee_cents('10000000-0000-0000-0000-000000000001', 1299), 65, 'founding rate is 5%');
update public.filmmaker_accounts set founding_rate_until = null where id = '10000000-0000-0000-0000-000000000001';

-- ─── Sales, ledger, refunds ─────────────────────────────────────────────────
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, license_ack_at) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rent', 499, null),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'buy', 1299, now());
select throws_ok($$ insert into public.orders (viewer_id, offer_id, film_id, account_id, kind, subtotal_cents) values
  ('00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', 'buy', 1299) $$, '23514', null, 'a purchase needs a license acknowledgment (AB 2426)');

select public.record_sale('50000000-0000-0000-0000-000000000001', 44, 46, 'pi_rent', 'ch_rent');
select public.record_sale('50000000-0000-0000-0000-000000000002', 117, 71, 'pi_buy', 'ch_buy');
select public.record_sale('50000000-0000-0000-0000-000000000002', 117, 71, 'pi_buy', 'ch_buy');
select is((select count(*)::int from public.ledger_entries where order_id = '50000000-0000-0000-0000-000000000002'), 6,
  'record_sale is idempotent (4 split lines + reserve hold and release)');
select is((select count(*)::int from public.order_ledger_mismatches()), 0, 'every order''s ledger lines sum to its total');
select is((select total_cents from public.orders where id = '50000000-0000-0000-0000-000000000002'), 1416, 'total = price + tax');
-- rent net 499-50-46 = 403; buy net 1299-130-71 = 1098, reserve 110 held for 30 days
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001'), 403 + 1098 - 110, 'balance holds back the 10% reserve');
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), 403 + 1098, 'reserve releases after 30 days');
select throws_ok($$ update public.ledger_entries set amount_cents = 0 $$, 'P0001', 'ledger_entries is append-only', 'ledger is append-only');

select public.record_refund('50000000-0000-0000-0000-000000000002', 'test');
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), 403, 'a refund takes back the filmmaker''s net share');
select ok((select revoked_at is not null from public.entitlements where order_id = '50000000-0000-0000-0000-000000000002'), 'a refund revokes the entitlement');

-- ─── Rental clock ───────────────────────────────────────────────────────────
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
select ok((select (e.expires_at - e.first_played_at) = interval '48 hours'
  from public.start_playback('20000000-0000-0000-0000-000000000001') e), 'first play starts the 48-hour rental window');

select * from finish();
rollback;
