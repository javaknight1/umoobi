"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { addBusinessDays } from "@/lib/dmca/business-days";
import { createAdminClient } from "@/lib/supabase/admin";

async function audit(actorId: string, action: string, target: string, detail: Record<string, unknown> = {}) {
  await createAdminClient().from("staff_audit_log").insert({ actor_id: actorId, action, target, detail: detail as never });
}

/**
 * Valid notice: take the film down, strike the account, tell the filmmaker
 * (DMCA §512(c)). Strikes feed the repeat-infringer policy.
 */
export async function actionNotice(form: FormData) {
  const staff = await requireStaff("/staff/takedowns");
  const id = String(form.get("id"));
  const db = createAdminClient();
  const { data: t } = await db.from("takedowns").select("id, film_id, films(account_id)").eq("id", id).single();
  if (!t) return;
  if (t.film_id) {
    await db.from("films").update({ status: "hidden" }).eq("id", t.film_id);
    const accountId = (t.films as unknown as { account_id: string } | null)?.account_id;
    if (accountId) await db.from("strikes").insert({ account_id: accountId, film_id: t.film_id, reason: "takedown", note: `DMCA ${id}` });
  }
  await db.from("takedowns").update({ status: "actioned" }).eq("id", id);
  await db.from("review_items").update({ status: "approved", decided_by: staff.id, decided_at: new Date().toISOString() }).like("reason", `%${id}%`);
  await audit(staff.id, "takedown.actioned", id);
  revalidatePath("/staff/takedowns");
}

/** Records a counter-notice and sets the restore date 10 business days out (§512(g)(2)(C)). */
export async function recordCounterNotice(form: FormData) {
  const staff = await requireStaff("/staff/takedowns");
  const id = String(form.get("id"));
  const text = String(form.get("counter_notice") ?? "").trim();
  if (!text) return;
  const now = new Date();
  await createAdminClient()
    .from("takedowns")
    .update({
      status: "counter_received",
      counter_notice: text,
      counter_received_at: now.toISOString(),
      restore_after: addBusinessDays(now, 10).toISOString().slice(0, 10),
    })
    .eq("id", id);
  await audit(staff.id, "takedown.counter_notice", id);
  revalidatePath("/staff/takedowns");
}

/** The claimant filed suit: the film stays down. */
export async function closeNotice(form: FormData) {
  const staff = await requireStaff("/staff/takedowns");
  const id = String(form.get("id"));
  const status = form.get("outcome") === "reject" ? "rejected" : "closed";
  await createAdminClient().from("takedowns").update({ status, restore_after: null }).eq("id", id);
  await audit(staff.id, `takedown.${status}`, id);
  revalidatePath("/staff/takedowns");
}
