"use server";

import { sendEmail } from "@/lib/email";
import { waitlistConfirmEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { parseWaitlistForm } from "@/lib/waitlist";

export interface WaitlistState {
  status: "idle" | "done" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Adds a waitlist sign-up and sends the double opt-in email. Writes with the service role
 * because the waitlist table has no public insert policy. The same response is returned
 * whether or not the email was already on the list, so the form can't be used to probe it.
 */
export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  if (String(formData.get("company") ?? "") !== "") {
    return { status: "done", message: "Check your inbox to confirm." }; // honeypot
  }
  const parsed = parseWaitlistForm(formData);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", fieldErrors: parsed.errors };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("waitlist_signups")
    .select("id, confirm_token, confirmed_at")
    .eq("email", parsed.value.email)
    .maybeSingle();

  let token = existing?.confirm_token;
  if (!existing) {
    const { data, error } = await db.from("waitlist_signups").insert(parsed.value).select("confirm_token").single();
    if (error) return { status: "error", message: "Something went wrong. Try again in a minute." };
    token = data.confirm_token;
  }

  if (token && !existing?.confirmed_at) {
    await sendEmail(waitlistConfirmEmail(parsed.value.email, `${siteUrl}/waitlist/confirm?token=${token}`, parsed.value.role));
  }
  return { status: "done", message: `Check ${parsed.value.email} and tap the link to confirm your spot.` };
}
