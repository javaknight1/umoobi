-- Row-level security on every table. Money, jobs and analytics tables have no write
-- policies: only the service role (webhooks and the worker) writes them.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'waitlist_signups', 'filmmaker_accounts', 'account_members', 'films', 'film_assets',
    'offers', 'people', 'credits', 'payouts', 'orders', 'ledger_entries', 'entitlements',
    'watch_progress', 'verifications', 'review_items', 'strikes', 'content_reports', 'takedowns',
    'staff_audit_log', 'follows', 'reviews', 'lists', 'list_items', 'shelves', 'shelf_items',
    'consents', 'playback_events', 'page_events', 'film_daily_stats', 'jobs', 'webhook_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Helpers ---------------------------------------------------------------------

create function public.film_is_public(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.films where id = f and status = 'published');
$$;

create function public.can_manage_film(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.films where id = f and public.is_account_member(account_id));
$$;

-- Profiles --------------------------------------------------------------------

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.has_role('staff'));
create policy "update own profile" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
-- Roles can't be self-granted.
revoke update on public.profiles from authenticated;
grant update (display_name, birth_year) on public.profiles to authenticated;

-- Waitlist: inserts go through a server action with the service role; staff read.
create policy "staff read waitlist" on public.waitlist_signups for select using (public.has_role('staff'));

-- Filmmaker accounts ----------------------------------------------------------

create policy "public approved accounts" on public.filmmaker_accounts for select
  using (status = 'approved' or public.is_account_member(id) or public.has_role('staff'));
create policy "create own account" on public.filmmaker_accounts for insert
  with check (owner_id = auth.uid() and status = 'applying' and tier = 'new' and fee_bps = 1000
              and vetting_score is null and stripe_account_id is null and payouts_enabled = false);
-- Owners may edit only profile fields; status, tier, fees and Stripe ids are server-managed.
revoke update on public.filmmaker_accounts from authenticated;
grant update (display_name, legal_name, website, past_work) on public.filmmaker_accounts to authenticated;
create policy "owner updates profile" on public.filmmaker_accounts for update
  using (public.is_account_member(id)) with check (public.is_account_member(id));

create policy "members see members" on public.account_members for select
  using (public.is_account_member(account_id) or public.has_role('staff'));

-- Films -----------------------------------------------------------------------

create policy "read films" on public.films for select
  using (status = 'published' or public.is_account_member(account_id) or public.has_role('staff'));
create policy "members create films" on public.films for insert
  with check (public.is_account_member(account_id) and status = 'draft' and vetting_score is null
              and not staff_approved and not ai_flagged);
revoke update on public.films from authenticated;
grant update (title, synopsis, genre, content_rating, release_year, runtime_seconds, poster_url,
              ai_generated, ai_declared_at, rights_statement_at, slug) on public.films to authenticated;
create policy "members update films" on public.films for update
  using (public.is_account_member(account_id)) with check (public.is_account_member(account_id));
create policy "members delete drafts" on public.films for delete
  using (public.is_account_member(account_id) and status = 'draft');

create policy "read assets" on public.film_assets for select
  using ((public.film_is_public(film_id) and kind in ('trailer', 'clip', 'subtitle'))
         or public.can_manage_film(film_id) or public.has_role('staff'));
create policy "members add subtitles" on public.film_assets for insert
  with check (public.can_manage_film(film_id) and kind = 'subtitle');
create policy "members edit asset labels" on public.film_assets for update
  using (public.can_manage_film(film_id)) with check (public.can_manage_film(film_id));
revoke update on public.film_assets from authenticated;
grant update (label, language) on public.film_assets to authenticated;
create policy "members delete free footage" on public.film_assets for delete
  using (public.can_manage_film(film_id) and kind <> 'master');

create policy "read offers" on public.offers for select
  using (public.film_is_public(film_id) or public.can_manage_film(film_id) or public.has_role('staff'));
create policy "members manage offers" on public.offers for all
  using (public.can_manage_film(film_id)) with check (public.can_manage_film(film_id));

-- People and credits ------------------------------------------------------------

create policy "people are public" on public.people for select using (true);
create policy "filmmakers add people" on public.people for insert
  with check (claimed_by is null and public.is_account_member(created_by_account));
revoke update on public.people from authenticated;
grant update (name, bio, photo_url) on public.people to authenticated;
create policy "claimant or unclaimed creator edits" on public.people for update
  using (claimed_by = auth.uid() or (claimed_by is null and public.is_account_member(created_by_account)))
  with check (claimed_by = auth.uid() or (claimed_by is null and public.is_account_member(created_by_account)));
-- invite tokens stay server-side
revoke select on public.people from anon, authenticated;
grant select (id, slug, name, bio, photo_url, claimed_by, claimed_at, created_by_account, created_at)
  on public.people to anon, authenticated;

create policy "read credits" on public.credits for select
  using (public.film_is_public(film_id) or public.can_manage_film(film_id) or public.has_role('staff'));
create policy "members manage credits" on public.credits for all
  using (public.can_manage_film(film_id)) with check (public.can_manage_film(film_id));

-- Money -------------------------------------------------------------------------

create policy "viewer orders" on public.orders for select
  using (viewer_id = auth.uid() or public.has_role('staff'));
-- Filmmakers read their sales through ledger_entries / views, never buyer identity (D38).

create policy "account ledger" on public.ledger_entries for select
  using (public.is_account_member(account_id) or public.has_role('staff'));
create policy "account payouts" on public.payouts for select
  using (public.is_account_member(account_id) or public.has_role('staff'));

create policy "own entitlements" on public.entitlements for select using (viewer_id = auth.uid());
create policy "own progress" on public.watch_progress for all
  using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());

-- Trust and safety ------------------------------------------------------------

create policy "staff verifications" on public.verifications for select
  using (public.has_role('staff') or public.is_account_member(account_id));
create policy "staff review items" on public.review_items for select
  using (public.has_role('staff') or public.is_account_member(account_id));
create policy "account strikes" on public.strikes for select
  using (public.has_role('staff') or public.is_account_member(account_id));
create policy "staff reports" on public.content_reports for select using (public.has_role('staff'));
create policy "staff takedowns" on public.takedowns for select using (public.has_role('staff'));
create policy "staff audit" on public.staff_audit_log for select using (public.has_role('admin'));

-- Social ----------------------------------------------------------------------

create policy "own follows" on public.follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy "reviews public" on public.reviews for select using (public.film_is_public(film_id));
create policy "buyers review" on public.reviews for insert
  with check (author_id = auth.uid() and public.can_review(film_id));
create policy "authors edit" on public.reviews for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete" on public.reviews for delete using (author_id = auth.uid());
-- Filmmakers have no policy to hide or delete reviews.

create policy "lists read" on public.lists for select using (is_public or owner_id = auth.uid());
create policy "lists own" on public.lists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "list items read" on public.list_items for select
  using (exists (select 1 from public.lists l where l.id = list_id and (l.is_public or l.owner_id = auth.uid())));
create policy "list items own" on public.list_items for all
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

create policy "shelves public" on public.shelves for select using (active or public.has_role('staff'));
create policy "shelf items public" on public.shelf_items for select using (true);

create policy "own consents" on public.consents for select using (viewer_id = auth.uid());
create policy "give consent" on public.consents for insert with check (viewer_id = auth.uid());
create policy "withdraw consent" on public.consents for update
  using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());

-- Aggregated analytics: the film's account sees its own roll-ups only.
create policy "account stats" on public.film_daily_stats for select
  using (public.can_manage_film(film_id) or public.has_role('staff'));

-- playback_events, page_events, jobs, webhook_events: service role only (no policies).
