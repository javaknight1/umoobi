# Deploying Umoobi

Working domain: **https://umoobi.sharkfins.xyz** (D65) until the final name is chosen (D12).
Hosting: Vercel (app + cron) and Supabase (Postgres, Auth). DNS for sharkfins.xyz is on Cloudflare.

## One-time setup

1. **Supabase project** (needs a free slot or Supabase Pro — both free slots are in use).
   ```bash
   supabase projects create umoobi --org-id ejebeclydkmtwzmkqikj --region us-west-1 --db-password "$(bwx generate -ulns --length 24)"
   supabase link --project-ref <ref>
   supabase db push            # applies supabase/migrations
   ```
   Save the DB password, URL, anon key and service-role key to Bitwarden (`Supabase (Umoobi)`, Dev & Cloud).
   Auth settings: site URL `https://umoobi.sharkfins.xyz`, redirect `https://umoobi.sharkfins.xyz/auth/callback`,
   custom SMTP = Resend (Supabase's built-in mail is capped at 2/hour), TOTP MFA on.
   Don't load `supabase/seed.sql` in production.

2. **Vercel project** (`vercel login` first; the stored CLI token has expired).
   ```bash
   vercel link --project umoobi
   vercel env add NEXT_PUBLIC_SITE_URL production     # https://umoobi.sharkfins.xyz
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   vercel env add CRON_SECRET production              # bwx generate -ulns --length 32
   vercel env add RESEND_API_KEY production           # optional until the sending domain is verified
   vercel domains add umoobi.sharkfins.xyz
   vercel --prod
   ```
   Cron (`vercel.json`): the worker runs every minute, which needs Vercel Pro; on Hobby, change it to daily
   and accept slower background jobs during the waitlist phase.

3. **DNS** (Cloudflare, zone sharkfins.xyz): `CNAME umoobi → cname.vercel-dns.com`, DNS only (grey cloud).
   The wildcard `*.sharkfins.xyz` points at the droplet, so the explicit record must exist.

4. **Email**: verify `umoobi.sharkfins.xyz` (or the final domain) as a Resend sending domain; set `EMAIL_FROM`.

## Without Stripe, Mux or Sightengine

Production refuses the dev providers (they're only allowed outside production or with `ALLOW_DEV_PROVIDERS=true`).
For a waitlist-only launch that's fine: the landing page, waitlist, confirmation email, Vimeo guide, legal pages
and staff waitlist view need only Supabase and Resend. Don't set `ALLOW_DEV_PROVIDERS` in production.

## After each deploy

- `supabase db push` for new migrations before `vercel --prod`.
- Check `/api/cron/worker` returns 401 without the secret.
- Update the blog (`src/pages/apps.astro`, `INFRA.md`) and run `/fleet-sync` when hosting or costs change.
