import "server-only";
import Stripe from "stripe";
import type { CheckoutInput, IdentityResult, PaymentsProvider, TransferInput } from "./types";

/**
 * Stripe: hosted Checkout with Stripe Tax as the marketplace (D43), separate charges and
 * transfers to Accounts v2 recipient accounts with Stripe-hosted onboarding, Stripe Identity
 * for the ID step. Fees are kept by transferring less than the charge, never with
 * application_fee_amount.
 */
export class StripePayments implements PaymentsProvider {
  readonly name = "stripe" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async startIdentityCheck({ accountId, email, returnUrl }: { accountId: string; email: string | null; returnUrl: string }) {
    const session = await this.stripe.identity.verificationSessions.create({
      type: "document",
      options: { document: { require_matching_selfie: true } },
      provided_details: email ? { email } : undefined,
      metadata: { account_id: accountId },
      return_url: returnUrl,
    });
    return { sessionId: session.id, url: session.url! };
  }

  async getIdentity(sessionId: string): Promise<IdentityResult> {
    const s = await this.stripe.identity.verificationSessions.retrieve(sessionId, { expand: ["verified_outputs"] });
    const out = s.verified_outputs;
    const name = out ? [out.first_name, out.last_name].filter(Boolean).join(" ") || null : null;
    const status =
      s.status === "verified" ? "verified" : s.status === "requires_input" ? "requires_input" : s.status === "canceled" ? "canceled" : "pending";
    return { status, verifiedName: name };
  }

  async createPayoutAccount({ accountId, email, displayName }: { accountId: string; email: string | null; displayName: string }) {
    const account = await this.stripe.v2.core.accounts.create({
      contact_email: email ?? undefined,
      display_name: displayName,
      dashboard: "express",
      identity: { country: "us" },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
      metadata: { umoobi_account_id: accountId },
    });
    return account.id;
  }

  async payoutOnboardingUrl({ stripeAccountId, returnUrl, refreshUrl }: { stripeAccountId: string; returnUrl: string; refreshUrl: string }) {
    const link = await this.stripe.v2.core.accountLinks.create({
      account: stripeAccountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: { collection_options: { fields: "currently_due" }, return_url: returnUrl, refresh_url: refreshUrl },
      },
    });
    return link.url;
  }

  async payoutsReady(stripeAccountId: string) {
    const account = await this.stripe.v2.core.accounts.retrieve(stripeAccountId, { include: ["configuration.recipient"] });
    return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
  }

  async createCheckout(input: CheckoutInput) {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: input.orderId,
      customer_email: input.customerEmail ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: input.priceCents,
            tax_behavior: "exclusive", // tax is added on top of the filmmaker's price (D2)
            product_data: {
              name: `${input.offerKind === "rent" ? "Rent" : "Buy"}: ${input.filmTitle}`,
              tax_code: input.taxCode,
            },
          },
        },
      ],
      automatic_tax: { enabled: true, liability: { type: "self" } },
      payment_intent_data: { metadata: { order_id: input.orderId }, transfer_group: `order_${input.orderId}` },
      metadata: { order_id: input.orderId },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { sessionId: session.id, url: session.url! };
  }

  async refund({ paymentIntentId, reason }: { paymentIntentId: string; reason: string }) {
    await this.stripe.refunds.create(
      { payment_intent: paymentIntentId, metadata: { reason } },
      { idempotencyKey: `refund:${paymentIntentId}` },
    );
  }

  async transfer({ stripeAccountId, amountCents, reference }: TransferInput) {
    const t = await this.stripe.transfers.create(
      { amount: amountCents, currency: "usd", destination: stripeAccountId, description: reference, metadata: { reference } },
      { idempotencyKey: reference },
    );
    return t.id;
  }

  async reverseTransfer({ transferId, amountCents, reference }: { transferId: string; amountCents: number; reference: string }) {
    await this.stripe.transfers.createReversal(transferId, { amount: amountCents, metadata: { reference } }, { idempotencyKey: reference });
  }

  async expressDashboardUrl(stripeAccountId: string) {
    const link = await this.stripe.accounts.createLoginLink(stripeAccountId);
    return link.url;
  }

  /** Verifies a webhook signature; throws if invalid. */
  constructEvent(body: string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(body, signature, secret);
  }

  /** The charge behind a PaymentIntent, for fee lookup and refunds. */
  async latestChargeId(paymentIntentId: string): Promise<string | null> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? null);
  }

  /** Actual Stripe fee for a charge, from its balance transaction. */
  async processingFeeCents(chargeId: string): Promise<number> {
    const charge = await this.stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
    const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
    return bt?.fee ?? 0;
  }
}
