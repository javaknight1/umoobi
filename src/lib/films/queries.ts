import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";

/** Columns of `people` that anonymous visitors may read (invite tokens stay server-side). */
export const PERSON_COLUMNS = "id, slug, name, bio, photo_url, claimed_by";

const CARD_SELECT =
  "id, slug, title, poster_url, runtime_seconds, genre, release_year, ai_generated, published_at, filmmaker_accounts(display_name, slug), offers(kind, price_cents, rental_hours, active)";

export interface FilmCard {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
  runtime_seconds: number | null;
  genre: string | null;
  release_year: number | null;
  ai_generated: boolean;
  published_at: string | null;
  filmmaker_accounts: { display_name: string; slug: string } | null;
  offers: { kind: string; price_cents: number; rental_hours: number | null; active: boolean }[];
}

/** Public reads always happen at request time (status changes such as a pull must show at once). */
async function db() {
  await connection();
  return createPublicClient();
}

function activeOffers<T extends { offers: { active: boolean }[] }>(film: T): T {
  return { ...film, offers: film.offers.filter((o) => o.active) };
}

/** Deduped per request: the page and its metadata both ask for the film. */
export const getPublicFilm = cache(async function getPublicFilm(slug: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("films")
    .select(
      `id, slug, title, synopsis, genre, content_rating, release_year, runtime_seconds, poster_url, ai_generated, published_at,
       account_id, filmmaker_accounts(display_name, slug),
       offers(id, kind, price_cents, rental_hours, active),
       film_assets(id, kind, label, mux_playback_id, duration_seconds, status),
       credits(role, billing_order, people(${PERSON_COLUMNS}))`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const { data: rating } = await supabase.rpc("film_rating", { p_film: data.id });
  return {
    ...data,
    offers: data.offers.filter((o) => o.active),
    trailers: data.film_assets.filter((a) => a.kind === "trailer" && a.status === "ready" && a.mux_playback_id),
    clips: data.film_assets.filter((a) => a.kind === "clip" && a.status === "ready" && a.mux_playback_id),
    credits: [...data.credits].sort((a, b) => a.billing_order - b.billing_order),
    rating: rating?.[0] ?? { average: null, count: 0 },
  };
});

export type PublicFilm = NonNullable<Awaited<ReturnType<typeof getPublicFilm>>>;

export async function getFilmReviews(filmId: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, body, created_at, author_id")
    .eq("film_id", filmId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/** Cards for a list of film ids, in the given order. */
export async function getFilmCards(ids: string[], opts: { hideAi?: boolean } = {}): Promise<FilmCard[]> {
  if (!ids.length) return [];
  const supabase = await db();
  let q = supabase.from("films").select(CARD_SELECT).in("id", ids).eq("status", "published");
  if (opts.hideAi) q = q.eq("ai_generated", false);
  const { data } = await q;
  const byId = new Map((data ?? []).map((f) => [f.id, activeOffers(f as unknown as FilmCard)]));
  return ids.map((id) => byId.get(id)).filter((f): f is FilmCard => !!f);
}

export async function listFilms(opts: {
  hideAi?: boolean;
  publishedWithinDays?: number;
  genre?: string;
  shortsOnly?: boolean;
  accountId?: string;
  limit?: number;
}): Promise<FilmCard[]> {
  const supabase = await db();
  let q = supabase.from("films").select(CARD_SELECT).eq("status", "published");
  if (opts.hideAi) q = q.eq("ai_generated", false);
  if (opts.publishedWithinDays) {
    q = q.gte("published_at", new Date(Date.now() - opts.publishedWithinDays * 24 * 3600 * 1000).toISOString());
  }
  if (opts.genre) q = q.eq("genre", opts.genre);
  if (opts.shortsOnly) q = q.lt("runtime_seconds", 2400);
  if (opts.accountId) q = q.eq("account_id", opts.accountId);
  const { data } = await q.order("published_at", { ascending: false }).limit(opts.limit ?? 12);
  return (data ?? []).map((f) => activeOffers(f as unknown as FilmCard));
}

/** Staff-curated shelves (D8) with their films, in order. */
export async function getStaffShelves(opts: { hideAi?: boolean } = {}) {
  const supabase = await db();
  const { data: shelves } = await supabase
    .from("shelves")
    .select("id, slug, title, position, shelf_items(film_id, position)")
    .eq("active", true)
    .order("position");
  return Promise.all(
    (shelves ?? []).map(async (s) => ({
      slug: s.slug,
      title: s.title,
      films: await getFilmCards(
        [...s.shelf_items].sort((a, b) => a.position - b.position).map((i) => i.film_id),
        opts,
      ),
    })),
  );
}

export async function getTrending(opts: { hideAi?: boolean } = {}) {
  const supabase = await db();
  const { data } = await supabase.rpc("trending_films", { p_days: 7, p_limit: 12 });
  return getFilmCards((data ?? []).map((r) => r.film_id), opts);
}

export async function searchCatalog(q: string, opts: { hideAi?: boolean } = {}) {
  const supabase = await db();
  const [films, people] = await Promise.all([
    supabase.rpc("search_films", { q, p_limit: 24 }),
    supabase.rpc("search_people", { q, p_limit: 12 }),
  ]);
  const personIds = (people.data ?? []).map((p) => p.person_id);
  const { data: personRows } = personIds.length
    ? await supabase.from("people").select(PERSON_COLUMNS).in("id", personIds)
    : { data: [] };
  const byId = new Map((personRows ?? []).map((p) => [p.id, p]));
  return {
    films: await getFilmCards((films.data ?? []).map((f) => f.film_id), opts),
    people: personIds.map((id) => byId.get(id)).filter((p) => !!p),
  };
}

export async function listGenres(): Promise<string[]> {
  const supabase = await db();
  const { data } = await supabase.from("films").select("genre").eq("status", "published").not("genre", "is", null);
  return [...new Set((data ?? []).map((r) => r.genre as string))].sort();
}

export async function getPerson(slug: string) {
  const supabase = await db();
  const { data: person } = await supabase.from("people").select(PERSON_COLUMNS).eq("slug", slug).maybeSingle();
  if (!person) return null;
  const { data: credits } = await supabase
    .from("credits")
    .select("role, film_id")
    .eq("person_id", person.id);
  const ids = [...new Set((credits ?? []).map((c) => c.film_id))];
  const films = await getFilmCards(ids);
  const roles = new Map<string, string[]>();
  for (const c of credits ?? []) roles.set(c.film_id, [...(roles.get(c.film_id) ?? []), c.role]);
  return { person, films: films.map((f) => ({ film: f, roles: roles.get(f.id) ?? [] })) };
}

export async function getFilmmakerPage(slug: string) {
  const supabase = await db();
  const { data: account } = await supabase
    .from("filmmaker_accounts")
    .select("id, display_name, slug, website")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!account) return null;
  const films = await listFilms({ accountId: account.id, limit: 50 });
  return { account, films };
}
