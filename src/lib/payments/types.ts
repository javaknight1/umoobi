export type IdentityStatus = "none" | "pending" | "verified" | "requires_input" | "canceled";

export interface IdentityResult {
  status: IdentityStatus;
  /** Full name from the verified document, when Stripe returns it. */
  verifiedName: string | null;
}

export interface CheckoutInput {
  orderId: string;
  filmTitle: string;
  offerKind: "rent" | "buy";
  priceCents: number;
  taxCode: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface TransferInput {
  stripeAccountId: string;
  amountCents: number;
  /** Idempotency + description, e.g. "payout:<payout id>". */
  reference: string;
}

/**
 * Everything Umoobi asks of its payment processor. Stripe in production; a dev provider
 * locally when no keys are configured (D49). Webhook handling is provider-specific and
 * normalizes into `src/lib/payments/events.ts`.
 */
export interface PaymentsProvider {
  readonly name: "stripe" | "dev";
  startIdentityCheck(input: { accountId: string; email: string | null; returnUrl: string }): Promise<{ sessionId: string; url: string }>;
  getIdentity(sessionId: string): Promise<IdentityResult>;
  createPayoutAccount(input: { accountId: string; email: string | null; displayName: string }): Promise<string>;
  payoutOnboardingUrl(input: { stripeAccountId: string; returnUrl: string; refreshUrl: string }): Promise<string>;
  /** True when the connected account can receive transfers. */
  payoutsReady(stripeAccountId: string): Promise<boolean>;
  createCheckout(input: CheckoutInput): Promise<{ sessionId: string; url: string }>;
  refund(input: { paymentIntentId: string; reason: string }): Promise<void>;
  transfer(input: TransferInput): Promise<string>;
  /** Pulls money back from a connected account (refund after payout). */
  reverseTransfer(input: { transferId: string; amountCents: number; reference: string }): Promise<void>;
  expressDashboardUrl(stripeAccountId: string): Promise<string | null>;
}
