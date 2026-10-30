import "server-only";
import { notFound, redirect } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./session";

export type FilmmakerAccount = Database["public"]["Tables"]["filmmaker_accounts"]["Row"];

/** The signed-in filmmaker's approved account; sends everyone else to the application. */
export async function requireFilmmaker(next: string): Promise<{ userId: string; account: FilmmakerAccount }> {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data: account } = await supabase.from("filmmaker_accounts").select("*").eq("owner_id", user.id).maybeSingle();
  if (!account || account.status !== "approved") redirect("/filmmakers/apply");
  return { userId: user.id, account };
}

/** A film the signed-in filmmaker can manage (RLS also enforces this). */
export async function requireOwnFilm(filmId: string) {
  const { account } = await requireFilmmaker(`/studio/films/${filmId}`);
  const supabase = await createClient();
  const { data: film } = await supabase.from("films").select("*").eq("id", filmId).eq("account_id", account.id).maybeSingle();
  if (!film) notFound();
  return { account, film };
}
