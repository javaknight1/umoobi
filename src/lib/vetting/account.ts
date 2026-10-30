/**
 * Automated filmmaker vetting (D11): a confidence score from signals we can check without
 * a person. 80+ approves, 50–79 goes to the staff queue, under 50 is rejected.
 */

export interface AccountSignals {
  identityVerified: boolean;
  /** Verified document name vs. the legal name they typed. null when unknown. */
  nameMatches: boolean | null;
  pastWorkLinks: string[];
  website: string | null;
  email: string | null;
  payoutsReady: boolean;
}

export type Decision = "approve" | "review" | "reject";

export interface Scored {
  score: number;
  decision: Decision;
  reasons: string[];
}

const CREDIBLE_HOSTS = [
  "imdb.com",
  "vimeo.com",
  "youtube.com",
  "youtu.be",
  "filmfreeway.com",
  "letterboxd.com",
  "withoutabox.com",
  "festival",
  "sundance.org",
  "sxsw.com",
  "tribecafilm.com",
];

const FREE_MAIL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "proton.me", "protonmail.com"];

export function hostOf(url: string): string | null {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function namesMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null;
  const norm = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const x = norm(a);
  const y = norm(b);
  if (!x.length || !y.length) return null;
  // First and last name must both appear; middle names and order can differ.
  return x[0] === y[0] && x[x.length - 1] === y[y.length - 1]
    ? true
    : y.includes(x[0]) && y.includes(x[x.length - 1]);
}

export function scoreAccount(s: AccountSignals): Scored {
  let score = 0;
  const reasons: string[] = [];
  if (s.identityVerified) {
    score += 45;
    reasons.push("ID verified (+45)");
  } else reasons.push("ID not verified");

  if (s.nameMatches === true) {
    score += 15;
    reasons.push("ID name matches legal name (+15)");
  } else if (s.nameMatches === false) reasons.push("ID name differs from legal name");

  const hosts = s.pastWorkLinks.map(hostOf).filter((h): h is string => !!h);
  if (hosts.some((h) => CREDIBLE_HOSTS.some((c) => h === c || h.endsWith(`.${c}`) || h.includes(c)))) {
    score += 15;
    reasons.push("Past work on a film site (+15)");
  } else if (hosts.length) {
    score += 8;
    reasons.push("Past work link (+8)");
  } else reasons.push("No past work");

  if (s.website && hostOf(s.website)) {
    score += 5;
    reasons.push("Website (+5)");
  }
  const domain = s.email?.split("@")[1]?.toLowerCase();
  if (domain && !FREE_MAIL.includes(domain)) {
    score += 5;
    reasons.push("Own email domain (+5)");
  }
  if (s.payoutsReady) {
    score += 15;
    reasons.push("Payout account ready (+15)");
  } else reasons.push("Payout account not ready");

  score = Math.min(100, score);
  return { score, decision: score >= 80 ? "approve" : score >= 50 ? "review" : "reject", reasons };
}

/** Splits the free-text "past work" box into links. */
export function extractLinks(text: string | null): string[] {
  if (!text) return [];
  return (text.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,]*)?/gi) ?? []).slice(0, 20);
}
