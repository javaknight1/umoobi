-- Filmmaker portal: sales statement, analytics roll-ups and monthly payouts (T015, T016, T017).

-- ---------------------------------------------------------------------------
-- Sales statement: one line per sale with the fee split, never the buyer (D38).
-- ---------------------------------------------------------------------------

create or replace function public.account_sales(a uuid, p_from timestamptz, p_to timestamptz)
returns table (
  order_ref text, paid_at timestamptz, film_id uuid, film_title text, kind text, status text,
  price_cents int, fee_cents int, processing_cents int, net_cents int, tax_cents int, refunded_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select left(o.id::text, 8), o.paid_at, o.film_id, f.title, o.kind, o.status,
    o.subtotal_cents,
    coalesce(sum(l.amount_cents) filter (where l.kind = 'fee'), 0)::int,
    coalesce(sum(l.amount_cents) filter (where l.kind = 'processing'), 0)::int,
    coalesce(sum(l.amount_cents) filter (where l.kind = 'net'), 0)::int,
    o.tax_cents, o.refunded_at
  from public.orders o
  join public.films f on f.id = o.film_id
  left join public.ledger_entries l on l.order_id = o.id
  where o.account_id = a and o.paid_at >= p_from and o.paid_at < p_to
    and o.status in ('paid', 'refunded')
    and (public.is_account_member(a) or public.has_role('staff') or auth.role() = 'service_role')
  group by o.id, f.title
  order by o.paid_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Nightly analytics roll-up (S7): session-keyed events only, no user ids.
-- ---------------------------------------------------------------------------

create or replace function public.rollup_film_day(p_day date) returns int
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  with pe as (
    select film_id,
      count(*) filter (where event = 'view') views,
      count(*) filter (where event = 'trailer_play') trailer_plays,
      count(*) filter (where event = 'checkout_start') checkout_starts,
      count(*) filter (where event = 'purchase') purchases
    from public.page_events
    where film_id is not null and created_at >= p_day and created_at < p_day + 1
    group by film_id
  ),
  src as (
    select film_id, jsonb_object_agg(coalesce(source, 'direct'), c) sources
    from (select film_id, source, count(*) c from public.page_events
          where event = 'view' and film_id is not null and created_at >= p_day and created_at < p_day + 1
          group by film_id, source) s
    group by film_id
  ),
  reg as (
    select film_id, jsonb_object_agg(region, c) regions
    from (select film_id, region, count(*) c from public.page_events
          where event = 'view' and region is not null and film_id is not null and created_at >= p_day and created_at < p_day + 1
          group by film_id, region) r
    group by film_id
  ),
  sessions as (
    select e.film_id, e.session_id, max(e.position_seconds) furthest, f.runtime_seconds
    from public.playback_events e join public.films f on f.id = e.film_id
    where e.created_at >= p_day and e.created_at < p_day + 1
    group by e.film_id, e.session_id, f.runtime_seconds
  ),
  play as (
    select film_id,
      count(*) plays,
      count(*) filter (where runtime_seconds > 0 and furthest >= runtime_seconds * 0.9) completions,
      jsonb_object_agg(decile, c) dropoff
    from (
      select film_id, decile, count(*) over (partition by film_id, decile) c, runtime_seconds, furthest
      from (select *, least(9, floor(furthest::numeric / nullif(runtime_seconds, 0) * 10))::int decile from sessions) d
    ) x
    group by film_id
  ),
  films as (select film_id from pe union select film_id from play)
  insert into public.film_daily_stats as s
    (film_id, day, views, trailer_plays, checkout_starts, purchases, plays, completions, sources, regions, dropoff)
  select f.film_id, p_day, coalesce(pe.views, 0), coalesce(pe.trailer_plays, 0), coalesce(pe.checkout_starts, 0),
    coalesce(pe.purchases, 0), coalesce(play.plays, 0), coalesce(play.completions, 0),
    coalesce(src.sources, '{}'), coalesce(reg.regions, '{}'), coalesce(play.dropoff, '{}')
  from films f
  left join pe using (film_id) left join src using (film_id) left join reg using (film_id) left join play using (film_id)
  on conflict (film_id, day) do update set
    views = excluded.views, trailer_plays = excluded.trailer_plays, checkout_starts = excluded.checkout_starts,
    purchases = excluded.purchases, plays = excluded.plays, completions = excluded.completions,
    sources = excluded.sources, regions = excluded.regions, dropoff = excluded.dropoff;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Monthly payouts (D40). A payout row is created pending; the ledger entry is only
-- written once the transfer succeeds, so a failed transfer leaves the balance intact.
-- ---------------------------------------------------------------------------

create or replace function public.create_monthly_payouts(p_period_start date, p_period_end date)
returns setof public.payouts
language sql security definer set search_path = '' as $$
  insert into public.payouts (account_id, period_start, period_end, amount_cents, status)
  select a.id, p_period_start, p_period_end, public.available_balance_cents(a.id, p_period_end),
         case when a.payout_hold then 'held' else 'pending' end
  from public.filmmaker_accounts a
  where a.status = 'approved' and a.stripe_account_id is not null and a.payouts_enabled
    and public.available_balance_cents(a.id, p_period_end) > 0
  on conflict (account_id, period_start) do nothing
  returning *;
$$;

create or replace function public.mark_payout_paid(p_payout uuid, p_transfer text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.payouts;
begin
  select * into p from public.payouts where id = p_payout for update;
  if p.status = 'paid' then return; end if;
  update public.payouts set status = 'paid', stripe_transfer_id = p_transfer, paid_at = now() where id = p_payout;
  insert into public.ledger_entries (account_id, kind, amount_cents, payout_id, available_on, memo)
  values (p.account_id, 'payout', -p.amount_cents, p.id, p.period_end,
          'Payout for ' || to_char(p.period_start, 'Mon YYYY'));
end $$;

-- Refund after payout (S6): when a refund leaves an account negative and nothing new is
-- coming in, the worker reverses part of the last transfer and books it here.
create or replace function public.record_transfer_reversal(p_account uuid, p_amount int, p_payout uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.ledger_entries (account_id, kind, amount_cents, payout_id, memo)
  values (p_account, 'adjustment', p_amount, p_payout, 'Transfer reversed to cover a refund');
$$;

revoke execute on function public.rollup_film_day(date), public.create_monthly_payouts(date, date),
  public.mark_payout_paid(uuid, text), public.record_transfer_reversal(uuid, int, uuid)
  from public, anon, authenticated;
