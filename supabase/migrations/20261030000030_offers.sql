-- Replace a film's offers in one transaction (pricing tab). Runs as the caller, so RLS
-- limits it to the film's own account; the offers_rules trigger enforces price floors.
create or replace function public.set_film_offers(
  f uuid, p_rent_cents int, p_rent_hours int, p_buy_cents int
) returns setof public.offers
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.can_manage_film(f) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p_rent_cents is null and p_buy_cents is null then
    raise exception 'Turn on rent, buy or both' using errcode = 'check_violation';
  end if;
  update public.offers set active = false where film_id = f and active;
  if p_rent_cents is not null then
    insert into public.offers (film_id, kind, price_cents, rental_hours) values (f, 'rent', p_rent_cents, p_rent_hours);
  end if;
  if p_buy_cents is not null then
    insert into public.offers (film_id, kind, price_cents) values (f, 'buy', p_buy_cents);
  end if;
  return query select * from public.offers where film_id = f and active order by kind desc;
end $$;

grant execute on function public.set_film_offers(uuid, int, int, int) to authenticated;
