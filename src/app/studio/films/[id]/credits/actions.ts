"use server";

import { revalidatePath } from "next/cache";
import { requireOwnFilm } from "@/lib/auth/filmmaker";
import { percentToBps, sharesState } from "@/lib/credits/shares";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/util/slug";

export interface PersonOption {
  id: string;
  name: string;
  slug: string;
  claimed: boolean;
  canInvite: boolean;
}

/** Finds people by name (pg_trgm) for the "add person" box. */
export async function searchPeople(filmId: string, q: string): Promise<PersonOption[]> {
  const { account } = await requireOwnFilm(filmId);
  const query = q.trim();
  if (query.length < 2) return [];
  const supabase = await createClient();
  const { data: hits } = await supabase.rpc("search_people", { q: query, p_limit: 8 });
  const ids = (hits ?? []).map((h) => h.person_id);
  if (!ids.length) return [];
  const { data } = await createAdminClient()
    .from("people")
    .select("id, name, slug, claimed_by, created_by_account")
    .in("id", ids);
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p) => !!p)
    .map((p) => ({
      id: p!.id,
      name: p!.name,
      slug: p!.slug,
      claimed: !!p!.claimed_by,
      canInvite: !p!.claimed_by && p!.created_by_account === account.id,
    }));
}

/** Adds a new person page owned by this filmmaker until someone claims it. */
export async function createPerson(filmId: string, name: string): Promise<PersonOption | { error: string }> {
  const { account } = await requireOwnFilm(filmId);
  const clean = name.trim().slice(0, 120);
  if (clean.length < 2) return { error: "Enter a name." };
  const admin = createAdminClient();
  const supabase = await createClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await uniqueSlug(clean, async (s) => !!(await admin.from("people").select("id").eq("slug", s).maybeSingle()).data);
    const { data, error } = await supabase
      .from("people")
      .insert({ slug, name: clean, created_by_account: account.id })
      .select("id, name, slug")
      .single();
    if (data) return { ...data, claimed: false, canInvite: true };
    if (error?.code !== "23505") break;
  }
  return { error: "Couldn't add that person." };
}

export interface CreditRow {
  personId: string;
  role: string;
  share: string;
}

/** Replaces the film's credits in one transaction; shares must total 100% or 0% (D15). */
export async function saveCredits(filmId: string, rows: CreditRow[]): Promise<{ ok: true } | { error: string }> {
  await requireOwnFilm(filmId);
  const credits: { person_id: string; role: string; share_bps: number }[] = [];
  for (const r of rows) {
    const role = r.role.trim().slice(0, 80);
    if (!role) return { error: "Every credit needs a role." };
    const bps = percentToBps(r.share || "0");
    if (bps === null) return { error: "Shares must be between 0 and 100%." };
    credits.push({ person_id: r.personId, role, share_bps: bps });
  }
  const seen = new Set<string>();
  for (const c of credits) {
    const key = `${c.person_id}|${c.role.toLowerCase()}`;
    if (seen.has(key)) return { error: "The same person is listed twice with the same role." };
    seen.add(key);
  }
  const { state, total } = sharesState(credits.map((c) => c.share_bps));
  if (state === "incomplete") return { error: `Revenue shares add up to ${total / 100}%. They must total exactly 100%, or all be 0.` };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_credits", { p_film: filmId, p_credits: credits });
  if (error) {
    return { error: error.code === "23514" ? "Revenue shares for a film must total exactly 100%." : "Couldn't save the credits." };
  }
  revalidatePath(`/studio/films/${filmId}/credits`);
  return { ok: true };
}
