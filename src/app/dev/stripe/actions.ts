"use server";

import { redirect } from "next/navigation";
import { estimatedProcessingCents } from "@/lib/money";
import { assertDevPayments } from "@/lib/payments/dev-guard";
import { checkoutExpired, checkoutPaid, identityUpdated, payoutAccountUpdated } from "@/lib/payments/events";
import { safeNextPath } from "@/lib/auth/next-path";
import { siteUrl } from "@/lib/site";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/** Only same-site return paths (full URLs on this site are reduced to their path). */
function back(url: FormDataEntryValue | null) {
  const raw = String(url ?? "");
  return safeNextPath(raw.startsWith(`${siteUrl}/`) ? raw.slice(siteUrl.length) : raw);
}

/** Even in dev, only the signed-in owner can complete their own hosted steps. */
async function assertOwnsAccount(column: "id" | "stripe_account_id", value: string) {
  const user = await requireUser("/filmmakers/apply");
  const { data } = await createAdminClient().from("filmmaker_accounts").select("id").eq(column, value).eq("owner_id", user.id).maybeSingle();
  if (!data) redirect("/filmmakers/apply");
}

export async function completeIdentity(form: FormData) {
  assertDevPayments();
  const accountId = String(form.get("session") ?? "").replace("vs_dev_", "");
  await assertOwnsAccount("id", accountId);
  const outcome = form.get("outcome") === "verified" ? "verified" : "requires_input";
  await createAdminClient().from("filmmaker_accounts").update({ identity_status: outcome }).eq("id", accountId);
  await identityUpdated(accountId);
  redirect(back(form.get("return")));
}

export async function completeOnboarding(form: FormData) {
  assertDevPayments();
  const stripeAccountId = String(form.get("account") ?? "");
  await assertOwnsAccount("stripe_account_id", stripeAccountId);
  await createAdminClient().from("filmmaker_accounts").update({ payouts_enabled: true }).eq("stripe_account_id", stripeAccountId);
  await payoutAccountUpdated(stripeAccountId);
  redirect(back(form.get("return")));
}

/** Dev tax: a flat 7% so receipts and statements show a tax line. */
export async function completeCheckout(form: FormData) {
  assertDevPayments();
  const orderId = String(form.get("order") ?? "");
  const user = await requireUser("/");
  const { data: mine } = await createAdminClient().from("orders").select("id").eq("id", orderId).eq("viewer_id", user.id).maybeSingle();
  if (!mine) redirect("/");
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
