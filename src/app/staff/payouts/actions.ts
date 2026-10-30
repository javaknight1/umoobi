"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setPayoutHold(form: FormData) {
  const staff = await requireStaff("/staff/payouts");
  const id = String(form.get("account_id"));
  const hold = form.get("hold") === "true";
  const db = createAdminClient();
  await db.from("filmmaker_accounts").update({ payout_hold: hold }).eq("id", id);
  // Releasing a hold re-queues held payouts for the next run.
  if (!hold) await db.from("payouts").update({ status: "pending" }).eq("account_id", id).eq("status", "held");
  await db.from("staff_audit_log").insert({ actor_id: staff.id, action: hold ? "payout.hold" : "payout.release", target: id });
  revalidatePath("/staff/payouts");
}

export async function retryPayouts() {
  const staff = await requireStaff("/staff/payouts");
  const db = createAdminClient();
  await db.from("payouts").update({ status: "pending" }).eq("status", "failed");
  await db.from("jobs").insert({ kind: "monthly_payouts", payload: {} });
  await db.from("staff_audit_log").insert({ actor_id: staff.id, action: "payout.retry_failed", target: "all" });
  revalidatePath("/staff/payouts");
}
