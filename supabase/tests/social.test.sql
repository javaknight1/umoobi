-- Discovery, search, claims and credits functions (T010, T014).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Start from an empty database (seed data is restored by the rollback).
truncate auth.users, public.waitlist_signups, public.shelves, public.jobs, public.webhook_events cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'maya@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000b', 'jordan@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000c', 'sam@umoobi.test'),
  ('00000000-0000-0000-0000-00000000000e', 'leilani@umoobi.test');

insert into public.filmmaker_accounts (id, owner_id, display_name, slug, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Low Tide', 'low-tide', 'approved');

insert into public.films (id, account_id, slug, title, genre, runtime_seconds, status, vetting_score, published_at) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'salt-and-static', 'Salt & Static', 'Drama', 5640, 'published', 97, now()),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'tidepool', 'Tidepool', 'Drama', 240, 'published', 95, now()),
  ('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'secret-draft', 'Secret Draft', 'Drama', 3000, 'draft', null, null),
  ('20000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000001', 'harbor-lights', 'Harbor Lights', 'Comedy', 300, 'published', 90, now());

insert into public.offers (id, film_id, kind, price_cents, rental_hours) values
  ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'rent', 199, 48),
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'rent', 499, 48);

insert into public.people (id, slug, name, invite_token, created_by_account) values
  ('40000000-0000-0000-0000-000000000001', 'leilani-kahale', 'Leilani Kahale', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 'sam-whitford', 'Sam Whitford', '50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001');

insert into public.credits (film_id, person_id, role) values
  ('20000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 'Lead'),
  ('20000000-0000-0000-0000-00000000000d', '40000000-0000-0000-0000-000000000001', 'Lead');

-- Salt & Static: 3 views. Tidepool: 1 view + 1 sale. The draft: lots of views (ignored).
insert into public.page_events (session_id, film_id, event) select gen_random_uuid(), '20000000-0000-0000-0000-00000000000a', 'view' from generate_series(1, 3);
insert into public.page_events (session_id, film_id, event) values (gen_random_uuid(), '20000000-0000-0000-0000-00000000000b', 'view');
insert into public.page_events (session_id, film_id, event) select gen_random_uuid(), '20000000-0000-0000-0000-00000000000c', 'view' from generate_series(1, 50);
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b',
   '20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'rent', 199),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000a',
   '20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'rent', 499);
select public.record_sale('60000000-0000-0000-0000-000000000001', 0, 36, 'pi1', 'ch1');
select public.record_sale('60000000-0000-0000-0000-000000000002', 0, 44, 'pi2', 'ch2');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

-- ─── Trending ───────────────────────────────────────────────────────────────
select is((select array_agg(film_id order by score desc) from public.trending_films()),
  array['20000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b']::uuid[],
  'trending ranks views and sales, published films only');
select is((select score from public.trending_films() where film_id = '20000000-0000-0000-0000-00000000000b'), 6::bigint,
  'a sale counts 5, a view 1');

-- ─── Search ─────────────────────────────────────────────────────────────────
select is((select film_id from public.search_films('static') limit 1), '20000000-0000-0000-0000-00000000000a'::uuid, 'search finds a title word');
select is((select count(*)::int from public.search_films('secret draft')), 0, 'search never returns drafts');
select is((select person_id from public.search_people('leilan') limit 1), '40000000-0000-0000-0000-000000000001'::uuid, 'people search matches partial names');

-- ─── Because you watched ────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select array_agg(film_id) from public.because_you_watched()),
  array['20000000-0000-0000-0000-00000000000d']::uuid[],
  'suggests films sharing a person, excluding films already rented');
reset role;
set local role anon;
select throws_ok($$ select * from public.because_you_watched() $$, '42501', null, 'visitors cannot call because_you_watched');
reset role;

-- ─── Claims ─────────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select is(public.claim_person('50000000-0000-0000-0000-000000000001'), 'leilani-kahale', 'an invite token claims the page');
select throws_ok($$ select public.claim_person('50000000-0000-0000-0000-000000000002') $$, '23505', 'You have already claimed a page',
  'one claimed page per user');
reset role;
select is((select invite_token from public.people where slug = 'leilani-kahale'), null, 'the token is used up');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.claim_person('50000000-0000-0000-0000-000000000001') $$, 'P0002', 'This invite link is not valid',
  'a used token cannot be claimed again');
reset role;

-- ─── Credits ────────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.save_credits('20000000-0000-0000-0000-00000000000a', '[]') $$, '42501', null,
  'only the film''s account can save credits');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.save_credits('20000000-0000-0000-0000-00000000000a',
  '[{"person_id":"40000000-0000-0000-0000-000000000001","role":"Lead","share_bps":6000},
    {"person_id":"40000000-0000-0000-0000-000000000002","role":"DP","share_bps":3000}]') $$,
  '23514', null, 'shares totaling 90% are refused');
select lives_ok($$ select public.save_credits('20000000-0000-0000-0000-00000000000a',
  '[{"person_id":"40000000-0000-0000-0000-000000000002","role":"DP","share_bps":4000},
    {"person_id":"40000000-0000-0000-0000-000000000001","role":"Lead","share_bps":6000}]') $$,
  'shares totaling 100% are saved');
reset role;
select is((select array_agg(role order by billing_order) from public.credits where film_id = '20000000-0000-0000-0000-00000000000a'),
  array['DP', 'Lead'], 'credits keep the given order');
select is((select r.count::int from public.film_rating('20000000-0000-0000-0000-00000000000a') r), 0, 'film_rating reports no reviews yet');

select * from finish();
rollback;
