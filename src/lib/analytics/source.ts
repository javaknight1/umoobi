/**
 * Where a film-page visit came from, for the filmmaker's "sources" chart. First-party
 * only (D38): an explicit ?ref= or utm_source wins, then the referrer's host, else "direct".
 */
const KNOWN: Record<string, string> = {
  "instagram.com": "instagram",
  "l.instagram.com": "instagram",
  "facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "l.facebook.com": "facebook",
  "t.co": "x",
  "x.com": "x",
  "twitter.com": "x",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "letterboxd.com": "letterboxd",
  "google.com": "google",
  "bing.com": "bing",
  "reddit.com": "reddit",
  "linktr.ee": "linktree",
};

export function parseSource(input: {
  ref?: string | null;
  utmSource?: string | null;
  referrer?: string | null;
  siteHost?: string | null;
}): string {
  const explicit = (input.ref || input.utmSource || "").trim().toLowerCase();
  if (explicit) return explicit.replace(/[^a-z0-9_.-]/g, "").slice(0, 40) || "direct";
  if (!input.referrer) return "direct";
  let host: string;
  try {
    host = new URL(input.referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "direct";
  }
  if (input.siteHost && host === input.siteHost.replace(/^www\./, "")) return "umoobi";
  return KNOWN[host] ?? host.slice(0, 40);
}

/** Vercel's region header ("CA" or "US-CA") → "CA". US states only; otherwise null. */
export function parseRegion(country: string | null, region: string | null): string | null {
  if (country && country !== "US") return null;
  const r = (region ?? "").toUpperCase().replace(/^US-/, "");
  return /^[A-Z]{2}$/.test(r) ? r : null;
}
