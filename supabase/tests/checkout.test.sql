-- Pricing tab offers replacement and free-film orders (D17, D22, D52).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test');
insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide', 'low-tide', 'approved');
insert into public.films (id, account_id, slug, title, runtime_seconds, status, vetting_score) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'salt', 'Salt', 5640, 'published', 97),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'tide', 'Tide', 240, 'published', 97);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.set_film_offers('20000000-0000-0000-0000-000000000001', 499, 48, 1299)), 2,
  'the filmmaker sets rent and buy');
select is((select count(*)::int from public.set_film_offers('20000000-0000-0000-0000-000000000001', null, null, 999)), 1,
  'replacing offers leaves only the new ones active');
select is((select count(*)::int from public.offers where film_id = '20000000-0000-0000-0000-000000000001'), 3,
  'old offers are kept (inactive) for past orders');
select throws_ok($$ select public.set_film_offers('20000000-0000-0000-0000-000000000001', 50, 48, null) $$,
  '23514', 'The lowest paid price is $0.99', 'a $0.50 rental is refused');
select is((select price_cents from public.offers where film_id = '20000000-0000-0000-0000-000000000001' and active), 999,
  'a refused change leaves the previous offers in place');
select lives_ok($$ select public.set_film_offers('20000000-0000-0000-0000-000000000002', null, null, 0) $$,
  'a short under 5 minutes can be free');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.set_film_offers('20000000-0000-0000-0000-000000000001', 99, 24, null) $$,
  '42501', null, 'a viewer cannot change someone else''s prices');
reset role;

-- A free film "sale" records zero ledger lines that still reconcile.
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, license_ack_at)
select '50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000000b', o.id, o.film_id,
       '10000000-0000-0000-0000-000000000001', 'buy', 0, now()
from public.offers o where o.film_id = '20000000-0000-0000-0000-000000000002' and o.active;
select public.record_sale('50000000-0000-0000-0000-000000000009', 0, 0, 'free_x', '');
select is((select count(*)::int from public.order_ledger_mismatches()), 0, 'a free order reconciles');

select * from finish();
rollback;
