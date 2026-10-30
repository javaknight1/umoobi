import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { StripePayments } from "@/lib/payments/stripe";
import { chargeRefunded, checkoutExpired, checkoutPaid, identityUpdated, payoutAccountUpdated } from "@/lib/payments/events";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook. Verifies the signature, records the event id for idempotency, then
 * dispatches to provider-neutral handlers. Fulfillment happens here, never on the success page.
 */
export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return new NextResponse("Stripe not configured", { status: 404 });

  const stripe = new StripePayments(key);
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  const db = createAdminClient();
  const { error: dup } = await db.from("webhook_events").insert({ id: event.id, provider: "stripe", type: event.type });
  if (dup) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        const accountId = event.data.object.metadata?.account_id;
        if (accountId) await identityUpdated(accountId);
        break;
      }
      case "account.updated":
        await payoutAccountUpdated(event.data.object.id);
        break;
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        if (s.payment_status === "unpaid" || !s.metadata?.order_id) break;
        const piId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
        if (!piId) break;
        const chargeId = await stripe.latestChargeId(piId);
        await checkoutPaid({
          orderId: s.metadata.order_id,
          paymentIntentId: piId,
          chargeId,
          taxCents: s.total_details?.amount_tax ?? 0,
          processingCents: chargeId ? await stripe.processingFeeCents(chargeId) : 0,
        });
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        if (event.data.object.metadata?.order_id) await checkoutExpired(event.data.object.metadata.order_id);
        break;
      case "charge.refunded": {
        const pi = event.data.object.payment_intent;
        const piId = typeof pi === "string" ? pi : pi?.id;
        if (piId) await chargeRefunded(piId);
        break;
      }
    }
  } catch (err) {
    // Let Stripe retry: forget the event id so the retry isn't treated as a duplicate.
    await db.from("webhook_events").delete().eq("id", event.id);
    console.error("[stripe webhook]", event.type, err);
    return new NextResponse("Handler failed", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
