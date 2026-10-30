-- Discovery, search, claims and credits (T010, T014). Re-runnable.

-- Trending: purchases count 5x, trailer plays 2x, views 1x over the last N days.
-- Returns film ids and scores only, never who did what (D38).
create or replace function public.trending_films(p_days int default 7, p_limit int default 12)
returns table (film_id uuid, score bigint)
language sql stable security definer set search_path = '' as $$
  with signals as (
    select e.film_id, case e.event when 'trailer_play' then 2 else 1 end as w
    from public.page_events e
    where e.film_id is not null and e.created_at > now() - make_interval(days => p_days) and e.event in ('view', 'trailer_play')
    union all
    select o.film_id, 5 from public.orders o
    where o.status = 'paid' and o.paid_at > now() - make_interval(days => p_days)
  )
  select s.film_id, sum(s.w)::bigint as score
  from signals s join public.films f on f.id = s.film_id
  where f.status = 'published'
  group by s.film_id
  order by score desc, s.film_id
  limit p_limit;
$$;

-- Because you watched: published films sharing a credited person or genre with the
-- signed-in viewer's rentals and purchases, excluding films they already have.
create or replace function public.because_you_watched(p_limit int default 12)
returns table (film_id uuid, score int)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select distinct e.film_id from public.entitlements e where e.viewer_id = auth.uid()
  ),
  my_people as (
    select distinct c.person_id from public.credits c join mine m on m.film_id = c.film_id
  ),
  my_genres as (
    select distinct f.genre from public.films f join mine m on m.film_id = f.id where f.genre is not null
  ),
  candidates as (
    select c.film_id, 3 as w from public.credits c join my_people p on p.person_id = c.person_id
    union all
    select f.id, 1 from public.films f join my_genres g on g.genre = f.genre
  )
  select c.film_id, sum(c.w)::int as score
  from candidates c join public.films f on f.id = c.film_id
  where f.status = 'published' and c.film_id not in (select film_id from mine)
  group by c.film_id
  order by score desc, c.film_id
  limit p_limit;
$$;

-- Search published films by full text and title similarity.
create or replace function public.search_films(q text, p_limit int default 24)
returns table (film_id uuid, rank real)
language sql stable security definer set search_path = '' as $$
  select f.id,
    (ts_rank(f.search, websearch_to_tsquery('english', q)) + extensions.similarity(f.title, q))::real as rank
  from public.films f
  where f.status = 'published'
    and (f.search @@ websearch_to_tsquery('english', q) or extensions.similarity(f.title, q) > 0.2
         or f.title ilike '%' || q || '%')
  order by rank desc, f.published_at desc
  limit p_limit;
$$;

create or replace function public.search_people(q text, p_limit int default 12)
returns table (person_id uuid, rank real)
language sql stable security definer set search_path = '' as $$
  select p.id, extensions.similarity(p.name, q)::real
  from public.people p
  where extensions.similarity(p.name, q) > 0.2 or p.name ilike '%' || q || '%'
  order by 2 desc, p.name
  limit p_limit;
$$;

-- Claim a person page with an invite token. One page per user (people.claimed_by is unique).
create or replace function public.claim_person(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  p public.people;
begin
  if auth.uid() is null then
    raise exception 'Sign in to claim a page' using errcode = 'insufficient_privilege';
  end if;
  select * into p from public.people where invite_token = p_token for update;
  if not found then
    raise exception 'This invite link is not valid' using errcode = 'no_data_found';
  end if;
  if p.claimed_by is not null and p.claimed_by <> auth.uid() then
    raise exception 'This page has already been claimed' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from public.people where claimed_by = auth.uid() and id <> p.id) then
    raise exception 'You have already claimed a page' using errcode = 'unique_violation';
  end if;
  update public.people set claimed_by = auth.uid(), claimed_at = now(), invite_token = null where id = p.id;
  return p.slug;
end $$;

-- Replace a film's credits in one transaction so the 100% shares rule (deferred trigger)
-- is checked once, on the final state. p_credits: [{person_id, role, share_bps}], in order.
create or replace function public.save_credits(p_film uuid, p_credits jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c jsonb;
  i int := 0;
begin
  if not public.can_manage_film(p_film) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.credits where film_id = p_film;
  for c in select * from jsonb_array_elements(coalesce(p_credits, '[]'::jsonb)) loop
    insert into public.credits (film_id, person_id, role, billing_order, share_bps)
    values (p_film, (c ->> 'person_id')::uuid, c ->> 'role', i, coalesce((c ->> 'share_bps')::int, 0));
    i := i + 1;
  end loop;
  set constraints public.credits_shares immediate;
end $$;

-- Rating summary for a film page (reviews are public on published films anyway).
create or replace function public.film_rating(p_film uuid) returns table (average numeric, count int)
language sql stable security definer set search_path = '' as $$
  select round(avg(rating)::numeric, 1), count(*)::int
  from public.reviews r join public.films f on f.id = r.film_id
  where r.film_id = p_film and f.status = 'published';
$$;

grant execute on function public.trending_films(int, int), public.search_films(text, int), public.search_people(text, int),
  public.film_rating(uuid) to anon, authenticated;
grant execute on function public.because_you_watched(int), public.claim_person(uuid), public.save_credits(uuid, jsonb)
  to authenticated;
revoke execute on function public.because_you_watched(int), public.claim_person(uuid), public.save_credits(uuid, jsonb)
  from public, anon;
