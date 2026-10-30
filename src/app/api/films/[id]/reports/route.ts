import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const REASONS = new Set(["undisclosed_ai", "explicit", "copyright", "other"]);

/**
 * Viewer report. Anyone can report; a signed-in reporter is recorded for follow-up. A report
 * of undisclosed AI from a viewer who paid for the film hides it from sale at once until staff
 * confirm within 24 hours (D46, D66).
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/films/[id]/reports">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const reason = String(body?.reason ?? "");
  if (!REASONS.has(reason)) return NextResponse.json({ error: "Pick a reason." }, { status: 400 });
  const details = body?.details ? String(body.details).slice(0, 2000) : null;

  const { data: auth } = await (await createClient()).auth.getUser();
  const db = createAdminClient();
  const { data: film } = await db.from("films").select("id, account_id, status, ai_generated").eq("id", id).maybeSingle();
  if (!film || film.status !== "published") return NextResponse.json({ error: "Film not found." }, { status: 404 });

  await db.from("content_reports").insert({
    film_id: id,
    reporter_id: auth.user?.id ?? null,
    reason: reason as "undisclosed_ai" | "explicit" | "copyright" | "other",
    details,
  });

  // Only a signed-in viewer who rented or bought the film can hide it instantly (D66); anyone
  // else's report still reaches the staff queue, so a stranger can't take a film off sale.
  let watched = false;
  if (auth.user) {
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("viewer_id", auth.user.id)
      .eq("film_id", id)
      .eq("status", "paid");
    watched = (count ?? 0) > 0;
  }
  const hide = reason === "undisclosed_ai" && !film.ai_generated && watched;
  if (hide) await db.from("films").update({ status: "hidden" }).eq("id", id).eq("status", "published");

  // One open review item per film and reason, so a pile-on doesn't flood the queue.
  const label = `Viewer report: ${reason.replace("_", " ")}`;
  const { data: open } = await db
    .from("review_items")
    .select("id")
    .eq("film_id", id)
    .eq("kind", "report")
    .eq("status", "open")
    .eq("reason", label)
    .maybeSingle();
  if (!open) {
    await db.from("review_items").insert({
      kind: "report",
      film_id: id,
      account_id: film.account_id,
      reason: label,
      decision_note: details,
      due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
  }
  return NextResponse.json({ ok: true, hidden: hide });
}
