import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls: Record<string, unknown[][]> = {};
const rec = (name: string, result: unknown) =>
  vi.fn((...args: unknown[]) => {
    (calls[name] ??= []).push(args);
    return Promise.resolve(result);
  });

vi.mock("stripe", () => {
  class Stripe {
    checkout = { sessions: { create: rec("checkout", { id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" }) } };
    identity = { verificationSessions: { create: rec("identity", { id: "vs_1", url: "https://verify.stripe.com/vs_1" }), retrieve: rec("identityGet", { status: "verified", verified_outputs: { first_name: "Maya", last_name: "Okafor" } }) } };
    v2 = { core: { accounts: { create: rec("account", { id: "acct_1" }), retrieve: rec("accountGet", { configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } } } }) }, accountLinks: { create: rec("link", { url: "https://connect.stripe.com/link" }) } } };
    refunds = { create: rec("refund", {}) };
    transfers = { create: rec("transfer", { id: "tr_1" }), createReversal: rec("reversal", {}) };
  }
  return { default: Stripe };
});

const { StripePayments } = await import("./stripe");

describe("StripePayments request shapes", () => {
  beforeEach(() => {
    for (const k of Object.keys(calls)) delete calls[k];
  });
  const p = new StripePayments("sk_test_x");

  it("creates hosted Checkout with marketplace tax and no platform fee parameter", async () => {
    await p.createCheckout({
      orderId: "o1",
      filmTitle: "Salt & Static",
      offerKind: "buy",
      priceCents: 1299,
      taxCode: "txcd_10402000",
      customerEmail: "jordan@example.com",
      successUrl: "https://x/s",
      cancelUrl: "https://x/c",
    });
    const [params] = calls.checkout[0] as [Record<string, unknown>];
    expect(params).toMatchObject({
      mode: "payment",
      client_reference_id: "o1",
      automatic_tax: { enabled: true, liability: { type: "self" } },
      metadata: { order_id: "o1" },
      payment_intent_data: { metadata: { order_id: "o1" }, transfer_group: "order_o1" },
    });
    const item = (params.line_items as Record<string, any>[])[0];
    expect(item.price_data).toMatchObject({ currency: "usd", unit_amount: 1299, tax_behavior: "exclusive" });
    expect(item.price_data.product_data.tax_code).toBe("txcd_10402000");
    // Separate charges and transfers: fees are kept by transferring less, never these fields.
    expect(JSON.stringify(params)).not.toMatch(/application_fee_amount|payment_method_types/);
  });

  it("creates an Accounts v2 recipient with platform-owned fees and losses", async () => {
    await p.createPayoutAccount({ accountId: "a1", email: "maya@example.com", displayName: "Low Tide" });
    const [params] = calls.account[0] as [Record<string, any>];
    expect(params.dashboard).toBe("express");
    expect(params.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested).toBe(true);
    expect(params.configuration.merchant).toBeUndefined();
    expect(params.defaults.responsibilities).toEqual({ fees_collector: "application", losses_collector: "application" });
    expect(JSON.stringify(params)).not.toMatch(/"type":"(express|custom|standard)"/);
  });

  it("checks transfer capability, not legacy payouts_enabled", async () => {
    expect(await p.payoutsReady("acct_1")).toBe(true);
    expect(calls.accountGet[0][1]).toEqual({ include: ["configuration.recipient"] });
  });

  it("uses idempotency keys for refunds, transfers and reversals", async () => {
    await p.refund({ paymentIntentId: "pi_1", reason: "pulled" });
    await p.transfer({ stripeAccountId: "acct_1", amountCents: 500, reference: "payout:p1" });
    await p.reverseTransfer({ transferId: "tr_1", amountCents: 100, reference: "reversal:o1" });
    expect(calls.refund[0][1]).toEqual({ idempotencyKey: "refund:pi_1" });
    expect(calls.transfer[0][1]).toEqual({ idempotencyKey: "payout:p1" });
    expect(calls.reversal[0][2]).toEqual({ idempotencyKey: "reversal:o1" });
  });

  it("reads the verified name from Identity", async () => {
    expect(await p.getIdentity("vs_1")).toEqual({ status: "verified", verifiedName: "Maya Okafor" });
  });
});
