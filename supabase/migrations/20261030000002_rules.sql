-- Business rules enforced in the database, never only in the UI.

-- ---------------------------------------------------------------------------
-- Pricing (D17, D22): paid >= $0.99; free only for films under 5 minutes.
-- ---------------------------------------------------------------------------

create function public.check_offer() returns trigger
language plpgsql set search_path = '' as $$
declare
  rt int;
begin
  select runtime_seconds into rt from public.films where id = new.film_id;
  if new.price_cents = 0 then
    if rt is null or rt >= 300 then
      raise exception 'Free is only allowed for films under 5 minutes' using errcode = 'check_violation';
    end if;
  elsif new.price_cents < 99 then
    raise exception 'The lowest paid price is $0.99' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger offers_rules before insert or update on public.offers
  for each row execute function public.check_offer();

-- If a film's runtime grows past 5 minutes, any free offer becomes invalid.
create function public.check_film_free_offers() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(new.runtime_seconds, 0) >= 300 and exists (
    select 1 from public.offers o where o.film_id = new.id and o.active and o.price_cents = 0
  ) then
    raise exception 'Free is only allowed for films under 5 minutes' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger films_free_offers before update of runtime_seconds on public.films
  for each row execute function public.check_film_free_offers();

-- ---------------------------------------------------------------------------
-- Free footage (D23): <= 3 trailers of <= 180 s, <= 5 clips of <= 120 s,
-- all free footage <= 15% of runtime.
-- ---------------------------------------------------------------------------

create function public.check_free_footage() returns trigger
language plpgsql set search_path = '' as $$
declare
  n int;
  total numeric;
  rt int;
begin
  if new.kind not in ('trailer', 'clip') then
    return new;
  end if;

  select count(*) into n from public.film_assets
  where film_id = new.film_id and kind = new.kind and id <> new.id;
  if new.kind = 'trailer' and n >= 3 then
    raise exception 'A film can have at most 3 trailers' using errcode = 'check_violation';
  end if;
  if new.kind = 'clip' and n >= 5 then
    raise exception 'A film can have at most 5 clips' using errcode = 'check_violation';
  end if;

  if new.duration_seconds is not null then
    if new.kind = 'trailer' and new.duration_seconds > 180 then
      raise exception 'Trailers can be at most 3 minutes' using errcode = 'check_violation';
    end if;
    if new.kind = 'clip' and new.duration_seconds > 120 then
      raise exception 'Clips can be at most 2 minutes' using errcode = 'check_violation';
    end if;

    select runtime_seconds into rt from public.films where id = new.film_id;
    select coalesce(sum(duration_seconds), 0) + new.duration_seconds into total
    from public.film_assets
    where film_id = new.film_id and kind in ('trailer', 'clip') and id <> new.id;
    if rt is not null and total > rt * 0.15 then
      raise exception 'Free trailers and clips can total at most 15%% of the runtime' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger film_assets_free_footage before insert or update on public.film_assets
  for each row execute function public.check_free_footage();

-- ---------------------------------------------------------------------------
-- Yearly caps per account (D13).
-- new: 3 features + 12 shorts; established: 12 features + unlimited shorts.
-- ---------------------------------------------------------------------------

create function public.cap_for(tier text, kind text) returns int
language sql immutable as $$
  select case
    when tier = 'established' and kind = 'feature' then 12
    when tier = 'established' then null
    when kind = 'feature' then 3
    else 12
  end;
$$;

create function public.films_used(a uuid, yr int, kind text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.films f
  where f.account_id = a and f.cap_year = yr
    and public.film_kind(f.runtime_seconds) = kind
    and f.status not in ('rejected');
$$;

create function public.check_film_cap() returns trigger
language plpgsql set search_path = '' as $$
declare
  t text;
  k text := public.film_kind(new.runtime_seconds);
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
  where f.account_id = new.account_id and f.cap_year = new.cap_year
    and public.film_kind(f.runtime_seconds) = k and f.status not in ('rejected') and f.id <> new.id;
  if used >= cap then
    raise exception 'Yearly limit reached: % % per year on the % tier', cap, k || 's', t
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger films_cap before insert or update of runtime_seconds on public.films
  for each row execute function public.check_film_cap();

-- ---------------------------------------------------------------------------
-- Revenue-split shares (D15): when any share is set, a film's shares total 100%.
-- ---------------------------------------------------------------------------

create function public.credit_shares_ok(f uuid) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(sum(share_bps), 0) in (0, 10000) from public.credits where film_id = f;
$$;

create function public.check_credit_shares() returns trigger
language plpgsql set search_path = '' as $$
declare
  f uuid := coalesce(new.film_id, old.film_id);
begin
  if exists (select 1 from public.films where id = f) and not public.credit_shares_ok(f) then
    raise exception 'Revenue shares for a film must total exactly 100%%' using errcode = 'check_violation';
  end if;
  return null;
end $$;

create constraint trigger credits_shares after insert or update or delete on public.credits
  deferrable initially deferred for each row execute function public.check_credit_shares();

-- ---------------------------------------------------------------------------
-- Publishing and sale eligibility (D11, D42, D46)
-- ---------------------------------------------------------------------------

create function public.publish_blockers(f uuid) returns text[]
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
  if film.runtime_seconds is null then out := array_append(out, 'Add the runtime'); end if;
  if not exists (select 1 from public.offers o where o.film_id = f and o.active) then
    out := array_append(out, 'Turn on rent, buy or both');
  end if;
  if not public.credit_shares_ok(f) then out := array_append(out, 'Revenue shares must total 100%'); end if;
  if film.status in ('pulled', 'rejected', 'hidden') then out := array_append(out, 'This film is ' || film.status); end if;
  return out;
end $$;

create function public.publish_film(f uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  acct uuid;
  blockers text[];
begin
  select account_id into acct from public.films where id = f;
  if not (public.is_account_member(acct) or public.has_role('staff')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  blockers := public.publish_blockers(f);
  if cardinality(blockers) > 0 then
    raise exception 'Cannot publish: %', array_to_string(blockers, '; ') using errcode = 'check_violation';
  end if;
  update public.films set status = 'published', published_at = coalesce(published_at, now()) where id = f;
end $$;

create function public.film_is_purchasable(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.films film
    join public.filmmaker_accounts a on a.id = film.account_id
    where film.id = f and film.status = 'published'
      and (coalesce(film.vetting_score, 0) >= 80 or film.staff_approved)
      and a.status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------

-- Umoobi fee: the greater of the account's rate (10%, or 5% founding, D35) and
-- $0.25 (D34), never more than the price.
create function public.fee_cents(a uuid, subtotal int, at date default current_date) returns int
language sql stable security definer set search_path = '' as $$
  select case when subtotal = 0 then 0 else least(subtotal, greatest(25, round(subtotal * (
    case when acct.founding_rate_until is not null and at <= acct.founding_rate_until then 500 else acct.fee_bps end
  ) / 10000.0)::int)) end
  from public.filmmaker_accounts acct where acct.id = a;
$$;

-- Estimated card fee, used for previews. Actual fees come from Stripe's balance transaction.
create function public.estimated_processing_cents(total int) returns int
language sql immutable as $$
  select case when total = 0 then 0 else round(total * 0.029)::int + 30 end;
$$;

-- Called by the Stripe webhook (service role) once a checkout session is paid.
create function public.record_sale(
  p_order uuid, p_tax_cents int, p_processing_cents int,
  p_payment_intent text, p_charge text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  fee int;
  net int;
  reserve int;
  off public.offers;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order % not found', p_order; end if;
  if o.status = 'paid' then return; end if;  -- idempotent
  if o.status <> 'pending' then raise exception 'order % is %', p_order, o.status; end if;

  fee := public.fee_cents(o.account_id, o.subtotal_cents, o.created_at::date);
  net := o.subtotal_cents - fee - p_processing_cents;   -- D31: filmmaker pays card fees

  update public.orders set status = 'paid', tax_cents = p_tax_cents,
    total_cents = o.subtotal_cents + p_tax_cents, paid_at = now(),
    stripe_payment_intent_id = p_payment_intent, stripe_charge_id = p_charge
  where id = p_order;

  insert into public.ledger_entries (order_id, account_id, kind, amount_cents, memo) values
    (p_order, o.account_id, 'net', net, 'Filmmaker share'),
    (p_order, o.account_id, 'fee', fee, 'Umoobi fee'),
    (p_order, o.account_id, 'processing', p_processing_cents, 'Card processing'),
    (p_order, o.account_id, 'tax', p_tax_cents, 'Sales tax collected by Umoobi');

  -- D37: hold 10% of purchase revenue for 30 days against pulled-film refunds.
  if o.kind = 'buy' and net > 0 then
    reserve := round(net * 0.10)::int;
    insert into public.ledger_entries (order_id, account_id, kind, amount_cents, memo, available_on) values
      (p_order, o.account_id, 'reserve_hold', -reserve, 'Refund reserve (30 days)', current_date),
      (p_order, o.account_id, 'reserve_release', reserve, 'Refund reserve released', current_date + 30);
  end if;

  select * into off from public.offers where id = o.offer_id;
  insert into public.entitlements (order_id, viewer_id, film_id, kind, rental_hours, expires_at)
  values (p_order, o.viewer_id, o.film_id, o.kind, off.rental_hours,
          case when o.kind = 'rent' then now() + interval '30 days' end)  -- rentals start within 30 days
  on conflict (order_id) do nothing;
end $$;

-- Full refund: reverses every line of the sale. Processing fees are not returned by
-- Stripe, so Umoobi absorbs refund_processing rather than charging the filmmaker twice.
create function public.record_refund(p_order uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  r record;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status = 'refunded' then return; end if;
  if o.status <> 'paid' then raise exception 'order % is %', p_order, o.status; end if;

  for r in
    select kind, sum(amount_cents)::int amt from public.ledger_entries
    where order_id = p_order and kind in ('net', 'fee', 'processing', 'tax') group by kind
  loop
    insert into public.ledger_entries (order_id, account_id, kind, amount_cents, memo)
    values (p_order, o.account_id, ('refund_' || r.kind), -r.amt, coalesce(p_reason, 'Refund'));
  end loop;

  update public.orders set status = 'refunded', refunded_at = now() where id = p_order;
  update public.entitlements set revoked_at = now() where order_id = p_order and revoked_at is null;
end $$;

-- What the filmmaker is owed, available to pay out on a date.
create function public.available_balance_cents(a uuid, on_date date default current_date) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount_cents), 0)::int from public.ledger_entries
  where account_id = a and available_on <= on_date
    and kind in ('net', 'refund_net', 'reserve_hold', 'reserve_release', 'payout', 'adjustment');
$$;

-- Sum check used by tests and the nightly reconciliation job.
create function public.order_ledger_mismatches() returns table (order_id uuid, total_cents int, ledger_cents int)
language sql stable security definer set search_path = '' as $$
  select o.id, o.total_cents, coalesce(sum(l.amount_cents), 0)::int
  from public.orders o
  left join public.ledger_entries l on l.order_id = o.id and l.kind in ('net', 'fee', 'processing', 'tax')
  where o.status in ('paid', 'refunded')
  group by o.id, o.total_cents
  having coalesce(sum(l.amount_cents), 0) <> o.total_cents;
$$;

-- ---------------------------------------------------------------------------
-- Playback: start the rental clock on first play.
-- ---------------------------------------------------------------------------

create function public.start_playback(f uuid) returns public.entitlements
language plpgsql security definer set search_path = '' as $$
declare
  e public.entitlements;
begin
  select * into e from public.entitlements
  where viewer_id = auth.uid() and film_id = f and revoked_at is null
    and (expires_at is null or expires_at > now())
  order by (kind = 'buy') desc, expires_at desc nulls first
  limit 1 for update;
  if not found then
    raise exception 'No active rental or purchase' using errcode = 'insufficient_privilege';
  end if;
  if e.kind = 'rent' and e.first_played_at is null then
    update public.entitlements
      set first_played_at = now(), expires_at = now() + make_interval(hours => e.rental_hours)
    where id = e.id returning * into e;
  end if;
  return e;
end $$;

-- ---------------------------------------------------------------------------
-- Pulling a film (D25, D27): stop sales; refunds for buys in the last 30 days are
-- queued; active rentals keep running.
-- ---------------------------------------------------------------------------

create function public.pull_film(f uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  acct uuid;
  n int;
begin
  select account_id into acct from public.films where id = f;
  if not (public.is_account_member(acct) or public.has_role('staff')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.films set status = 'pulled', pulled_at = now() where id = f;
  update public.offers set active = false where film_id = f;
  insert into public.jobs (kind, payload)
  select 'refund_order', jsonb_build_object('order_id', o.id, 'reason', 'Film pulled by filmmaker')
  from public.orders o
  where o.film_id = f and o.kind = 'buy' and o.status = 'paid' and o.paid_at > now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Reviews: buyers only, never credited people or the film's own account (16 CFR 465).
-- ---------------------------------------------------------------------------

create function public.can_review(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o where o.film_id = f and o.viewer_id = auth.uid() and o.status = 'paid')
    and not exists (
      select 1 from public.credits c join public.people p on p.id = c.person_id
      where c.film_id = f and p.claimed_by = auth.uid()
    )
    and not exists (
      select 1 from public.films film where film.id = f and public.is_account_member(film.account_id)
    );
$$;
