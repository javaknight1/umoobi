"use server";

import { headers } from "next/headers";
import { safeNextPath } from "@/lib/auth/next-path";
import { isOldEnough } from "@/lib/auth/age";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  status: "idle" | "sent" | "needs_birth_year" | "too_young" | "error";
  message: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email magic link. Existing users get a link straight away; a new email is asked for a
 * birth year first (neutral question, COPPA) and under-13s are blocked.
 */
export async function sendSignInLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Enter a valid email address." };

  const birthYearRaw = String(formData.get("birth_year") ?? "").trim();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const supabase = await createClient();

  if (!birthYearRaw) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: false },
    });
    if (!error) return { status: "sent", message: `Check ${email} for your sign-in link.`, email };
    if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
      return { status: "needs_birth_year", message: "New to Umoobi? One question first.", email };
    }
    return { status: "error", message: "We couldn't send the link. Try again in a minute.", email };
  }

  const birthYear = Number(birthYearRaw);
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
    return { status: "needs_birth_year", message: "Enter the year you were born.", email };
  }
  if (!isOldEnough(birthYear)) {
    return { status: "too_young", message: "Umoobi accounts are for people 13 and over.", email };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo, shouldCreateUser: true, data: { birth_year: birthYear } },
  });
  if (error) return { status: "error", message: "We couldn't send the link. Try again in a minute.", email };
  return { status: "sent", message: `Check ${email} for your sign-in link.`, email };
}
