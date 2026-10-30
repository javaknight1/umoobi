-- Postgres grants EXECUTE to PUBLIC by default, which would let any signed-in user call
-- money functions through the API. Only the service role (webhooks, worker) may.

revoke execute on function public.record_sale(uuid, int, int, text, text) from public, anon, authenticated;
revoke execute on function public.record_refund(uuid, text) from public, anon, authenticated;
revoke execute on function public.order_ledger_mismatches() from public, anon, authenticated;
revoke execute on function public.available_balance_cents(uuid, date) from public, anon, authenticated;
revoke execute on function public.films_used(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.publish_blockers(uuid) from public, anon;
revoke execute on function public.pull_film(uuid) from public, anon;
revoke execute on function public.publish_film(uuid) from public, anon;
revoke execute on function public.start_playback(uuid) from public, anon;
grant execute on function public.record_sale(uuid, int, int, text, text), public.record_refund(uuid, text),
  public.order_ledger_mismatches(), public.available_balance_cents(uuid, date), public.films_used(uuid, int, text)
  to service_role;

-- Members read their own balance and cap usage through checked wrappers.
create or replace function public.my_balance_cents(a uuid, on_date date default current_date) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_account_member(a) or public.has_role('staff')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return public.available_balance_cents(a, on_date);
end $$;

create or replace function public.my_films_used(a uuid, yr int, kind text) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_account_member(a) or public.has_role('staff')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return public.films_used(a, yr, kind);
end $$;

revoke execute on function public.my_balance_cents(uuid, date), public.my_films_used(uuid, int, text) from public, anon;
