-- Umoobi core schema. Money is integer cents throughout. Decision IDs (Dn) refer to
-- the Notion "Umoobi — Decisions" page.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles and roles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  birth_year int check (birth_year between 1900 and 2100),
  roles text[] not null default array['viewer']::text[]
    check (roles <@ array['viewer', 'filmmaker', 'staff', 'admin']::text[]),
  created_at timestamptz not null default now()
);

-- New auth users get a profile row. COPPA: under-13s are blocked at sign-up in the
-- app; birth_year is also re-checked here when it is supplied in user metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  byear int := nullif(new.raw_user_meta_data ->> 'birth_year', '')::int;
begin
  if byear is not null and extract(year from now())::int - byear < 13 then
    raise exception 'Umoobi accounts are for people 13 and over';
  end if;
  insert into public.profiles (id, display_name, birth_year)
  values (new.id, new.raw_user_meta_data ->> 'display_name', byear);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.has_role(r text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (r = any (p.roles) or 'admin' = any (p.roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- Waitlist (N11a)
-- ---------------------------------------------------------------------------

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique,
  role text not null check (role in ('filmmaker', 'viewer', 'cast_crew')),
  film_title text,
  film_kind text check (film_kind in ('feature', 'short')),
  sells_today text,
  trailer_url text,
  launch_emails boolean not null default false,
  source text,
  confirm_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Filmmaker accounts (the tenant)
-- ---------------------------------------------------------------------------

create table public.filmmaker_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  display_name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  legal_name text,
  website text,
  past_work text,
  tier text not null default 'new' check (tier in ('new', 'established')),
  status text not null default 'applying'
    check (status in ('applying', 'review', 'approved', 'rejected', 'suspended')),
  vetting_score int check (vetting_score between 0 and 100),
  stripe_account_id text unique,
  identity_session_id text,
  identity_status text not null default 'none'
    check (identity_status in ('none', 'pending', 'verified', 'requires_input', 'canceled')),
  payouts_enabled boolean not null default false,
  fee_bps int not null default 1000 check (fee_bps between 0 and 5000),   -- D2
  founding_rate_until date,                                                -- D35
  payout_hold boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create unique index filmmaker_accounts_owner on public.filmmaker_accounts (owner_id);

-- Empty until team accounts in V2 (D26).
create table public.account_members (
  account_id uuid not null references public.filmmaker_accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  primary key (account_id, user_id)
);

create function public.is_account_member(a uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.filmmaker_accounts f where f.id = a and f.owner_id = auth.uid())
      or exists (select 1 from public.account_members m where m.account_id = a and m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Films, assets, offers
-- ---------------------------------------------------------------------------

create table public.films (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.filmmaker_accounts (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 200),
  synopsis text,
  genre text,
  content_rating text,
  release_year int,
  runtime_seconds int check (runtime_seconds > 0),
  poster_url text,
  status text not null default 'draft'
    check (status in ('draft', 'checking', 'review', 'ready', 'published', 'rejected', 'hidden', 'pulled')),
  vetting_score int check (vetting_score between 0 and 100),
  staff_approved boolean not null default false,
  rejection_reason text,
  ai_generated boolean not null default false,
  ai_declared_at timestamptz,
  ai_flagged boolean not null default false,
  rights_statement_at timestamptz,
  cap_year int not null default extract(year from now())::int,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  pulled_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(genre, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(synopsis, '')), 'C')
  ) stored
);
create index films_account on public.films (account_id);
create index films_search on public.films using gin (search);
create index films_title_trgm on public.films using gin (title extensions.gin_trgm_ops);

-- Feature = 40 minutes or more (D13).
create function public.film_kind(runtime_seconds int) returns text
language sql immutable as $$
  select case when coalesce(runtime_seconds, 0) >= 2400 then 'feature' else 'short' end;
$$;

create table public.film_assets (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films (id) on delete cascade,
  kind text not null check (kind in ('master', 'trailer', 'clip', 'subtitle')),
  label text,
  language text,
  mux_upload_id text unique,
  mux_asset_id text unique,
  mux_playback_id text,
  subtitle_url text,
  status text not null default 'waiting'
    check (status in ('waiting', 'uploading', 'processing', 'ready', 'errored')),
  duration_seconds numeric,
  created_at timestamptz not null default now()
);
create index film_assets_film on public.film_assets (film_id);
create unique index film_assets_one_master on public.film_assets (film_id) where kind = 'master';

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films (id) on delete cascade,
  kind text not null check (kind in ('rent', 'buy')),
  price_cents int not null check (price_cents >= 0),
  rental_hours int check (rental_hours between 1 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((kind = 'rent') = (rental_hours is not null))
);
create unique index offers_one_active_kind on public.offers (film_id, kind) where active;

-- ---------------------------------------------------------------------------
-- People and credits (D7, D15)
-- ---------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  bio text,
  photo_url text,
  claimed_by uuid unique references auth.users (id) on delete set null,
  claimed_at timestamptz,
  invite_token uuid default gen_random_uuid(),
  invite_email text,
  created_by_account uuid references public.filmmaker_accounts (id) on delete set null,
  created_at timestamptz not null default now()
);
create index people_name_trgm on public.people using gin (name extensions.gin_trgm_ops);

create table public.credits (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  role text not null,
  billing_order int not null default 0,
  share_bps int not null default 0 check (share_bps between 0 and 10000),
  unique (film_id, person_id, role)
);

-- ---------------------------------------------------------------------------
-- Orders, ledger, payouts, entitlements
-- ---------------------------------------------------------------------------

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.filmmaker_accounts (id),
  period_start date not null,
  period_end date not null,
  amount_cents int not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'held')),
  stripe_transfer_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (account_id, period_start)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references auth.users (id) on delete restrict,
  offer_id uuid not null references public.offers (id),
  film_id uuid not null references public.films (id),
  account_id uuid not null references public.filmmaker_accounts (id),
  kind text not null check (kind in ('rent', 'buy')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'expired')),
  subtotal_cents int not null check (subtotal_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null default 0 check (total_cents >= 0),
  license_ack_at timestamptz,                              -- AB 2426 (D39)
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  check (kind = 'rent' or license_ack_at is not null),
  check (status <> 'paid' or total_cents = subtotal_cents + tax_cents)
);
create index orders_viewer on public.orders (viewer_id);
create index orders_account on public.orders (account_id, paid_at);

-- Append-only. For each paid order: net + fee + processing + tax = total.
-- Refund entries are negative and keep the same split.
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  order_id uuid references public.orders (id),
  account_id uuid not null references public.filmmaker_accounts (id),
  kind text not null check (kind in ('net', 'fee', 'processing', 'tax', 'refund_net', 'refund_fee',
                                     'refund_processing', 'refund_tax', 'reserve_hold', 'reserve_release',
                                     'payout', 'adjustment')),
  amount_cents int not null,
  payout_id uuid references public.payouts (id),
  available_on date not null default current_date,
  memo text,
  created_at timestamptz not null default now()
);
create index ledger_account on public.ledger_entries (account_id, created_at);
create index ledger_order on public.ledger_entries (order_id);

create function public.ledger_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries is append-only';
end $$;
create trigger ledger_no_update before update or delete on public.ledger_entries
  for each row execute function public.ledger_append_only();

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id),
  viewer_id uuid not null references auth.users (id),
  film_id uuid not null references public.films (id),
  kind text not null check (kind in ('rent', 'buy')),
  rental_hours int,
  first_played_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index entitlements_viewer on public.entitlements (viewer_id, film_id);

-- Resume points: per viewer, per film. Not used for analytics (that's playback_events).
create table public.watch_progress (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  film_id uuid not null references public.films (id) on delete cascade,
  position_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (viewer_id, film_id)
);

-- ---------------------------------------------------------------------------
-- Trust and safety
-- ---------------------------------------------------------------------------

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('account', 'film')),
  account_id uuid references public.filmmaker_accounts (id) on delete cascade,
  film_id uuid references public.films (id) on delete cascade,
  signals jsonb not null default '{}',
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('account', 'film', 'ai_flag', 'report', 'takedown')),
  account_id uuid references public.filmmaker_accounts (id) on delete cascade,
  film_id uuid references public.films (id) on delete cascade,
  score int,
  reason text,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected', 'proof_requested')),
  decided_by uuid references auth.users (id),
  decision_note text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.strikes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.filmmaker_accounts (id) on delete cascade,
  film_id uuid references public.films (id) on delete set null,
  reason text not null check (reason in ('takedown', 'undeclared_ai', 'content', 'other')),
  note text,
  created_at timestamptz not null default now()
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null check (reason in ('undisclosed_ai', 'explicit', 'copyright', 'other')),
  details text,
  created_at timestamptz not null default now()
);

create table public.takedowns (
  id uuid primary key default gen_random_uuid(),
  film_id uuid references public.films (id) on delete set null,
  claimant_name text not null,
  claimant_email text not null,
  work_described text not null,
  infringing_url text not null,
  good_faith boolean not null,
  signature text not null,
  status text not null default 'received'
    check (status in ('received', 'actioned', 'counter_received', 'restored', 'rejected', 'closed')),
  counter_notice text,
  counter_received_at timestamptz,
  restore_after date,       -- 10–14 business days after a valid counter-notice
  created_at timestamptz not null default now()
);

create table public.staff_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users (id),
  action text not null,
  target text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Social and discovery
-- ---------------------------------------------------------------------------

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid references public.people (id) on delete cascade,
  account_id uuid references public.filmmaker_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((person_id is null) <> (account_id is null))
);
create unique index follows_person on public.follows (follower_id, person_id) where person_id is not null;
create unique index follows_account on public.follows (follower_id, account_id) where account_id is not null;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (length(body) <= 5000),
  created_at timestamptz not null default now(),
  unique (film_id, author_id)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  film_id uuid not null references public.films (id) on delete cascade,
  position int not null default 0,
  primary key (list_id, film_id)
);

create table public.shelves (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  position int not null default 0,
  active boolean not null default true
);

create table public.shelf_items (
  shelf_id uuid not null references public.shelves (id) on delete cascade,
  film_id uuid not null references public.films (id) on delete cascade,
  position int not null default 0,
  primary key (shelf_id, film_id)
);

-- Per-filmmaker identity-sharing consent, at most 2 years (D38, VPPA).
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.filmmaker_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 years',
  withdrawn_at timestamptz,
  check (expires_at <= created_at + interval '2 years')
);
create unique index consents_active on public.consents (viewer_id, account_id) where withdrawn_at is null;

-- ---------------------------------------------------------------------------
-- First-party analytics. Session-keyed; never a user id next to a film (D38).
-- ---------------------------------------------------------------------------

create table public.playback_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  film_id uuid not null references public.films (id) on delete cascade,
  position_seconds int not null,
  event text not null check (event in ('start', 'heartbeat', 'pause', 'end')),
  created_at timestamptz not null default now()
);
create index playback_events_film on public.playback_events (film_id, created_at);

create table public.page_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  film_id uuid references public.films (id) on delete cascade,
  event text not null check (event in ('view', 'trailer_play', 'checkout_start', 'purchase')),
  source text,
  region text,
  created_at timestamptz not null default now()
);
create index page_events_film on public.page_events (film_id, created_at);

create table public.film_daily_stats (
  film_id uuid not null references public.films (id) on delete cascade,
  day date not null,
  views int not null default 0,
  trailer_plays int not null default 0,
  checkout_starts int not null default 0,
  purchases int not null default 0,
  plays int not null default 0,
  completions int not null default 0,
  sources jsonb not null default '{}',
  regions jsonb not null default '{}',
  dropoff jsonb not null default '{}',     -- {decile: sessions that stopped there}
  primary key (film_id, day)
);

-- ---------------------------------------------------------------------------
-- Background jobs (worker drains via /api/cron/worker)
-- ---------------------------------------------------------------------------

create table public.jobs (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);
create index jobs_queue on public.jobs (status, run_after);

create table public.webhook_events (
  id text primary key,          -- provider event id, for idempotency
  provider text not null,
  type text not null,
  received_at timestamptz not null default now()
);
