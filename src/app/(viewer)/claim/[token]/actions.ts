"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Claims a person page via the `claim_person` function, which checks the token and the one-page-per-user rule. */
export async function claimPerson(form: FormData) {
  const token = String(form.get("token") ?? "");
  await requireUser(`/claim/${token}`);
  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("claim_person", { p_token: token });
  if (error || !slug) redirect(`/settings/profile?claim_error=${encodeURIComponent(error?.message ?? "Couldn't claim the page")}`);
  redirect(`/settings/profile?claimed=${slug}`);
}
