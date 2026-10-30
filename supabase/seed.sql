-- Local sample data, matching the MVP Proposal mockups. All names, films and numbers are samples.
-- Sign in locally with magic links (Mailpit at http://127.0.0.1:55424):
--   maya@umoobi.test (filmmaker, Low Tide Pictures) · jordan@umoobi.test (viewer)
--   leilani@umoobi.test (actor, claimed page) · staff@umoobi.test (staff; 2FA enrolment on first visit)
--   rosa@umoobi.test (second filmmaker)

with u(id, email, name) as (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'maya@umoobi.test', 'Maya Okafor'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'jordan@umoobi.test', 'Jordan'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'leilani@umoobi.test', 'Leilani Kahale'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'staff@umoobi.test', 'Umoobi Staff'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'rosa@umoobi.test', 'Rosa Diaz'))
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', name, 'birth_year', 1990), now(), now()
from u;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email), now(), now(), now()
from auth.users where email like '%@umoobi.test';

update public.profiles set roles = array['viewer', 'filmmaker'] where id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005');
update public.profiles set roles = array['viewer', 'staff'] where id = 'a0000000-0000-0000-0000-000000000004';

insert into public.filmmaker_accounts (id, owner_id, display_name, slug, legal_name, website, past_work, status, vetting_score,
  stripe_account_id, identity_status, payouts_enabled, approved_at) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Low Tide Pictures', 'low-tide-pictures',
   'Maya Okafor', 'https://lowtidepictures.example', 'https://www.imdb.com/name/nm0000001', 'approved', 96,
   'acct_dev_lowtide', 'verified', true, now() - interval '120 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'Rosa Diaz Films', 'rosa-diaz-films',
   'Rosa Diaz', null, 'vimeo.com/rosadiaz', 'approved', 88, 'acct_dev_rosa', 'verified', true, now() - interval '40 days');

-- Films -----------------------------------------------------------------------
insert into public.films (id, account_id, slug, title, synopsis, genre, content_rating, release_year, runtime_seconds,
  status, vetting_score, ai_generated, ai_declared_at, rights_statement_at, published_at) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'salt-and-static', 'Salt & Static',
   'A radio operator on a dying island station picks up a signal that shouldn''t exist, and has one night to decide who to tell.',
   'Drama', 'PG-13', 2026, 5640, 'published', 97, false, now(), now(), now() - interval '30 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'tidepool', 'Tidepool',
   'Two sisters, one low tide, and the thing they find between the rocks.', 'Drama', 'G', 2024, 240,
   'published', 95, false, now(), now(), now() - interval '200 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'night-shift-at-the-planetarium', 'Night Shift at the Planetarium',
   'A night guard and the last projectionist in the city keep the stars running after the museum closes for good.',
   'Comedy', 'PG', 2025, 5160, 'published', 91, false, now(), now(), now() - interval '5 days'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'paper-orchard', 'Paper Orchard',
   'An animated short about an orchard that grows from a child''s drawings.', 'Animation', 'G', 2026, 600,
   'published', 89, true, now(), now(), now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'low-water', 'Low Water',
   'Maya''s next feature, still in the edit.', 'Drama', null, 2027, 5400, 'draft', null, false, null, null, null);

insert into public.film_assets (film_id, kind, label, status, mux_asset_id, mux_playback_id, duration_seconds) values
  ('c0000000-0000-0000-0000-000000000001', 'master', null, 'ready', 'dev_asset_salt', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 5640),
  ('c0000000-0000-0000-0000-000000000001', 'trailer', 'Official trailer', 'ready', 'dev_asset_salt_tr', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 130),
  ('c0000000-0000-0000-0000-000000000001', 'clip', 'The signal', 'ready', 'dev_asset_salt_c1', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 95),
  ('c0000000-0000-0000-0000-000000000002', 'master', null, 'ready', 'dev_asset_tide', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 240),
  ('c0000000-0000-0000-0000-000000000003', 'master', null, 'ready', 'dev_asset_night', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 5160),
  ('c0000000-0000-0000-0000-000000000003', 'trailer', 'Trailer', 'ready', 'dev_asset_night_tr', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 110),
  ('c0000000-0000-0000-0000-000000000004', 'master', null, 'ready', 'dev_asset_paper', 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M', 600);

insert into public.offers (id, film_id, kind, price_cents, rental_hours) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'rent', 499, 48),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'buy', 1299, null),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'buy', 0, null),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'rent', 399, 72),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'buy', 999, null),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000004', 'rent', 199, 48);

-- People and credits ------------------------------------------------------------
insert into public.people (id, slug, name, bio, claimed_by, claimed_at, created_by_account) values
  ('e0000000-0000-0000-0000-000000000001', 'maya-okafor', 'Maya Okafor', 'Writer-director from the Oregon coast.', 'a0000000-0000-0000-0000-000000000001', now(), 'b0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'leilani-kahale', 'Leilani Kahale', 'Actor. Honolulu and Los Angeles.', 'a0000000-0000-0000-0000-000000000003', now(), 'b0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'sam-whitford', 'Sam Whitford', null, null, null, 'b0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000004', 'rosa-diaz', 'Rosa Diaz', 'Director and animator.', 'a0000000-0000-0000-0000-000000000005', now(), 'b0000000-0000-0000-0000-000000000002');

insert into public.credits (film_id, person_id, role, billing_order, share_bps) values
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Director', 0, 6000),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Lead actor', 1, 2500),
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'Cinematographer', 2, 1500),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'Director', 0, 0),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Actor', 1, 0),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 'Director', 0, 0),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'Lead actor', 1, 0),
  ('c0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Director', 0, 0);

-- Discovery shelves ---------------------------------------------------------------
insert into public.shelves (id, slug, title, position) values
  ('f0000000-0000-0000-0000-000000000001', 'staff-picks', 'Staff picks', 0);
insert into public.shelf_items (shelf_id, film_id, position) values
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 0),
  ('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 1);

-- Jordan rented Salt & Static and bought Night Shift (sales go through the ledger functions).
insert into public.orders (id, viewer_id, offer_id, film_id, account_id, kind, subtotal_cents, license_ack_at, created_at) values
  ('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'rent', 499, null, now() - interval '3 days'),
  ('90000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'buy', 999, now(), now() - interval '1 day');
select public.record_sale('90000000-0000-0000-0000-000000000001', 35, 46, 'pi_dev_seed1', 'ch_dev_seed1');
select public.record_sale('90000000-0000-0000-0000-000000000002', 70, 61, 'pi_dev_seed2', 'ch_dev_seed2');

insert into public.reviews (film_id, author_id, rating, body) values
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 5, 'Funny and quietly devastating. Watched it twice.');
insert into public.follows (follower_id, person_id) values
  ('a0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002');

-- A little analytics history for Salt & Static (session-keyed only).
insert into public.page_events (session_id, film_id, event, source, region, created_at)
select gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001',
  (array['view','view','view','view','trailer_play','checkout_start','purchase'])[1 + (i % 7)],
  (array['instagram','direct','umoobi','letterboxd','instagram'])[1 + (i % 5)],
  (array['CA','NY','OR','HI','TX','WA'])[1 + (i % 6)],
  now() - make_interval(days => i % 30)
from generate_series(1, 400) i;

