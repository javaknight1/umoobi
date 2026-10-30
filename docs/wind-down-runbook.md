# Wind-down runbook (internal, best effort — D47)

The terms promise nothing if Umoobi closes (D41). This is what we intend to do anyway. A lawyer should review
the terms so this reads as intent, not a promise.

## Before: keep it possible

- Keep a cash reserve of about 3 months of running costs (about $650 in beta, about $6,700 at base case).
- Keep this runbook and the export scripts working: test them at every quarterly review.

## Steps

1. **Decide and date it.** Pick the closing date, aiming for 30 days' notice. Record it in Notion (Umoobi → Decisions).
2. **Tell everyone.** Email every filmmaker and every buyer on the same day (Resend broadcast from the `profiles` +
   `filmmaker_accounts` lists). Put a banner on every page.
3. **Stop new sales that day.** Set every offer inactive:
   `update offers set active = false;` and turn off sign-ups for filmmakers. Active rentals keep running until
   they expire.
4. **Final payouts.** After the last refund window closes (30 days, D27), run the payout job for every account's
   full `available_balance_cents` including released reserves. Keep the Stripe account open until year-end tax forms
   (1099-K via Stripe Connect) are filed.
5. **Filmmaker exports.** Make sure each filmmaker can download: statements and sales CSV (`/studio/money`), tax
   forms (Stripe Express dashboard), credits, posters and subtitles. Masters stay theirs: remind them to keep their
   own copies; Mux assets are deleted after the close.
6. **"Where to watch next".** Let each filmmaker post one link per film; Umoobi emails it to that film's buyers from
   Umoobi's own address, so no buyer identity is handed over (VPPA). Only buyers who consented under D38 appear in a
   filmmaker's buyer list.
7. **Downloads (V1 only).** If a filmmaker allowed downloads, give buyers a download window before the close.
8. **Shut down.** Delete Mux assets, export and archive the database (encrypted, kept for the tax retention period),
   purge viewing history (VPPA: within a year of closing), close vendor accounts, and leave a static notice page.

## Owners

Rob runs every step. Stripe, Mux, Supabase and Vercel credentials are in Bitwarden (Dev & Cloud folder).
