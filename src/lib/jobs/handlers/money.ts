import "server-only";
import { payments } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Handler } from "../index";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Nightly: roll up yesterday (final) and today (partial). */
export const rollupAnalytics: Handler = async () => {
  const db = createAdminClient();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400_000);
  for (const day of [isoDay(yesterday), isoDay(today)]) {
    const { error } = await db.rpc("rollup_film_day", { p_day: day });
    if (error) throw new Error(`rollup ${day}: ${error.message}`);
  }
};

/** Nightly: every order's ledger lines must sum to its total. A mismatch fails the job loudly. */
export const reconcile: Handler = async () => {
  const { data, error } = await createAdminClient().rpc("order_ledger_mismatches");
  if (error) throw new Error(error.message);
  if (data?.length) {
    throw new Error(`Ledger mismatch on ${data.length} order(s): ${data.slice(0, 5).map((m) => m.order_id).join(", ")}`);
  }
};

/** 1st of the month: pay last month's available balance to every eligible filmmaker (D40). */
export const monthlyPayouts: Handler = async (payload) => {
  const db = createAdminClient();
  const ref = payload.day ? new Date(String(payload.day)) : new Date();
  const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0));
  const { error } = await db.rpc("create_monthly_payouts", { p_period_start: isoDay(start), p_period_end: isoDay(end) });
  if (error) throw new Error(error.message);

  const { data: pending } = await db
    .from("payouts")
    .select("id, amount_cents, account_id, filmmaker_accounts(stripe_account_id)")
    .eq("status", "pending");
  const failures: string[] = [];
  for (const p of pending ?? []) {
    const acct = p.filmmaker_accounts as unknown as { stripe_account_id: string | null } | null;
    if (!acct?.stripe_account_id) continue;
    try {
      const transferId = await payments().transfer({
        stripeAccountId: acct.stripe_account_id,
        amountCents: p.amount_cents,
        reference: `payout:${p.id}`,
      });
      await db.rpc("mark_payout_paid", { p_payout: p.id, p_transfer: transferId });
    } catch (err) {
      await db.from("payouts").update({ status: "failed" }).eq("id", p.id);
      failures.push(`${p.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failures.length) throw new Error(`Payout failures: ${failures.join("; ")}`);
};

/**
 * Refunds one order (pulled film, staff decision): refund the card, reverse the ledger, and
 * if that leaves the filmmaker owing money after a payout, pull it back from the last
 * transfer (S6). Card fees aren't returned by Stripe; Umoobi absorbs them (D50).
 */
export const refundOrder: Handler = async (payload) => {
  const db = createAdminClient();
  const orderId = String(payload.order_id);
  const { data: order } = await db
    .from("orders")
    .select("id, status, account_id, stripe_payment_intent_id")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "paid") return;
  if (order.stripe_payment_intent_id) {
    await payments().refund({ paymentIntentId: order.stripe_payment_intent_id, reason: String(payload.reason ?? "refund") });
  }
  const { error } = await db.rpc("record_refund", { p_order: orderId, p_reason: String(payload.reason ?? "Refund") });
  if (error) throw new Error(error.message);

  const farFuture = isoDay(new Date(Date.now() + 365 * 86400_000));
  const { data: balance } = await db.rpc("available_balance_cents", { a: order.account_id, on_date: farFuture });
  if ((balance ?? 0) >= 0) return;

  const { data: last } = await db
    .from("payouts")
    .select("id, amount_cents, stripe_transfer_id")
    .eq("account_id", order.account_id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last?.stripe_transfer_id) return; // stays negative and nets against future sales
  const amount = Math.min(-(balance ?? 0), last.amount_cents);
  await payments().reverseTransfer({ transferId: last.stripe_transfer_id, amountCents: amount, reference: `reversal:${orderId}` });
  await db.rpc("record_transfer_reversal", { p_account: order.account_id, p_amount: amount, p_payout: last.id });
};

/** Nightly: restore films whose counter-notice window has passed (DMCA §512(g)). */
export const takedownRestore: Handler = async () => {
  const db = createAdminClient();
  const today = isoDay(new Date());
  const { data } = await db.from("takedowns").select("id, film_id").eq("status", "counter_received").lte("restore_after", today);
  for (const t of data ?? []) {
    if (t.film_id) await db.from("films").update({ status: "published" }).eq("id", t.film_id).eq("status", "hidden");
    await db.from("takedowns").update({ status: "restored" }).eq("id", t.id);
  }
};
