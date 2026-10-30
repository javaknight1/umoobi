/**
 * Rights check without studio fingerprinting (D36): does the upload look like a known
 * commercial release? Matches title + year + runtime against TMDB. A strong match sends the
 * film to staff review; it never rejects on its own (the filmmaker may own that film).
 * TMDB commercial terms are unconfirmed (spike S5, T008).
 */

export type MatchStrength = "strong" | "weak" | "none" | "unavailable";

export interface RightsMatch {
  strength: MatchStrength;
  tmdbId: number | null;
  matchedTitle: string | null;
  matchedYear: number | null;
}

interface SearchResult {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
}

export function normalizeTitle(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Scores one candidate. Exported for tests. */
export function judge(
  film: { title: string; year: number | null; runtimeSeconds: number | null },
  candidate: { title: string; originalTitle?: string; year: number | null; runtimeMinutes: number | null },
): MatchStrength {
  const t = normalizeTitle(film.title);
  const titleMatch = t === normalizeTitle(candidate.title) || (!!candidate.originalTitle && t === normalizeTitle(candidate.originalTitle));
  if (!titleMatch) return "none";
  const yearOk = film.year === null || candidate.year === null || Math.abs(film.year - candidate.year) <= 1;
  const runtimeOk =
    film.runtimeSeconds !== null &&
    candidate.runtimeMinutes !== null &&
    candidate.runtimeMinutes > 0 &&
    Math.abs(film.runtimeSeconds / 60 - candidate.runtimeMinutes) <= 3;
  if (yearOk && runtimeOk) return "strong";
  return "weak";
}

const RANK: Record<MatchStrength, number> = { strong: 3, weak: 2, none: 1, unavailable: 0 };

export async function matchFilm(
  film: { title: string; year: number | null; runtimeSeconds: number | null },
  apiKey: string | undefined = process.env.TMDB_API_KEY,
  fetchImpl: typeof fetch = fetch,
): Promise<RightsMatch> {
  const none: RightsMatch = { strength: "none", tmdbId: null, matchedTitle: null, matchedYear: null };
  if (!apiKey) return { ...none, strength: "unavailable" };
  // TMDB accepts a v3 key as `api_key` or a v4 read token as a bearer header.
  const auth = apiKey.length > 40 ? { headers: { authorization: `Bearer ${apiKey}` } } : {};
  const key = apiKey.length > 40 ? "" : `&api_key=${encodeURIComponent(apiKey)}`;
  try {
    const q = encodeURIComponent(film.title.replace(/\[[^\]]*\]/g, "").trim());
    const res = await fetchImpl(`https://api.themoviedb.org/3/search/movie?query=${q}&include_adult=false${key}`, auth);
    if (!res.ok) return { ...none, strength: "unavailable" };
    const { results } = (await res.json()) as { results: SearchResult[] };
    let best = none;
    for (const r of (results ?? []).slice(0, 5)) {
      const year = r.release_date ? Number(r.release_date.slice(0, 4)) || null : null;
      if (judge(film, { title: r.title, originalTitle: r.original_title, year, runtimeMinutes: null }) === "none") continue;
      const detail = await fetchImpl(`https://api.themoviedb.org/3/movie/${r.id}?${key.slice(1)}`, auth);
      const runtime = detail.ok ? ((await detail.json()) as { runtime?: number }).runtime ?? null : null;
      const strength = judge(film, { title: r.title, originalTitle: r.original_title, year, runtimeMinutes: runtime });
      if (RANK[strength] > RANK[best.strength]) best = { strength, tmdbId: r.id, matchedTitle: r.title, matchedYear: year };
      if (strength === "strong") break;
    }
    return best;
  } catch {
    return { ...none, strength: "unavailable" };
  }
}
