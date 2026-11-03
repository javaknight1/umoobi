"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import { betaInviteEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/** Invites a confirmed filmmaker from the waitlist to the closed beta. */
export async function inviteToBeta(form: FormData) {
  const staff = await requireStaff("/staff/waitlist");
  const email = String(form.get("email") ?? "");
  const db = createAdminClient();
  const { data: row } = await db
    .from("waitlist_signups")
    .select("email, role, film_title, confirmed_at, beta_invited_at")
    .eq("email", email)
    .maybeSingle();
  if (!row || row.role !== "filmmaker" || !row.confirmed_at || row.beta_invited_at) return;
  const token = crypto.randomUUID();
  await db.from("waitlist_signups").update({ beta_invited_at: new Date().toISOString(), beta_invite_token: token }).eq("email", email);
  await sendEmail(betaInviteEmail(email, `${siteUrl}/filmmakers/apply?invite=${token}`, row.film_title));
  await db.from("staff_audit_log").insert({ actor_id: staff.id, action: "beta.invite", target: email });
  revalidatePath("/staff/waitlist");
}
