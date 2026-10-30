"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Separate, per-filmmaker consent to share name and email (VPPA §2710(b)(2)(B), D38). Lasts at most 2 years. */
export async function giveConsent(form: FormData) {
  const user = await requireUser("/settings/sharing");
  const accountId = String(form.get("account_id") ?? "");
  if (form.get("confirm") !== "on") return;
  const supabase = await createClient();
  await supabase.from("consents").insert({ viewer_id: user.id, account_id: accountId });
  revalidatePath("/settings/sharing");
}

export async function withdrawConsent(form: FormData) {
  const user = await requireUser("/settings/sharing");
  const supabase = await createClient();
  await supabase
    .from("consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", String(form.get("consent_id") ?? ""))
    .eq("viewer_id", user.id);
  revalidatePath("/settings/sharing");
}
