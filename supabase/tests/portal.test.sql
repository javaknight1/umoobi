-- Filmmaker money: statements, payouts, refunds after payout (S6), roll-ups (S7), and the
-- local half of Gate 1: 20 sales reconcile to the cent (T021).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test');
insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status, stripe_account_id, payouts_enabled) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide', 'low-tide', 'approved', 'acct_x', true);
insert into public.films (id, account_id, slug, title, runtime_seconds, status, vetting_score) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'salt', 'Salt & Static', 6000, 'published', 97);
insert into public.offers (id, film_id, kind, price_cents, rental_hours) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'rent', 499, 48),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'buy', 1299, null);

-- ─── Gate 1 (local): 20 mixed sales with varied tax and fees ────────────────
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, license_ack_at, created_at)
select ('50000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-00000000000b',
  case when i % 4 = 0 then '30000000-0000-0000-0000-000000000002'::uuid else '30000000-0000-0000-0000-000000000001'::uuid end,
  '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  case when i % 4 = 0 then 'buy' else 'rent' end,
  case when i % 4 = 0 then 1299 else 499 end,
  case when i % 4 = 0 then now() end,
  now() - interval '40 days'
from generate_series(1, 20) i;
select public.record_sale(id, (subtotal_cents * (0.04 + (random() * 0.06)))::int, round(subtotal_cents * 0.029)::int + 30, 'pi_' || id, 'ch_' || id)
from public.orders where account_id = '10000000-0000-0000-0000-000000000001';
update public.orders set paid_at = now() - interval '40 days';

select is((select count(*)::int from public.order_ledger_mismatches()), 0, 'Gate 1: all 20 sales reconcile to the cent');
select is((select sum(total_cents)::int from public.orders),
  (select sum(amount_cents)::int from public.ledger_entries where kind in ('net', 'fee', 'processing', 'tax')),
  'Gate 1: buyers paid exactly what the ledger splits');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is((select count(*)::int from public.account_sales('10000000-0000-0000-0000-000000000001', now() - interval '60 days', now())), 20,
  'the statement has one line per sale');
select is((select sum(price_cents - fee_cents - processing_cents - net_cents)::int
  from public.account_sales('10000000-0000-0000-0000-000000000001', now() - interval '60 days', now())), 0,
  'each statement line is price − fee − card = net');

-- ─── Monthly payouts (D40) ──────────────────────────────────────────────────
-- 15 rentals: net 499-50-44 = 405; 5 buys: net 1299-130-68 = 1101 (reserve released after 30 days)
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date), 15 * 405 + 5 * 1101 - 5 * 110,
  'reserve still held on today''s balance (sales are 40 days old but reserve dates count from sale day)');
select is((select count(*)::int from public.create_monthly_payouts(current_date - 30, current_date + 30)), 1, 'one payout per account');
select is((select amount_cents from public.payouts), 15 * 405 + 5 * 1101, 'the payout is the full available balance');
select is((select count(*)::int from public.create_monthly_payouts(current_date - 30, current_date + 30)), 0, 'payouts are not duplicated');
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), 15 * 405 + 5 * 1101,
  'a pending payout doesn''t touch the balance');
select public.mark_payout_paid((select id from public.payouts), 'tr_1');
select public.mark_payout_paid((select id from public.payouts), 'tr_1');
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), 0, 'a paid payout zeroes the balance, once');

-- ─── Refund after payout (S6) ───────────────────────────────────────────────
select public.record_refund('50000000-0000-0000-0000-000000000004', 'Film pulled');
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), -1101,
  'a refund after payout leaves the account owing its net share');
select public.record_transfer_reversal('10000000-0000-0000-0000-000000000001', 1101, (select id from public.payouts));
select is(public.available_balance_cents('10000000-0000-0000-0000-000000000001', current_date + 30), 0,
  'reversing part of the last transfer squares the account');
select is((select count(*)::int from public.order_ledger_mismatches()), 0, 'refunds keep every order reconciled');

update public.filmmaker_accounts set payout_hold = true;
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents) values
  ('50000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'rent', 499);
select public.record_sale('50000000-0000-0000-0000-000000000099', 0, 44, 'pi_99', 'ch_99');
select is((select status from public.create_monthly_payouts(current_date + 31, current_date + 60)), 'held', 'a payout hold keeps the money on the platform');

-- ─── Analytics roll-up (S7) ─────────────────────────────────────────────────
insert into public.page_events (session_id, film_id, event, source, region) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'view', 'instagram', 'CA'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'view', 'instagram', 'HI'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'view', null, 'CA'),
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'checkout_start', null, null);
insert into public.playback_events (session_id, film_id, position_seconds, event) values
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 0, 'start'),
  ('70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 5700, 'heartbeat'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 0, 'start'),
  ('70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 1300, 'heartbeat');
select public.rollup_film_day(current_date);
select is((select views from public.film_daily_stats where day = current_date), 3, 'roll-up counts views');
select is((select sources from public.film_daily_stats where day = current_date), '{"direct": 1, "instagram": 2}'::jsonb, 'roll-up counts sources');
select is((select (plays, completions) from public.film_daily_stats where day = current_date), (2, 1), 'two plays, one finished (90%+)');

select * from finish();
rollback;
