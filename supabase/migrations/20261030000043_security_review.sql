-- Fixes from the T020 security review.

-- H1: users may only supply profile fields when creating a filmmaker account; ID status,
-- founding rate, holds and approval are server-managed.
revoke insert on public.filmmaker_accounts from authenticated;
grant insert (owner_id, display_name, slug, legal_name, website, past_work) on public.filmmaker_accounts to authenticated;

-- M1: staff powers in the database require a second factor (aal2), like the app does.
create or replace function public.has_role(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (r = any (p.roles) or 'admin' = any (p.roles))
  ) and (r not in ('staff', 'admin') or coalesce(auth.jwt() ->> 'aal', '') = 'aal2');
$$;

-- M2: authors can edit their words and rating, never move a review to another film.
revoke update on public.reviews from authenticated;
grant update (rating, body) on public.reviews to authenticated;

-- M5: the cap year is always the year the film was created.
create or replace function public.set_cap_year() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.cap_year := extract(year from now())::int;
  return new;
end $$;
drop trigger if exists films_cap_year on public.films;
create trigger films_cap_year before insert on public.films
  for each row execute function public.set_cap_year();
-- Runs before the cap check (triggers fire in name order: films_cap < films_cap_year), so
-- check against the corrected year explicitly as well.
create or replace function public.check_film_cap() returns trigger
language plpgsql set search_path = '' as $$
declare
  t text;
  k text := public.film_kind(new.runtime_seconds);
  yr int := case when tg_op = 'INSERT' then extract(year from now())::int else new.cap_year end;
  cap int;
  used int;
begin
  if tg_op = 'UPDATE' and public.film_kind(old.runtime_seconds) = k then
    return new;
  end if;
  select tier into t from public.filmmaker_accounts where id = new.account_id;
  cap := public.cap_for(t, k);
  if cap is null then
    return new;
  end if;
  select count(*) into used from public.films f
  where f.account_id = new.account_id and f.cap_year = yr
    and public.film_kind(f.runtime_seconds) = k and f.status not in ('rejected') and f.id <> new.id;
  if used >= cap then
    raise exception 'Yearly limit reached: % % per year on the % tier', cap, k || 's', t
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- H2: a film can only be published from 'ready' (checks finished on the current master).
create or replace function public.publish_blockers(f uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare
  film public.films;
  acct public.filmmaker_accounts;
  out text[] := '{}';
begin
  select * into film from public.films where id = f;
  if not found then
    return array['Film not found'];
  end if;
  -- L3: only the film's account or staff may see why it can't publish.
  if not (public.is_account_member(film.account_id) or public.has_role('staff') or auth.role() = 'service_role' or auth.uid() is null) then
    return array['Film not found'];
  end if;
  select * into acct from public.filmmaker_accounts where id = film.account_id;

  if acct.status <> 'approved' then out := array_append(out, 'Your filmmaker account is not approved yet'); end if;
  if film.ai_declared_at is null then out := array_append(out, 'Declare whether the film uses AI-generated imagery'); end if;
  if film.rights_statement_at is null then out := array_append(out, 'Confirm the rights statement'); end if;
  if film.ai_flagged and not film.ai_generated and not film.staff_approved then
    out := array_append(out, 'The AI scan flagged frames: add the AI-generated label or wait for staff review');
  end if;
  if not exists (select 1 from public.film_assets a where a.film_id = f and a.kind = 'master' and a.status = 'ready') then
    out := array_append(out, 'The master file has not finished encoding');
  end if;
  if not (coalesce(film.vetting_score, 0) >= 80 or film.staff_approved) then
    out := array_append(out, 'Automatic checks have not cleared the film');
  end if;
  if film.status in ('draft', 'checking') then
    out := array_append(out, 'Automatic checks are still running');
  elsif film.status = 'review' then
    out := array_append(out, 'Umoobi staff are reviewing the film');
  end if;
  if film.runtime_seconds is null then out := array_append(out, 'Add the runtime'); end if;
  if not exists (select 1 from public.offers o where o.film_id = f and o.active) then
    out := array_append(out, 'Turn on rent, buy or both');
  end if;
  if not public.credit_shares_ok(f) then out := array_append(out, 'Revenue shares must total 100%'); end if;
  if film.status in ('pulled', 'rejected', 'hidden') then out := array_append(out, 'This film is ' || film.status); end if;
  return out;
end $$;

-- H3: invites are rate-limited per person.
alter table public.people add column if not exists invited_at timestamptz;

-- L2: waitlist confirmation resends are throttled.
alter table public.waitlist_signups add column if not exists confirm_sent_at timestamptz;

-- L3: fee rates aren't public.
revoke execute on function public.fee_cents(uuid, int, date) from public, anon, authenticated;
grant execute on function public.fee_cents(uuid, int, date) to service_role;

-- H3: names that end up in emails and pages have sane lengths.
alter table public.people drop constraint if exists people_name_length;
alter table public.people add constraint people_name_length check (length(name) between 1 and 120);
alter table public.filmmaker_accounts drop constraint if exists accounts_display_name_length;
alter table public.filmmaker_accounts add constraint accounts_display_name_length check (length(display_name) between 1 and 100);
