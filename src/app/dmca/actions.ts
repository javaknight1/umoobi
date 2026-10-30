"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface DmcaState {
  status: "idle" | "done" | "error";
  message: string;
}

const required = ["claimant_name", "claimant_email", "work_described", "infringing_url", "signature"] as const;

/** DMCA notice intake (17 U.S.C. §512(c)(3)). Staff act on it from the takedowns queue. */
export async function submitNotice(_prev: DmcaState, form: FormData): Promise<DmcaState> {
  const v = Object.fromEntries(required.map((k) => [k, String(form.get(k) ?? "").trim().slice(0, 4000)])) as Record<(typeof required)[number], string>;
  if (required.some((k) => !v[k]) || form.get("good_faith") !== "on" || form.get("accurate") !== "on") {
    return { status: "error", message: "Fill in every field and confirm both statements." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.claimant_email)) return { status: "error", message: "Enter a valid email." };

  const db = createAdminClient();
  const slug = v.infringing_url.match(/\/f\/([a-z0-9-]+)/)?.[1];
  const { data: film } = slug ? await db.from("films").select("id, account_id").eq("slug", slug).maybeSingle() : { data: null };
  const { data: notice, error } = await db
    .from("takedowns")
    .insert({ ...v, good_faith: true, film_id: film?.id ?? null })
    .select("id")
    .single();
  if (error || !notice) return { status: "error", message: "Something went wrong. Email copyright@umoobi.com instead." };
  await db.from("review_items").insert({
    kind: "takedown",
    film_id: film?.id ?? null,
    account_id: film?.account_id ?? null,
    reason: `DMCA notice ${notice.id} from ${v.claimant_name}`,
    due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  return { status: "done", message: "Notice received. We'll review it and reply by email." };
}
