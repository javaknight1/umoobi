import "server-only";
import { matchFilm } from "@/lib/rights/tmdb";
import { scanner } from "@/lib/scan";
import { summarize } from "@/lib/scan/summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { video } from "@/lib/video";
import { scoreFilm } from "@/lib/vetting/film";

const FRAME_EVERY_SECONDS = 5;
const DAY_MS = 24 * 3600 * 1000;

/**
 * Job `check_film`: samples a frame every 5 s from the encoded master, scans for explicit
 * content and AI imagery, matches the title against TMDB, scores the film and moves it to
 * ready / review / rejected. On a film that's already published only the AI check acts
 * (hide and send to staff, D46).
 */
export async function checkFilm(filmId: string): Promise<void> {
  const db = createAdminClient();
  const { data: film } = await db.from("films").select("*").eq("id", filmId).maybeSingle();
  if (!film) return;
  if (["rejected", "pulled"].includes(film.status)) return;

  const { data: master } = await db
    .from("film_assets")
    .select("mux_playback_id, duration_seconds, status")
    .eq("film_id", filmId)
    .eq("kind", "master")
    .maybeSingle();
  if (!master || master.status !== "ready" || !master.mux_playback_id) throw new Error("Master isn't ready yet");

  const wasPublished = film.status === "published" || film.status === "hidden";
  if (!wasPublished) await db.from("films").update({ status: "checking" }).eq("id", filmId);

  const { data: acct } = await db
    .from("filmmaker_accounts")
    .select("status, identity_status, tier")
    .eq("id", film.account_id)
    .single();
  const { count: strikes } = await db
    .from("strikes")
    .select("id", { count: "exact", head: true })
    .eq("account_id", film.account_id);

  const duration = Number(master.duration_seconds ?? film.runtime_seconds ?? 0);
  const urls = await video().frameUrls(master.mux_playback_id, duration, FRAME_EVERY_SECONDS);
  const frames = await scanner().scanFrames(urls, { title: film.title });
  const scan = summarize(frames, urls.length);
  const rights = await matchFilm({ title: film.title, year: film.release_year, runtimeSeconds: film.runtime_seconds });

  const result = scoreFilm({
    accountVerified: acct?.status === "approved" && acct.identity_status === "verified",
    established: acct?.tier === "established",
    rightsStatement: !!film.rights_statement_at,
    scan,
    rights: rights.strength,
    strikes: strikes ?? 0,
    declaredAi: film.ai_generated,
  });

  await db.from("verifications").insert({
    subject: "film",
    film_id: filmId,
    account_id: film.account_id,
    score: result.score,
    signals: { reasons: result.reasons, scan: { ...scan }, rights: { ...rights } },
  });

  if (wasPublished) {
    if (result.undeclaredAi) await hideForAiReview(filmId, film.account_id, "AI scan found undeclared AI imagery");
    return;
  }

  const due = new Date(Date.now() + DAY_MS).toISOString();
  if (result.decision === "approve") {
    await db.from("films").update({ status: "ready", vetting_score: result.score, ai_flagged: result.undeclaredAi, rejection_reason: null }).eq("id", filmId);
  } else if (result.decision === "review") {
    await db.from("films").update({ status: "review", vetting_score: result.score, ai_flagged: result.undeclaredAi }).eq("id", filmId);
    await db.from("review_items").insert({
      kind: "film",
      film_id: filmId,
      account_id: film.account_id,
      score: result.score,
      reason: result.reasons.join("; "),
      due_at: due,
    });
  } else {
    await db
      .from("films")
      .update({
        status: "rejected",
        vetting_score: result.score,
        ai_flagged: result.undeclaredAi,
        rejection_reason: result.hardReject ?? "Our automatic checks couldn't clear this film. Reply to the email we sent to ask for a review.",
      })
      .eq("id", filmId);
  }

  // Before publishing, an AI hit on an undeclared film blocks it (via publish_blockers) until
  // the filmmaker labels it or disputes it; a dispute creates the staff review item.
}

/** Hides a published film from sale and asks staff to confirm within 24 hours (D46). */
export async function hideForAiReview(filmId: string, accountId: string, reason: string) {
  const db = createAdminClient();
  await db.from("films").update({ status: "hidden", ai_flagged: true }).eq("id", filmId).in("status", ["published", "hidden"]);
  const { data: open } = await db
    .from("review_items")
    .select("id")
    .eq("film_id", filmId)
    .eq("kind", "ai_flag")
    .eq("status", "open")
    .maybeSingle();
  if (!open) {
    await db.from("review_items").insert({
      kind: "ai_flag",
      film_id: filmId,
      account_id: accountId,
      reason,
      due_at: new Date(Date.now() + DAY_MS).toISOString(),
    });
  }
}

/** Queues refunds for paid purchases of a film in the last 30 days (D27). Returns the count. */
export async function queueRecentRefunds(filmId: string, reason: string): Promise<number> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const { data: orders } = await db
    .from("orders")
    .select("id")
    .eq("film_id", filmId)
    .eq("kind", "buy")
    .eq("status", "paid")
    .gt("paid_at", since);
  if (!orders?.length) return 0;
  await db.from("jobs").insert(orders.map((o) => ({ kind: "refund_order", payload: { order_id: o.id, reason } })));
  return orders.length;
}
