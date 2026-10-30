# Umoobi Build Progress Tracker

**Last Updated:** 2026-10-30
**Total Tasks:** T001–T033 (20 build tasks mapped to N1–N12 and spikes S1–S7, 13 ops tasks)
**Current Task:** T001 — Foundations
**Current Sprint:** S1 (Foundation + waitlist) — In Progress
**Next Milestone:** Waitlist live by 2026-11-13 (before Vimeo On Demand storefronts go offline 2026-11-20); Gate 1 on 2027-07-30

Specs: Notion → Apps / All Apps / Umoobi (Decisions, MVP Proposal, Technical Requirements, Market & Competition).
Decisions are cited by ID (D1…). Every T-ID matches a row in Notion Tasks (Ref column).

## Task Index

| ID | Sprint | Priority | Type | Title | Description |
|---|---|---|---|---|---|
| T001 | S1 | P0 | Setup | Foundations (N1) | Repo, Supabase schema + RLS + rules, clients, auth, roles, CI |
| T002 | S1 | P0 | Frontend | Landing page and waitlist (N11a) | Landing, waitlist form, double opt-in, Vimeo guide, staff view |
| T003 | S1 | P0 | Setup | Spike S1: Stripe platform approval | Apply as a content-creation platform; Connect + Tax marketplace |
| T004 | S2 | P0 | Auth | Filmmaker onboarding and vetting (N2) | 3-step wizard, Stripe Identity, Connect onboarding, score, caps |
| T005 | S2 | P1 | Testing | Spike S2: large uploads to Mux | 100+ GB resumable browser uploads |
| T006 | S2 | P0 | Backend | Upload and encoding (N3) | Mux direct upload, webhooks, assets, film details, subtitles |
| T007 | S2 | P1 | AI | Spike S4: content scan accuracy | Sightengine nudity + AI-generated on 50 films |
| T008 | S2 | P1 | Testing | Spike S5: TMDB rights match | Commercial terms, match quality, Wikidata fallback |
| T009 | S2 | P0 | Backend | Automatic checks and review queue (N4) | Frame sampling, scans, AI declaration, TMDB, score, staff queue, strikes |
| T010 | S3 | P0 | Frontend | Film and people pages (N5) | Film page, AI label, trailers/clips, credits + shares, person pages, claims |
| T011 | S3 | P0 | Payments | Pricing, checkout, library (N6) | Offers, Stripe Checkout + Tax, license ack, entitlements, rental clock, receipts |
| T012 | S3 | P1 | Testing | Spike S3: Cast and AirPlay with DRM | Custom receiver, FairPlay, Chrome on iOS |
| T013 | S3 | P0 | Frontend | Player and casting (N7) | Mux Player, signed playback, resume, Cast receiver, AirPlay, subtitles |
| T014 | S4 | P0 | Feature | Discovery and social (N8) | Shelves, search, hide-AI filter, follows, reviews, lists, report link |
| T015 | S4 | P1 | Testing | Spike S7: analytics without identity | Drop-off and sources from session-keyed events |
| T016 | S4 | P0 | Feature | Filmmaker portal (N9) | Ledger, statement, monthly payouts, CSV, tax forms, analytics roll-ups |
| T017 | S4 | P1 | Testing | Spike S6: refund math | Transfer reversals after payout, 10% reserve, reconciliation |
| T018 | S5 | P0 | Backend | Pull, refunds, takedowns (N10) | Pull flow, 30-day refunds, DMCA intake + timers, payout holds |
| T019 | S5 | P0 | Feature | Emails, legal pages, sharing (N11b) | Transactional email, terms/license/privacy/AI policy, consent, share cards, runbook |
| T020 | S5 | P0 | Testing | Hardening and beta (N12) | Security review, reconciliation job, load test, DRM plan, beta onboarding |
| T021 | S5 | P0 | Testing | Gate 1: 20 test sales reconcile | Statements, tax and payouts to the cent |
| T022 | S5 | P0 | Config | Switch on DRM (D44) | Widevine + FairPlay before public launch |
| T023 | S5 | P0 | Launch | Gate 2: closed beta | 10 filmmakers, 50 sales, tested refund, zero payout errors |
| T024 | S1 | P0 | Setup | Domain and final name (D12) | Confirm umoobi.com or pick a name |
| T025 | S1 | P1 | Config | Confirm proposed decisions | Especially D34, D35, D37 and D48+ |
| T026 | S3 | P1 | Config | Apple Developer + FairPlay certificate | Needed for D44 |
| T027 | S3 | P1 | Config | Register Google Cast receiver | $5 app id |
| T028 | S5 | P1 | Setup | Register DMCA agent | Copyright Office, $6 |
| T029 | S5 | P0 | Launch | Lawyer and CPA review | VPPA, DMCA, sales tax, splits |
| T030 | S1 | P2 | Setup | Mockup images into the MVP Proposal | From the Claude Doc version |
| T031 | S1 | P1 | Setup | Pick a pilot filmmaker | Tools, prices, view on accounts (D9) |
| T032 | S1 | P1 | Setup | Interview 20 Vimeo On Demand sellers | By 2026-12-15 |
| T033 | S2 | P1 | Launch | 300 filmmakers on the waitlist | By 2027-01-31 |

N-phase mapping: N1 → T001 · N11a → T002 · N2 → T004 · N3 → T006 · N4 → T009 · N5 → T010 · N6 → T011 · N7 → T013 · N8 → T014 · N9 → T016 · N10 → T018 · N11b → T019 · N12 → T020 · S1 → T003 · S2 → T005 · S3 → T012 · S4 → T007 · S5 → T008 · S6 → T017 · S7 → T015.

---

## T001 — Foundations

**Sprint**: S1 · **Priority**: P0 · **Type**: Setup · **Hours**: 40 · **Depends on**: — · **Ref**: N1 · **v1 Gate**: Yes

**What it is**: The base app: Next.js 16 + Tailwind, local Supabase, the full schema with RLS and DB-enforced rules, Supabase clients, sign-in, roles, CI.

**What it does**: `supabase/migrations/*` (core tables, rules functions, RLS), `supabase/tests/*.sql` (pgTAP), `src/lib/supabase/{client,server,admin}.ts`, `src/proxy.ts` (session refresh + guarded routes), `/sign-in`, `/auth/callback`, `/auth/sign-out`, roles in `profiles.roles`, `.github/workflows/ci.yml`.

**Why we need it**: Every later task reads Postgres through RLS and depends on the money and pricing rules living in the database.

**Commit message:** `feat: foundations — schema, RLS, rules, auth, CI`
**Verification:** `supabase db reset && supabase test db`, `pnpm type-check && pnpm lint && pnpm test && pnpm build`.
**README update:** setup, ports, commands.

- [x] Repo and Next.js app (TypeScript, Tailwind, App Router, src/)
- [x] CLAUDE.md, README.md, TODO.md
- [x] Local Supabase on ports 55420–55429 (API 55421, DB 55422, Studio 55423, Mailpit 55424); dev server on 3100
- [x] Core schema migration (profiles, waitlist, accounts, films, assets, offers, people, credits, orders, ledger, payouts, entitlements, trust & safety, social, analytics, jobs)
- [x] Rules migration (price floor, free-under-5-min, free footage, caps, splits, publish blockers, fee, record_sale/refund, balance, rental clock, pull, can_review)
- [x] RLS on every table
- [x] pgTAP tests for rules and RLS
- [x] Supabase clients (browser, server, admin) and `proxy.ts`
- [x] Email magic-link sign-in, callback, sign-out; birth-year gate (COPPA)
- [ ] Google and Apple sign-in config (needs OAuth clients — blocked)
- [x] Vitest + type-check scripts; GitHub Actions CI
- [ ] GitHub remote (blocked: repo creation was not permitted this run)
- [ ] Cloud Supabase project and Vercel project (blocked: needs Rob)

## T002 — Landing page and waitlist

**Sprint**: S1 · **Priority**: P0 · **Type**: Frontend · **Hours**: 10 · **Depends on**: T001 · **Ref**: N11a · **v1 Gate**: Yes

**What it is**: The first public slice (D33): landing page for filmmakers first, viewers second; waitlist with double opt-in; Vimeo On Demand migration guide; staff view.

**What it does**: `/` landing (fee math on a real sale, cost comparison), `/waitlist` server action into `waitlist_signups`, confirmation email through `src/lib/email` (Resend, console fallback), `/waitlist/confirm?token=`, `/guides/leaving-vimeo-on-demand`, `/staff/waitlist` (count, sources, CSV at `/staff/waitlist/export`). First-party counts only.

**Why we need it**: Vimeo On Demand takes storefronts offline 2026-11-20; filmmakers need to find Umoobi before then.

**Commit message:** `feat: landing page and waitlist`
**Verification:** Playwright: sign up → confirmation email in Mailpit/console → confirm link → staff count increments.
**README update:** Waitlist and email env vars.

- [ ] Design tokens (light filmmaker side, dark viewer side)
- [ ] Landing page with fee math and cost comparison
- [ ] Waitlist form (email, role, film title, feature/short, where they sell, trailer link, unticked launch-emails box)
- [ ] Double opt-in email and confirm route
- [ ] Vimeo On Demand migration guide
- [ ] Founding offer block behind `FOUNDING_OFFER` flag (D35 Proposed)
- [ ] Staff view + CSV export
- [ ] Production deploy and domain (blocked on T024 + Vercel)

## T003 — Spike S1: Stripe platform approval

**Sprint**: S1 · **Priority**: P0 · **Type**: Setup · **Hours**: 2 · **Depends on**: — · **Ref**: S1 · **v1 Gate**: Yes

**What it is**: Applying for Stripe's approval as a content-creation platform using separate charges and transfers with Tax in marketplace mode (D45).
**What it does**: Rob submits the platform profile in the Stripe Dashboard; code is built against test mode meanwhile.
**Why we need it**: An account restriction would stop all sales.
**Commit message:** `docs: record Stripe platform approval outcome`
**Verification:** Stripe confirms the platform profile.
**README update:** none.

- [ ] Stripe account for Umoobi (blocked: needs Rob)
- [ ] Platform profile submitted

## T004 — Filmmaker onboarding and vetting

**Sprint**: S2 · **Priority**: P0 · **Type**: Auth · **Hours**: 40 · **Depends on**: T001 · **Ref**: N2 · **v1 Gate**: Yes

**What it is**: The three-step filmmaker application: about you → automatic ID and past-work check → payout account.
**What it does**: `/filmmakers/apply` wizard, `POST /api/filmmaker/apply`, Stripe Identity session, Stripe Connect (Accounts v2, Stripe-hosted onboarding), `POST /api/webhooks/stripe` handlers for identity and account updates, vetting score in `src/lib/vetting/account.ts` (80+ approve, 50–79 review, <50 reject), cap display.
**Why we need it**: Only vetted filmmakers can upload (D3, D11).
**Commit message:** `feat: filmmaker onboarding and automated vetting`
**Verification:** unit tests for the score; e2e with the dev provider.
**README update:** Stripe env vars and `stripe listen`.

- [ ] Account vetting score (unit tested)
- [ ] Wizard UI (3 steps) + apply action
- [ ] Payments provider interface with dev fake + Stripe implementation (Identity, Connect onboarding)
- [ ] Stripe webhook route (signature verified, idempotent via `webhook_events`)
- [ ] Tier upgrade job (90+ days, 10+ sales, no strikes → established)
- [ ] Real Stripe test keys (blocked: T003)

## T005 — Spike S2: large uploads to Mux

**Sprint**: S2 · **Priority**: P1 · **Type**: Testing · **Hours**: 6 · **Depends on**: — · **Ref**: S2 · **v1 Gate**: No

**What it is**: Proving a 100+ GB ProRes master uploads reliably from a browser to Mux.
**What it does**: UpChunk-based resumable upload with retries and resume after closing the laptop.
**Why we need it**: Feature masters are huge.
**Commit message:** `chore: large-upload spike findings`
**Verification:** written findings in this file.
**README update:** none.

- [ ] Mux account and test environment tokens (blocked: needs Rob)
- [ ] Run and record findings

## T006 — Upload and encoding

**Sprint**: S2 · **Priority**: P0 · **Type**: Backend · **Hours**: 35 · **Depends on**: T004 · **Ref**: N3 · **v1 Gate**: Yes

**What it is**: Creating a film, uploading the master/trailers/clips to Mux, and tracking encoding.
**What it does**: `/studio/films/new`, `POST /api/films`, `PATCH /api/films/:id`, `POST /api/films/:id/uploads` (Mux direct upload URL), `POST /api/webhooks/mux`, film details form, subtitle upload, cap check (D13).
**Why we need it**: Nothing sells without an encoded film.
**Commit message:** `feat: film upload and encoding with Mux`
**Verification:** DB tests for caps and footage limits; e2e with the dev video provider.
**README update:** Mux env vars.

- [ ] Video provider interface with dev fake + Mux implementation
- [ ] Film create/edit (details, AI declaration, rights statement)
- [ ] Upload URLs + resumable uploader (UpChunk)
- [ ] Mux webhook (asset ready → duration, playback id; enqueue checks)
- [ ] Subtitles (WebVTT upload)

## T007 — Spike S4: content scan accuracy

**Sprint**: S2 · **Priority**: P1 · **Type**: AI · **Hours**: 8 · **Depends on**: T009 · **Ref**: S4 · **v1 Gate**: No

**What it is**: Measuring Sightengine nudity and AI-generated detection on 50 sample films.
**What it does**: Sets block and review thresholds in `src/lib/vetting/film.ts`.
**Why we need it**: False positives hide real films; misses break Stripe's rules.
**Commit message:** `chore: content scan thresholds from spike`
**Verification:** findings table here.
**README update:** none.

- [ ] Sightengine account (blocked: needs Rob, $29–99/mo)
- [ ] Run on 50 films, record thresholds

## T008 — Spike S5: TMDB rights match

**Sprint**: S2 · **Priority**: P1 · **Type**: Testing · **Hours**: 4 · **Depends on**: — · **Ref**: S5 · **v1 Gate**: No

**What it is**: Confirming TMDB's commercial terms and match quality on title, runtime and credits; Wikidata fallback.
**What it does**: `src/lib/rights/tmdb.ts` matcher with tests.
**Why we need it**: Catches uploads of known commercial releases (D36).
**Commit message:** `feat: TMDB rights matcher`
**Verification:** unit tests on match scoring.
**README update:** TMDB env var.

- [ ] Matcher + scoring
- [ ] Commercial license terms (blocked: needs Rob to ask TMDB)

## T009 — Automatic checks and review queue

**Sprint**: S2 · **Priority**: P0 · **Type**: Backend · **Hours**: 56 · **Depends on**: T006 · **Ref**: N4 · **v1 Gate**: Yes

**What it is**: The film vetting pipeline and the staff review queue.
**What it does**: Worker job `check_film`: sample Mux thumbnails every 5 s, Sightengine nudity + AI-generated, TMDB match, rights statement, ID-verified account → score; ≥80 ready, 50–79 review item, <50 reject. AI flag on undeclared film blocks/hides (D46). `/staff/review` approve / reject / ask for proof. Strikes.
**Why we need it**: No person reviews unless checks are unsure (D11).
**Commit message:** `feat: automatic film checks and staff review queue`
**Verification:** unit tests for the score; DB tests for publish blockers.
**README update:** worker and cron.

- [ ] Job queue + worker route (`/api/cron/worker`, `CRON_SECRET`)
- [ ] Film score function (unit tested)
- [ ] Content scanner interface with dev fake + Sightengine implementation
- [ ] Staff review queue UI + actions (audit logged)
- [ ] Strikes

## T010 — Film and people pages

**Sprint**: S3 · **Priority**: P0 · **Type**: Frontend · **Hours**: 60 · **Depends on**: T009 · **Ref**: N5 · **v1 Gate**: Yes

**What it is**: The shareable film page and public cast and crew pages.
**What it does**: `/f/[slug]` (trailer, synopsis, credits, rent/buy, license statement, reviews, AI label), `/p/[slug]` person pages, `/studio/films/[id]/credits` editor with shares (sum 100%), invite + claim (`POST /api/people/:id/invite|claim`), OG metadata.
**Why we need it**: The film page is the link filmmakers share (D8).
**Commit message:** `feat: film and people pages`
**Verification:** e2e on seeded films; DB test for share sum.
**README update:** none.

- [ ] Film page
- [ ] Person page + follow
- [ ] Credits editor + shares
- [ ] Invite and claim
- [ ] Trailers/clips management with limits

## T011 — Pricing, checkout, library

**Sprint**: S3 · **Priority**: P0 · **Type**: Payments · **Hours**: 60 · **Depends on**: T010 · **Ref**: N6 · **v1 Gate**: Yes

**What it is**: Offers, Stripe hosted Checkout with Tax, license acknowledgment, entitlements and the viewer library.
**What it does**: `/studio/films/[id]/pricing`, `PUT /api/films/:id/offers`, `POST /api/checkout` (license ack required for buy, D39), webhook `checkout.session.completed` → `record_sale`, `/library`, receipts email.
**Why we need it**: This is how anyone gets paid.
**Commit message:** `feat: pricing, checkout and viewer library`
**Verification:** DB tests on ledger sums; e2e buy with dev provider.
**README update:** Stripe Tax codes.

- [ ] Pricing editor with per-sale net preview
- [ ] Checkout route + dev provider
- [ ] Webhook → record_sale (+ actual fee from balance transaction)
- [ ] Library (rentals with time left, purchases, history, resume)
- [ ] Receipts email

## T012 — Spike S3: Cast and AirPlay with DRM

**Sprint**: S3 · **Priority**: P1 · **Type**: Testing · **Hours**: 10 · **Depends on**: T026, T027 · **Ref**: S3 · **v1 Gate**: No

**What it is**: Custom Web Receiver playing Mux Widevine; AirPlay with FairPlay from Safari.
**What it does**: Findings + receiver page `/cast/receiver`.
**Why we need it**: Cast plays DRM only through a custom receiver.
**Commit message:** `chore: Cast and AirPlay DRM spike`
**Verification:** findings here.
**README update:** none.

- [ ] Cast app id and FairPlay cert (blocked: T026, T027)

## T013 — Player and casting

**Sprint**: S3 · **Priority**: P0 · **Type**: Frontend · **Hours**: 45 · **Depends on**: T011 · **Ref**: N7 · **v1 Gate**: Yes

**What it is**: The watch page.
**What it does**: `/watch/[slug]`, `POST /api/playback/:filmId/token` (entitlement check, start rental clock, signed Mux tokens, 6 h expiry), Mux Player with AirPlay and Chromecast, resume (`watch_progress`), `POST /api/playback/events` (session-keyed heartbeats).
**Why we need it**: Viewers have to be able to watch.
**Commit message:** `feat: player, playback tokens and casting`
**Verification:** DB tests for rental clock; e2e watch with dev provider.
**README update:** Mux signing keys.

- [ ] Playback token route + signing
- [ ] Watch page with Mux Player, resume, subtitles
- [ ] Session-keyed playback events
- [ ] Custom Cast receiver (blocked on T012 for DRM)

## T014 — Discovery and social

**Sprint**: S4 · **Priority**: P0 · **Type**: Feature · **Hours**: 60 · **Depends on**: T013 · **Ref**: N8 · **v1 Gate**: Yes

**What it is**: Discover shelves, search, follows, reviews, lists, report link.
**What it does**: `/discover` (trending, new this week, genres, shorts, because-you-watched; staff shelves), `/search` (Postgres FTS + trigram), hide-AI filter, `POST /api/follows|reviews|lists`, `POST /api/films/:id/reports`.
**Why we need it**: Discovery brings sales beyond the filmmaker's own fans (D8).
**Commit message:** `feat: discovery, search, follows, reviews and lists`
**Verification:** DB tests for review eligibility; e2e search.
**README update:** none.

- [ ] Discover shelves
- [ ] Search
- [ ] Follows, reviews, lists
- [ ] Report undisclosed AI (hides film when reason is AI, D46)

## T015 — Spike S7: analytics without identity

**Sprint**: S4 · **Priority**: P1 · **Type**: Testing · **Hours**: 4 · **Depends on**: T013 · **Ref**: S7 · **v1 Gate**: No

**What it is**: Drop-off curves and source attribution from session-keyed events only.
**What it does**: Nightly roll-up SQL into `film_daily_stats`.
**Why we need it**: VPPA (D38).
**Commit message:** `feat: nightly analytics roll-up`
**Verification:** SQL test on synthetic events.
**README update:** none.

- [ ] Roll-up function + test

## T016 — Filmmaker portal

**Sprint**: S4 · **Priority**: P0 · **Type**: Feature · **Hours**: 70 · **Depends on**: T014 · **Ref**: N9 · **v1 Gate**: Yes

**What it is**: The filmmaker's dashboard, money and analytics.
**What it does**: `/studio` dashboard (30-day sales, earned, next payout), `/studio/money` (line-by-line ledger, CSV), `/studio/analytics` (funnel, sources, states, drop-off, completion), monthly payout job (Stripe transfers), tax forms via Stripe Connect.
**Why we need it**: D30.
**Commit message:** `feat: filmmaker portal money, payouts and analytics`
**Verification:** DB tests on balance and payouts; unit tests on CSV.
**README update:** none.

- [ ] Dashboard
- [ ] Money + CSV
- [ ] Analytics
- [ ] Monthly payout job

## T017 — Spike S6: refund math

**Sprint**: S4 · **Priority**: P1 · **Type**: Testing · **Hours**: 6 · **Depends on**: T016 · **Ref**: S6 · **v1 Gate**: No

**What it is**: Reversing transfers after payout and sizing the 10% reserve (D37).
**What it does**: DB tests for refund-after-payout producing a negative balance carried forward.
**Why we need it**: Separate charges and transfers don't reverse automatically.
**Commit message:** `test: refund math after payouts`
**Verification:** tests pass.
**README update:** none.

- [ ] Refund-after-payout tests

## T018 — Pull, refunds, takedowns

**Sprint**: S5 · **Priority**: P0 · **Type**: Backend · **Hours**: 35 · **Depends on**: T016 · **Ref**: N10 · **v1 Gate**: Yes

**What it is**: Pulling a film, automatic refunds, DMCA handling, payout holds.
**What it does**: `POST /api/films/:id/pull` → `pull_film`, `refund_order` jobs (Stripe refund + transfer reversal), `/dmca` intake form, `POST /api/staff/takedowns`, counter-notice timer (10–14 business days), repeat-infringer strikes, staff payout holds.
**Why we need it**: D25, D27, DMCA safe harbor.
**Commit message:** `feat: pulling films, refunds and takedowns`
**Verification:** DB tests on pull and refunds; unit tests on business-day timer.
**README update:** none.

- [ ] Pull flow
- [ ] Refund job
- [ ] DMCA intake + staff tools + timers
- [ ] Payout holds

## T019 — Emails, legal pages, sharing

**Sprint**: S5 · **Priority**: P0 · **Type**: Feature · **Hours**: 20 · **Depends on**: T018 · **Ref**: N11b · **v1 Gate**: Yes

**What it is**: Transactional emails, terms, license, privacy, AI policy, VPPA consent form, share cards, wind-down runbook (D47).
**What it does**: `/legal/terms`, `/legal/license`, `/legal/privacy`, `/legal/ai-policy`, `/settings/sharing` (consents), OG images, `docs/wind-down-runbook.md`.
**Why we need it**: Required before real money.
**Commit message:** `feat: emails, legal pages, share cards and runbook`
**Verification:** e2e consent give/withdraw.
**README update:** none.

- [ ] Legal pages (drafts pending lawyer, T029)
- [ ] Consent form
- [ ] Share cards
- [ ] Wind-down runbook

## T020 — Hardening and beta

**Sprint**: S5 · **Priority**: P0 · **Type**: Testing · **Hours**: 40 · **Depends on**: T019 · **Ref**: N12 · **v1 Gate**: Yes

**What it is**: Security review, reconciliation job, load test, DRM switch-on plan, beta onboarding.
**What it does**: nightly `reconcile` job (Stripe balance vs ledger, `order_ledger_mismatches()`), staff 2FA enforcement, security review notes, beta invite flow from the waitlist.
**Why we need it**: Gate 1 and Gate 2.
**Commit message:** `chore: hardening and beta readiness`
**Verification:** full test suite + reconciliation test.
**README update:** runbooks.

- [ ] Reconciliation job
- [ ] Staff 2FA (TOTP, aal2 required for /staff)
- [ ] Security review
- [ ] Beta invites

## T021 — Gate 1: 20 test sales reconcile

**Sprint**: S5 · **Priority**: P0 · **Type**: Testing · **Hours**: — · **Depends on**: T016 · **Ref**: Gate 1 · **v1 Gate**: Yes
**What it is / does**: 20 test-mode rentals and purchases reconcile to the cent across statements, tax and payouts. **Why**: before any real money. **Commit message:** `test: gate 1 reconciliation` **Verification:** report attached here. **README update:** none.
- [ ] Automated 20-sale reconciliation test against local DB
- [ ] Same in Stripe test mode (blocked: T003)

## T022 — Switch on DRM

**Sprint**: S5 · **Priority**: P0 · **Type**: Config · **Hours**: 4 · **Depends on**: T026, T020 · **Ref**: D44 · **v1 Gate**: Yes
**What it is / does**: Enable Mux DRM (Widevine + FairPlay) via `MUX_DRM_ENABLED`. **Why**: before public launch. **Commit message:** `feat: enable DRM` **Verification:** playback on Chrome, Safari, Cast. **README update:** DRM config.
- [ ] DRM code path behind flag
- [ ] Certificates (blocked: T026)

## T023 — Gate 2: closed beta

**Sprint**: S5 · **Priority**: P0 · **Type**: Launch · **Ref**: Gate 2 · **Depends on**: T020, T022 · **v1 Gate**: Yes
**What it is / does**: 10 beta filmmakers, 50 real sales, a tested pull-and-refund, zero payout errors. **Why**: public launch gate. **Commit message:** — **Verification:** metrics. **README update:** none.
- [ ] Needs Rob (real filmmakers, live mode)

## T024 — Domain and final name (D12)

**Sprint**: S1 · **Priority**: P0 · **Type**: Setup · **Ref**: D12 · Rob checks GoDaddy for umoobi.com (registered 2015-04-27, expires 2027-08-01, privacy on) or picks a name. The code reads `NEXT_PUBLIC_SITE_URL`, so the name/domain is one env change plus copy.
- [ ] Needs Rob

## T025 — Confirm proposed decisions

**Sprint**: S1 · **Priority**: P1 · **Type**: Config · **Ref**: Decisions · Confirm D13, D23, D27, D34–D39, D43–D47 and the D48+ added during autobuild.
- [ ] Needs Rob

## T026 — Apple Developer + FairPlay certificate
**Sprint**: S3 · **Priority**: P1 · **Type**: Config · **Ref**: FairPlay · $99/yr. - [ ] Needs Rob

## T027 — Register Google Cast receiver
**Sprint**: S3 · **Priority**: P1 · **Type**: Config · **Ref**: Cast · $5 one-time. - [ ] Needs Rob

## T028 — Register DMCA agent
**Sprint**: S5 · **Priority**: P1 · **Type**: Setup · **Ref**: DMCA · $6 at copyright.gov. - [ ] Needs Rob

## T029 — Lawyer and CPA review
**Sprint**: S5 · **Priority**: P0 · **Type**: Launch · **Ref**: Legal · VPPA consent, DMCA, sales-tax registrations incl. Hawaii GET, splits as royalties or wages. - [ ] Needs Rob

## T030 — Mockup images into the MVP Proposal
**Sprint**: S1 · **Priority**: P2 · **Type**: Setup · **Ref**: Docs. - [ ] Needs Rob (Notion file upload)

## T031 — Pick a pilot filmmaker
**Sprint**: S1 · **Priority**: P1 · **Type**: Setup · **Ref**: Pilot. - [ ] Needs Rob

## T032 — Interview 20 Vimeo On Demand sellers
**Sprint**: S1 · **Priority**: P1 · **Type**: Setup · **Ref**: Assumptions. - [ ] Needs Rob

## T033 — 300 filmmakers on the waitlist
**Sprint**: S2 · **Priority**: P1 · **Type**: Launch · **Ref**: Metric. - [ ] Tracks after T002 is live

---

## Blocked — needs Rob

| Task | Needed | How to unblock | Stubbed meanwhile |
|---|---|---|---|
| T001, T002 | GitHub remote | Allow `gh repo create javaknight1/umoobi --private` (it was denied this run), or create it and `git push -u origin main` | Commits are local |
| T001, T002 | Cloud Supabase + Vercel project | Approve a Supabase project (free slots are used) and a Vercel project | Local Supabase |
| T002 | Domain | T024 | `NEXT_PUBLIC_SITE_URL` |
| T003, T004, T011 | Stripe account for Umoobi + test keys | Create the account, save keys to Bitwarden as `Stripe (Umoobi)` | Dev payments provider |
| T005, T006, T013 | Mux account + token + signing key | Sign up, save to Bitwarden as `Mux` | Dev video provider (public test HLS stream) |
| T007, T009 | Sightengine account | Sign up (Starter $29/mo), save to Bitwarden | Dev scanner (always clean, deterministic) |
| T008 | TMDB commercial license terms | Email TMDB | Matcher runs with the existing key |
| T001 | Google + Apple OAuth clients | Create OAuth clients | Email magic link only |

## Resolved Design Decisions

See Notion → Umoobi — Decisions. Added during autobuild (Proposed): D48–D52, listed there.

## Open Questions

- D46: do synthetic voices count as AI-generated?
