-- Staff payout view: every approved account with its available balance, in one query.
create or replace function public.staff_account_balances()
returns table (id uuid, display_name text, payout_hold boolean, payouts_enabled boolean, balance_cents int)
language sql stable security definer set search_path = '' as $$
  select a.id, a.display_name, a.payout_hold, a.payouts_enabled,
    coalesce(sum(l.amount_cents) filter (
      where l.available_on <= current_date
        and l.kind in ('net', 'refund_net', 'reserve_hold', 'reserve_release', 'payout', 'adjustment')), 0)::int
  from public.filmmaker_accounts a
  left join public.ledger_entries l on l.account_id = a.id
  where a.status = 'approved' and public.has_role('staff')
  group by a.id
  order by a.display_name;
$$;
revoke execute on function public.staff_account_balances() from public, anon;
