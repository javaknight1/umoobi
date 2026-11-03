-- Closed beta invites only count for the invited email address.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);
truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'invited@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'other@umoobi.test');
insert into public.waitlist_signups (email, role, confirmed_at, beta_invited_at, beta_invite_token) values
  ('invited@umoobi.test', 'filmmaker', now(), now(), gen_random_uuid()),
  ('other@umoobi.test', 'filmmaker', now(), null, null);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select ok(public.has_beta_invite(), 'the invited email has an invite');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select ok(not public.has_beta_invite(), 'a confirmed but uninvited filmmaker does not');
reset role;
set local role anon;
select throws_ok($$ select public.has_beta_invite() $$, '42501', null, 'visitors cannot call it');
reset role;

select * from finish();
rollback;
