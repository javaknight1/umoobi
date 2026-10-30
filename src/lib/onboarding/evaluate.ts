import "server-only";
import { payments } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractLinks, namesMatch, scoreAccount } from "@/lib/vetting/account";

const FOUNDING_CUTOFF = "2027-02-01"; // waitlist before Jan 31, 2027 (D35)

/**
 * Refreshes a filmmaker application from Stripe (ID check, payout account) and, once both
 * are done, scores it: approve, send to the staff queue, or reject (D11). Safe to call
 * repeatedly; the webhook, the return URLs and the worker all call it.
 */
export async function evaluateAccount(accountId: string): Promise<void> {
  const db = createAdminClient();
  const { data: acct } = await db.from("filmmaker_accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acct) return;

  const p = payments();
  let identityStatus = acct.identity_status;
  let verifiedName: string | null = null;
  if (acct.identity_session_id) {
    const r = await p.getIdentity(acct.identity_session_id);
    identityStatus = r.status;
    verifiedName = r.verifiedName;
  }
  const payoutsReady = acct.stripe_account_id ? await p.payoutsReady(acct.stripe_account_id) : false;
  await db
    .from("filmmaker_accounts")
    .update({ identity_status: identityStatus, payouts_enabled: payoutsReady })
    .eq("id", accountId);

  if (acct.status !== "applying") return; // staff own it from here
  if (identityStatus !== "verified" || !payoutsReady) return;

  const { data: owner } = await db.auth.admin.getUserById(acct.owner_id);
  const email = owner.user?.email ?? null;
  const scored = scoreAccount({
    identityVerified: true,
    nameMatches: namesMatch(acct.legal_name, verifiedName),
    pastWorkLinks: extractLinks(acct.past_work),
    website: acct.website,
    email,
    payoutsReady,
  });

  await db.from("verifications").insert({
    subject: "account",
    account_id: accountId,
    score: scored.score,
    signals: { reasons: scored.reasons },
  });

  if (scored.decision === "approve") {
    await approveAccount(accountId, scored.score, email);
  } else if (scored.decision === "review") {
    await db.from("filmmaker_accounts").update({ status: "review", vetting_score: scored.score }).eq("id", accountId);
    await db.from("review_items").insert({
      kind: "account",
      account_id: accountId,
      score: scored.score,
      reason: scored.reasons.join("; "),
      due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  } else {
    await db.from("filmmaker_accounts").update({ status: "rejected", vetting_score: scored.score }).eq("id", accountId);
  }
}

/** Approves an account: grants the filmmaker role and applies the founding rate when on. */
export async function approveAccount(accountId: string, score: number | null, ownerEmail?: string | null) {
  const db = createAdminClient();
  const { data: acct } = await db.from("filmmaker_accounts").select("owner_id").eq("id", accountId).single();
  if (!acct) throw new Error(`Account ${accountId} not found`);
  const now = new Date();

  let foundingUntil: string | null = null;
  if (process.env.FOUNDING_OFFER === "true") {
    const email = ownerEmail ?? (await db.auth.admin.getUserById(acct.owner_id)).data.user?.email;
    if (email) {
      const { data: wl } = await db
        .from("waitlist_signups")
        .select("created_at")
        .eq("email", email)
        .not("confirmed_at", "is", null)
        .lt("created_at", FOUNDING_CUTOFF)
        .maybeSingle();
      if (wl) {
        const until = new Date(now);
        until.setFullYear(until.getFullYear() + 1);
        foundingUntil = until.toISOString().slice(0, 10);
      }
    }
  }

  await db
    .from("filmmaker_accounts")
    .update({
      status: "approved",
      approved_at: now.toISOString(),
      ...(score !== null ? { vetting_score: score } : {}),
      ...(foundingUntil ? { founding_rate_until: foundingUntil } : {}),
    })
    .eq("id", accountId);

  const { data: profile } = await db.from("profiles").select("roles").eq("id", acct.owner_id).single();
  if (profile && !profile.roles.includes("filmmaker")) {
    await db.from("profiles").update({ roles: [...profile.roles, "filmmaker"] }).eq("id", acct.owner_id);
  }
}
