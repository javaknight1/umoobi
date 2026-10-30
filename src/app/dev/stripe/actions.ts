"use server";

import { redirect } from "next/navigation";
import { estimatedProcessingCents } from "@/lib/money";
import { assertDevPayments } from "@/lib/payments/dev-guard";
import { checkoutExpired, checkoutPaid, identityUpdated, payoutAccountUpdated } from "@/lib/payments/events";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only same-site return URLs. */
function back(url: FormDataEntryValue | null) {
  const s = String(url ?? "");
  return s.startsWith(siteUrl) || s.startsWith("/") ? s : "/";
}

export async function completeIdentity(form: FormData) {
  assertDevPayments();
  const accountId = String(form.get("session") ?? "").replace("vs_dev_", "");
  const outcome = form.get("outcome") === "verified" ? "verified" : "requires_input";
  await createAdminClient().from("filmmaker_accounts").update({ identity_status: outcome }).eq("id", accountId);
  await identityUpdated(accountId);
  redirect(back(form.get("return")));
}

export async function completeOnboarding(form: FormData) {
  assertDevPayments();
  const stripeAccountId = String(form.get("account") ?? "");
  await createAdminClient().from("filmmaker_accounts").update({ payouts_enabled: true }).eq("stripe_account_id", stripeAccountId);
  await payoutAccountUpdated(stripeAccountId);
  redirect(back(form.get("return")));
}

/** Dev tax: a flat 7% so receipts and statements show a tax line. */
export async function completeCheckout(form: FormData) {
  assertDevPayments();
  const orderId = String(form.get("order") ?? "");
  if (form.get("outcome") !== "pay") {
    await checkoutExpired(orderId);
    redirect(back(form.get("cancel")));
  }
  const { data: order } = await createAdminClient().from("orders").select("subtotal_cents").eq("id", orderId).single();
  if (!order) redirect("/");
  const tax = Math.round(order.subtotal_cents * 0.07);
  await checkoutPaid({
    orderId,
    paymentIntentId: `pi_dev_${orderId}`,
    chargeId: `ch_dev_${orderId}`,
    taxCents: tax,
    processingCents: estimatedProcessingCents(order.subtotal_cents + tax),
  });
  redirect(back(form.get("success")));
}
