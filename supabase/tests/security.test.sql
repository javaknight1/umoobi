-- Money and admin functions are not callable by signed-in users or visitors.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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

-- H1: an applicant can't pre-set ID status or a founding rate.
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ insert into public.filmmaker_accounts (owner_id, display_name, slug, identity_status)
  values (auth.uid(), 'Sneaky', 'sneaky', 'verified') $$, '42501', null, 'an applicant cannot claim a verified ID');
select throws_ok($$ insert into public.filmmaker_accounts (owner_id, display_name, slug, founding_rate_until)
  values (auth.uid(), 'Sneaky', 'sneaky', '2099-12-31') $$, '42501', null, 'an applicant cannot set a founding rate');
select lives_ok($$ insert into public.filmmaker_accounts (owner_id, display_name, slug, legal_name)
  values (auth.uid(), 'Honest', 'honest', 'Sam Lee') $$, 'an applicant can still apply with profile fields');
reset role;

-- M2: a review can't be moved to another film.
insert into public.films (id, account_id, slug, title, runtime_seconds, status, vetting_score) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a', 'A', 200, 'published', 90),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'b', 'B', 6000, 'published', 90);
insert into public.reviews (id, film_id, author_id, rating) values
  ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 5);
set local role authenticated;
select throws_ok($$ update public.reviews set film_id = '20000000-0000-0000-0000-000000000002' where id = '80000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'a review cannot be moved to another film');
reset role;

select * from finish();
rollback;
