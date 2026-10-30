# CLAUDE.md
@AGENTS.md

Umoobi: US marketplace where vetted indie filmmakers rent and sell films.
Stack: TypeScript, Next.js (App Router), Tailwind, Supabase (Postgres, Auth, Queues), Vercel, Stripe, Mux.

Specs live in Notion under Apps / All Apps / Umoobi: MVP Proposal, Technical Requirements, Market & Competition, Decisions.

Rules:
- Money is integer cents. Ledger entries are append-only; every order's entries sum to its total.
- Never add third-party tracking scripts to film or watch pages (VPPA). Analytics are first-party and aggregated.
- Every purchase stores license_ack_at (AB 2426).
- Pricing rules live in Postgres functions: $0.99 floor, free only under 300 s, free footage <= 15% of runtime.
- A film can't publish without an AI declaration; an AI-scan flag on an undeclared film blocks or hides it until staff decide.
- RLS on every table; the service-role key is used only in workers.
- Decisions are tracked by ID (D1...) in the Notion Decisions page; cite them in PRs.
- No code from the old Umoobi repos in ~/repositories/projects/_families/umoobi (D1).

Commands: pnpm dev | pnpm test | pnpm e2e | supabase db reset
