# Umoobi

Rent and sell your film from one link. A US marketplace where vetted independent filmmakers rent and sell
their films at their own prices, with claimable cast and crew pages and light discovery.

Specs live in Notion (Apps / All Apps / Umoobi). Build progress: [TODO.md](TODO.md).

## Setup

```bash
pnpm install
supabase start          # local stack on ports 55420–55429
pnpm env:local          # writes .env.local from `supabase status`
pnpm dev                # http://localhost:3100
```

| Local service | URL |
| --- | --- |
| App | http://localhost:3100 |
| Supabase API | http://127.0.0.1:55421 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:55422/postgres |
| Studio | http://127.0.0.1:55423 |
| Mailpit (auth emails) | http://127.0.0.1:55424 |

Without Stripe, Mux, Sightengine or Resend keys the app uses dev providers (D49): payments complete
instantly, video plays a public test stream, scans pass, and emails print to the server console.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3100 |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:db` | Database rules and RLS tests (pgTAP) |
| `pnpm e2e` | Playwright end-to-end tests (needs the local stack) |
| `pnpm type-check` / `pnpm lint` | TypeScript and ESLint |
| `supabase db reset` | Re-apply migrations and seed |
| `pnpm db:types` | Regenerate `src/lib/supabase/database.types.ts` |

## Environments

local → preview (per PR, Stripe test mode) → production. See `.env.example` for every variable.
