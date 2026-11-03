-- Closed beta invites (T020, Gate 2): staff invite filmmakers from the waitlist.
alter table public.waitlist_signups add column if not exists beta_invited_at timestamptz;
alter table public.waitlist_signups add column if not exists beta_invite_token uuid unique;

-- An invite is valid for the signed-in user only if it was sent to their email.
create or replace function public.has_beta_invite() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.waitlist_signups w
    where w.beta_invited_at is not null
      and w.email = (select email from auth.users where id = auth.uid())
  );
$$;
revoke execute on function public.has_beta_invite() from public, anon;
