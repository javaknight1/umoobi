"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Saves the claimed person page (RLS: only the claimant can edit name, bio and photo). */
export async function saveProfile(form: FormData) {
  const user = await requireUser("/settings/profile");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const bio = String(form.get("bio") ?? "").trim().slice(0, 1500) || null;
  let photo = String(form.get("photo_url") ?? "").trim() || null;
  if (photo && !/^https:\/\//i.test(photo)) photo = null; // https images only
  if (!name) redirect("/settings/profile?claim_error=Add+your+name");

  const supabase = await createClient();
  await supabase.from("people").update({ name, bio, photo_url: photo }).eq("claimed_by", user.id);
  redirect("/settings/profile?saved=1");
}
