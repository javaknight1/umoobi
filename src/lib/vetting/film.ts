import type { MatchStrength } from "@/lib/rights/tmdb";
import { AI_FLAG, EXPLICIT_BLOCK, EXPLICIT_REVIEW } from "@/lib/scan/summary";
import type { ScanSummary } from "@/lib/scan/types";
import type { Decision } from "./account";

/**
 * Automatic film checks (D11, D36): a confidence score from the account, the rights
 * statement, the content scan and the rights match. 80+ is ready to publish, 50–79 goes to
 * staff review, under 50 is rejected. Explicit content is a hard reject (Stripe's rules).
 * Undeclared AI imagery doesn't lower the score; it sets a flag that blocks or hides the
 * film until it's labeled or staff clear it (D46).
 */

export interface FilmSignals {
  accountVerified: boolean;
  established: boolean;
  rightsStatement: boolean;
  scan: ScanSummary;
  rights: MatchStrength;
  strikes: number;
  declaredAi: boolean;
}

export interface FilmScore {
  score: number;
  decision: Decision;
  reasons: string[];
  /** The scan found AI imagery on a film declared as not AI-generated. */
  undeclaredAi: boolean;
  /** Reason for a hard reject, shown to the filmmaker. */
  hardReject: string | null;
}

export function scoreFilm(s: FilmSignals): FilmScore {
  const reasons: string[] = [];
  let score = 0;

  if (s.accountVerified) {
    score += 40;
    reasons.push("Verified filmmaker (+40)");
  } else reasons.push("Filmmaker not verified");
  if (s.established) {
    score += 5;
    reasons.push("Established account (+5)");
  }
  if (s.rightsStatement) {
    score += 15;
    reasons.push("Rights statement confirmed (+15)");
  } else reasons.push("No rights statement");

  const scanCoverage = s.scan.framesScanned + s.scan.failedFrames === 0 ? 0 : s.scan.framesScanned / (s.scan.framesScanned + s.scan.failedFrames);
  if (s.scan.maxExplicit >= EXPLICIT_BLOCK) {
    reasons.push("Sexually explicit frames found");
  } else if (s.scan.maxExplicit >= EXPLICIT_REVIEW) {
    reasons.push(`Possible nudity in ${s.scan.explicitFrames} frame(s); needs a person to look`);
  } else if (scanCoverage < 0.9) {
    score += 10;
    reasons.push(`Only ${Math.round(scanCoverage * 100)}% of frames scanned (+10)`);
  } else {
    score += 25;
    reasons.push("Content scan clean (+25)");
  }

  switch (s.rights) {
    case "none":
      score += 15;
      reasons.push("No match to a known release (+15)");
      break;
    case "weak":
      score += 5;
      reasons.push("Title matches a known release, but year or runtime differ (+5)");
      break;
    case "unavailable":
      score += 10;
      reasons.push("Rights database unavailable (+10)");
      break;
    case "strong":
      reasons.push("Matches a known commercial release: title, year and runtime");
      break;
  }

  if (s.strikes > 0) {
    score -= 15 * s.strikes;
    reasons.push(`${s.strikes} strike(s) on the account (−${15 * s.strikes})`);
  }

  score = Math.max(0, Math.min(100, score));
  // A strong match is a question for staff, not an automatic pass or fail.
  if (s.rights === "strong") score = Math.min(score, 65);
  if (s.scan.maxExplicit >= EXPLICIT_REVIEW && s.scan.maxExplicit < EXPLICIT_BLOCK) score = Math.min(score, 79);

  const hardReject = s.scan.maxExplicit >= EXPLICIT_BLOCK ? "Sexually explicit content isn't allowed on Umoobi." : null;
  if (hardReject) score = 0;

  const undeclaredAi = !s.declaredAi && s.scan.maxAiGenerated >= AI_FLAG;
  if (undeclaredAi) reasons.push(`AI-generated imagery in ${s.scan.aiFrames} frame(s), but the film isn't labeled`);

  return {
    score,
    decision: hardReject ? "reject" : score >= 80 ? "approve" : score >= 50 ? "review" : "reject",
    reasons,
    undeclaredAi,
    hardReject,
  };
}
