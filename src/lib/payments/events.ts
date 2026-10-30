import "server-only";
import { evaluateAccount } from "@/lib/onboarding/evaluate";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Provider-neutral handlers. The Stripe webhook and the dev provider both call these, so
 * fulfillment and onboarding run the same code locally and in production.
 */

export async function identityUpdated(accountId: string) {
  await evaluateAccount(accountId);
}

export async function payoutAccountUpdated(stripeAccountId: string) {
  const { data } = await createAdminClient()
    .from("filmmaker_accounts")
    .select("id")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();
  if (data) await evaluateAccount(data.id);
}

export interface PaidCheckout {
  orderId: string;
  paymentIntentId: string;
  chargeId: string | null;
  taxCents: number;
  processingCents: number;
}

/** Records the sale in the ledger and grants the entitlement (idempotent in Postgres). */
export async function checkoutPaid(c: PaidCheckout) {
  const db = createAdminClient();
  const { error } = await db.rpc("record_sale", {
    p_order: c.orderId,
    p_tax_cents: c.taxCents,
    p_processing_cents: c.processingCents,
    p_payment_intent: c.paymentIntentId,
    p_charge: c.chargeId ?? "",
  });
  if (error) throw new Error(`record_sale failed: ${error.message}`);
  // Funnel count only: a fresh anonymous session id, so the purchase can't be joined back
  // to the buyer's browsing (D38).
  const { data: order } = await db.from("orders").select("film_id").eq("id", c.orderId).single();
  await Promise.all([
    order ? db.from("page_events").insert({ session_id: crypto.randomUUID(), film_id: order.film_id, event: "purchase" }) : null,
    db.from("jobs").insert({ kind: "send_receipt", payload: { order_id: c.orderId } }),
  ]);
}

export async function checkoutExpired(orderId: string) {
  await createAdminClient().from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
}

/** A refund started outside Umoobi (e.g. in the Stripe Dashboard) still reverses the ledger. */
export async function chargeRefunded(paymentIntentId: string) {
  const db = createAdminClient();
  const { data } = await db.from("orders").select("id, status").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (data?.status === "paid") await db.rpc("record_refund", { p_order: data.id, p_reason: "Refunded in Stripe" });
}
