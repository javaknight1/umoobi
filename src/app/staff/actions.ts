"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { queueRecentRefunds } from "@/lib/checks/film";
import { sendEmail } from "@/lib/email";
import { layout } from "@/lib/email/templates";
import { approveAccount } from "@/lib/onboarding/evaluate";
import { createAdminClient } from "@/lib/supabase/admin";

export type Decision = "approve" | "reject" | "proof" | "confirm_ai" | "clear_ai";

async function audit(actorId: string, action: string, target: string, detail: Record<string, unknown>) {
  await createAdminClient().from("staff_audit_log").insert({ actor_id: actorId, action, target, detail: detail as never });
}

async function emailOwner(accountId: string, subject: string, body: string) {
  const db = createAdminClient();
  const { data: acct } = await db.from("filmmaker_accounts").select("owner_id").eq("id", accountId).maybeSingle();
  if (!acct) return;
  const { data } = await db.auth.admin.getUserById(acct.owner_id);
  if (!data.user?.email) return;
  await sendEmail({ to: data.user.email, subject, text: body, html: layout(subject, `<p>${body.replace(/</g, "&lt;")}</p>`) });
}

/** Restores a film hidden for review to sale, or marks a checked film ready. */
async function clearFilm(filmId: string, extra: Record<string, unknown> = {}) {
  const db = createAdminClient();
  const { data: film } = await db.from("films").select("status").eq("id", filmId).single();
  const status = film?.status === "hidden" ? "published" : film?.status === "review" || film?.status === "rejected" ? "ready" : film?.status;
  await db.from("films").update({ ...extra, staff_approved: true, status }).eq("id", filmId);
}

/**
 * One decision on a review item. Staff role + second factor are checked first; writes then
 * go through the service role and every decision is audit-logged.
 */
export async function decideReview(form: FormData) {
  const staff = await requireStaff("/staff");
  const itemId = String(form.get("item_id"));
  const decision = String(form.get("decision")) as Decision;
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  const db = createAdminClient();
  const { data: item } = await db.from("review_items").select("*").eq("id", itemId).maybeSingle();
  if (!item || !["open", "proof_requested"].includes(item.status)) return;

  let itemStatus: "approved" | "rejected" | "proof_requested" = decision === "proof" ? "proof_requested" : decision === "reject" || decision === "confirm_ai" ? "rejected" : "approved";

  if (decision === "proof") {
    if (item.account_id) {
      await emailOwner(item.account_id, "Umoobi needs a little more information", note ?? "Please reply with proof that you hold the rights to sell this film.");
    }
  } else if (item.kind === "account" && item.account_id) {
    if (decision === "approve") await approveAccount(item.account_id, item.score);
    else {
      await db.from("filmmaker_accounts").update({ status: "rejected" }).eq("id", item.account_id);
      await emailOwner(item.account_id, "About your Umoobi application", note ?? "We couldn't approve your application.");
    }
  } else if (item.film_id) {
    if (decision === "confirm_ai") {
      // D46: undeclared AI confirmed → removed with a strike, recent buyers refunded; re-upload labeled is allowed.
      await db
        .from("films")
        .update({ status: "rejected", rejection_reason: "Undeclared AI-generated imagery. You can upload it again with the AI-generated label." })
        .eq("id", item.film_id);
      await db.from("offers").update({ active: false }).eq("film_id", item.film_id);
      if (item.account_id) await db.from("strikes").insert({ account_id: item.account_id, film_id: item.film_id, reason: "undeclared_ai", note });
      const refunds = await queueRecentRefunds(item.film_id, "Film removed: undeclared AI-generated imagery");
      if (item.account_id) {
        await emailOwner(item.account_id, "Your film was removed", `Staff confirmed undeclared AI-generated imagery. ${refunds} recent purchase(s) will be refunded.`);
      }
    } else if (decision === "clear_ai") {
      await clearFilm(item.film_id, { ai_flagged: false });
      itemStatus = "approved";
    } else if (decision === "approve") {
      await clearFilm(item.film_id);
    } else {
      await db.from("films").update({ status: "rejected", rejection_reason: note ?? "Staff couldn't approve this film." }).eq("id", item.film_id);
      await db.from("offers").update({ active: false }).eq("film_id", item.film_id);
    }
  }

  await db
    .from("review_items")
    .update({ status: itemStatus, decided_by: staff.id, decided_at: new Date().toISOString(), decision_note: note })
    .eq("id", itemId);
  await audit(staff.id, `review.${decision}`, `review_item:${itemId}`, { kind: item.kind, film_id: item.film_id, account_id: item.account_id, note });
  revalidatePath("/staff");
}

export async function retryJob(form: FormData) {
  const staff = await requireStaff("/staff/jobs");
  const id = Number(form.get("job_id"));
  await createAdminClient()
    .from("jobs")
    .update({ status: "queued", attempts: 0, run_after: new Date().toISOString(), last_error: null })
    .eq("id", id)
    .eq("status", "failed");
  await audit(staff.id, "job.retry", `job:${id}`, {});
  revalidatePath("/staff/jobs");
}
