import type { Database } from "@/lib/supabase/database.types";

export type WaitlistInsert = Database["public"]["Tables"]["waitlist_signups"]["Insert"];
export type WaitlistRole = "filmmaker" | "viewer" | "cast_crew";

export const ROLE_LABELS: Record<WaitlistRole, string> = {
  filmmaker: "Filmmaker",
  viewer: "Viewer",
  cast_crew: "Cast or crew",
};

export const SELLS_TODAY = [
  "Vimeo On Demand",
  "My own website",
  "Amazon / Apple via an aggregator",
  "Another storefront",
  "Not selling yet",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true; value: WaitlistInsert } | { ok: false; errors: Record<string, string> };

function clean(v: FormDataEntryValue | null, max = 300): string | null {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

/** Validates the waitlist form. Film details are only kept for filmmakers. */
export function parseWaitlistForm(form: FormData): Result {
  const errors: Record<string, string> = {};
  const email = (clean(form.get("email"), 254) ?? "").toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const role = clean(form.get("role")) as WaitlistRole | null;
  if (!role || !(role in ROLE_LABELS)) errors.role = "Pick one.";

  const isFilmmaker = role === "filmmaker";
  const filmKind = isFilmmaker ? clean(form.get("film_kind")) : null;
  if (filmKind && filmKind !== "feature" && filmKind !== "short") errors.film_kind = "Pick feature or short.";

  let trailerUrl = isFilmmaker ? clean(form.get("trailer_url"), 500) : null;
  if (trailerUrl) {
    if (!/^https?:\/\//i.test(trailerUrl)) trailerUrl = `https://${trailerUrl}`;
    try {
      new URL(trailerUrl);
    } catch {
      errors.trailer_url = "Enter a link, like vimeo.com/123.";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      email,
      role: role!,
      film_title: isFilmmaker ? clean(form.get("film_title"), 200) : null,
      film_kind: filmKind as "feature" | "short" | null,
      sells_today: isFilmmaker ? clean(form.get("sells_today"), 100) : null,
      trailer_url: trailerUrl,
      launch_emails: form.get("launch_emails") === "on",
      source: clean(form.get("source"), 100),
    },
  };
}

/** CSV for the staff export. Quotes every field and neutralizes spreadsheet formulas. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}
