"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { payments, stripeTaxCode } from "@/lib/payments";
import { checkoutPaid } from "@/lib/payments/events";
import { sessionId } from "@/lib/session/sid";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CheckoutState {
  error: string | null;
}

/**
 * Creates a pending order and sends the viewer to hosted checkout (D43). Fulfillment
 * happens only when payment is confirmed (webhook or dev provider), never here. Free
 * films under 5 minutes skip payment (D52).
 */
export async function startCheckout(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const offerId = String(form.get("offer_id") ?? "");
  const user = await requireUser(`/checkout/${offerId}`);
  const db = createAdminClient();

  const { data: offer, error: offerError } = await db
    .from("offers")
    .select("id, kind, price_cents, active, film:films!inner(id, slug, title, account_id)")
    .eq("id", offerId)
    .maybeSingle();
  if (offerError) return { error: "Couldn't start checkout. Try again." };
  if (!offer || !offer.active) return { error: "This offer is no longer available." };
  const film = offer.film;

  const licenseAck = form.get("license_ack") === "on";
  if (offer.kind === "buy" && !licenseAck) {
    return { error: "Tick the box to confirm you understand buying is a license." };
  }

  const [{ data: purchasable }, { data: owned }] = await Promise.all([
    db.rpc("film_is_purchasable", { f: film.id }),
    // Already own it? Go watch instead of paying twice.
    db
      .from("entitlements")
      .select("id")
      .eq("viewer_id", user.id)
      .eq("film_id", film.id)
      .eq("kind", "buy")
      .is("revoked_at", null)
      .maybeSingle(),
  ]);
  if (!purchasable) return { error: "This film isn't available right now." };
  if (owned) redirect(`/watch/${film.slug}`);

  const { data: order, error } = await db
    .from("orders")
    .insert({
      viewer_id: user.id,
      offer_id: offer.id,
      film_id: film.id,
      account_id: film.account_id,
      kind: offer.kind as "rent" | "buy",
      subtotal_cents: offer.price_cents,
      license_ack_at: offer.kind === "buy" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !order) return { error: "Couldn't start checkout. Try again." };

  // Anonymous funnel event: session id + film, never the viewer (D38). Runs alongside the
  // next step (Supabase builders only execute when awaited).
  const funnel = db.from("page_events").insert({ session_id: await sessionId(), film_id: film.id, event: "checkout_start" });

  const successUrl = `${siteUrl}/checkout/success?order=${order.id}`;
  if (offer.price_cents === 0) {
    await Promise.all([
      funnel,
      checkoutPaid({ orderId: order.id, paymentIntentId: `free_${order.id}`, chargeId: null, taxCents: 0, processingCents: 0 }),
    ]);
    redirect(`/checkout/success?order=${order.id}`);
  }

  const [, session] = await Promise.all([funnel, payments().createCheckout({
    orderId: order.id,
    filmTitle: film.title,
    offerKind: offer.kind as "rent" | "buy",
    priceCents: offer.price_cents,
    taxCode: stripeTaxCode(offer.kind as "rent" | "buy"),
    customerEmail: user.email,
    successUrl,
    cancelUrl: `${siteUrl}/checkout/${offer.id}?canceled=1`,
  })]);
  await db.from("orders").update({ stripe_checkout_session_id: session.sessionId }).eq("id", order.id);
  redirect(session.url);
}
