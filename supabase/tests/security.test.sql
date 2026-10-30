-- Money and admin functions are not callable by signed-in users or visitors.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'sam@umoobi.test');
insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide', 'low-tide', 'approved');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.record_sale(gen_random_uuid(), 0, 0, 'x', 'y') $$, '42501', null, 'users cannot record sales');
select throws_ok($$ select public.record_refund(gen_random_uuid(), 'x') $$, '42501', null, 'users cannot record refunds');
select throws_ok($$ select * from public.order_ledger_mismatches() $$, '42501', null, 'users cannot read reconciliation');
select throws_ok($$ select public.available_balance_cents('10000000-0000-0000-0000-000000000001') $$, '42501', null, 'users cannot read raw balances');
select throws_ok($$ select public.my_balance_cents('10000000-0000-0000-0000-000000000001') $$, '42501', null, 'strangers cannot read another account''s balance');
select throws_ok($$ select * from public.claim_jobs(1) $$, '42501', null, 'users cannot claim jobs');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(public.my_balance_cents('10000000-0000-0000-0000-000000000001'), 0, 'the owner reads their own balance');
reset role;

set local role anon;
select throws_ok($$ select public.publish_film(gen_random_uuid()) $$, '42501', null, 'visitors cannot call publish');
reset role;

select * from finish();
rollback;
