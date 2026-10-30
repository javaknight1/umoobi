import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const HIDE_AI_COOKIE = "umoobi_hide_ai";
export const SESSION_COOKIE = "umoobi_sid";

/** "Hide AI-generated" filter on Discover and Search (D46), remembered in a first-party cookie. */
export async function hideAiPreference(): Promise<boolean> {
  return (await cookies()).get(HIDE_AI_COOKIE)?.value === "1";
}

/** What the signed-in viewer can do on a film page. Everything is false when signed out. */
export const viewerFilmState = cache(async function viewerFilmState(filmId: string, accountId: string, personIds: string[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { signedIn: false, entitled: false, canReview: false, myReview: null, followsAccount: false, lists: [] as { id: string; title: string }[], followedPeople: [] as string[] };
  }
  const now = new Date().toISOString();
  const [ent, canReview, myReview, followsAcct, followsPeople, lists] = await Promise.all([
    supabase
      .from("entitlements")
      .select("id, expires_at")
      .eq("film_id", filmId)
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1),
    supabase.rpc("can_review", { f: filmId }),
    supabase.from("reviews").select("id, rating, body").eq("film_id", filmId).eq("author_id", user.id).maybeSingle(),
    supabase.from("follows").select("account_id").eq("follower_id", user.id).eq("account_id", accountId).maybeSingle(),
    personIds.length
      ? supabase.from("follows").select("person_id").eq("follower_id", user.id).in("person_id", personIds)
      : Promise.resolve({ data: [] as { person_id: string | null }[] }),
    supabase.from("lists").select("id, title").eq("owner_id", user.id).order("created_at"),
  ]);
  return {
    signedIn: true,
    entitled: (ent.data?.length ?? 0) > 0,
    canReview: !!canReview.data,
    myReview: myReview.data,
    followsAccount: !!followsAcct.data,
    followedPeople: (followsPeople.data ?? []).map((f) => f.person_id as string),
    lists: lists.data ?? [],
  };
});

/** Whether the signed-in user follows a person or filmmaker account. */
export async function isFollowing(target: { personId?: string; accountId?: string }): Promise<boolean | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  let q = supabase.from("follows").select("follower_id").eq("follower_id", auth.user.id);
  q = target.personId ? q.eq("person_id", target.personId) : q.eq("account_id", target.accountId!);
  const { data } = await q.maybeSingle();
  return !!data;
}
