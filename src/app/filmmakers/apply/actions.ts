"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { payments } from "@/lib/payments";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/util/slug";

export interface AboutState {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

function clean(v: FormDataEntryValue | null, max = 500) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/** Step 1: about you. Creates the application (RLS lets a user create one, unapproved) or edits it. */
export async function saveAbout(_prev: AboutState, form: FormData): Promise<AboutState> {
  const user = await requireUser("/filmmakers/apply");
  const displayName = clean(form.get("display_name"), 100);
  const legalName = clean(form.get("legal_name"), 150);
  const errors: Record<string, string> = {};
  if (!displayName) errors.display_name = "Add the name viewers will see.";
  if (!legalName) errors.legal_name = "Add your legal name, as on your ID.";
  if (Object.keys(errors).length) return { status: "error", message: "Check the highlighted fields.", fieldErrors: errors };

  const fields = {
    display_name: displayName!,
    legal_name: legalName,
    website: clean(form.get("website"), 300),
    past_work: clean(form.get("past_work"), 2000),
  };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("filmmaker_accounts").select("id").eq("owner_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await supabase.from("filmmaker_accounts").update(fields).eq("id", existing.id);
    if (error) return { status: "error", message: "Couldn't save. Try again." };
  } else {
    const admin = createAdminClient();
    const taken = async (s: string) => {
      const { data } = await admin.from("filmmaker_accounts").select("id").eq("slug", s).maybeSingle();
      return !!data;
    };
    // Two sign-ups can pick the same free slug at once; retry on a unique violation.
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const slug = await uniqueSlug(displayName!, taken);
      const { error } = await supabase.from("filmmaker_accounts").insert({ ...fields, owner_id: user.id, slug });
      if (!error) saved = true;
      else if (error.code !== "23505") return { status: "error", message: "Couldn't save. Try again." };
    }
    if (!saved) return { status: "error", message: "Couldn't save. Try again." };
  }
  redirect("/filmmakers/apply");
}

async function ownAccount() {
  const user = await requireUser("/filmmakers/apply");
  const supabase = await createClient();
  const { data } = await supabase.from("filmmaker_accounts").select("*").eq("owner_id", user.id).maybeSingle();
  if (!data) redirect("/filmmakers/apply");
  return { user, account: data };
}

/** Step 2: Stripe Identity (document + selfie). */
export async function startIdentity() {
  const { user, account } = await ownAccount();
  const { sessionId, url } = await payments().startIdentityCheck({
    accountId: account.id,
    email: user.email,
    returnUrl: `${siteUrl}/filmmakers/apply/return`,
  });
  await createAdminClient()
    .from("filmmaker_accounts")
    .update({ identity_session_id: sessionId, identity_status: "pending" })
    .eq("id", account.id);
  redirect(url);
}

/** Step 3: payout account (Accounts v2 recipient, Stripe-hosted onboarding). */
export async function startPayouts() {
  const { user, account } = await ownAccount();
  const p = payments();
  let stripeAccountId = account.stripe_account_id;
  if (!stripeAccountId) {
    stripeAccountId = await p.createPayoutAccount({ accountId: account.id, email: user.email, displayName: account.display_name });
    await createAdminClient().from("filmmaker_accounts").update({ stripe_account_id: stripeAccountId }).eq("id", account.id);
  }
  const url = await p.payoutOnboardingUrl({
    stripeAccountId,
    returnUrl: `${siteUrl}/filmmakers/apply/return`,
    refreshUrl: `${siteUrl}/filmmakers/apply`,
  });
  redirect(url);
}
