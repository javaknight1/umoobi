import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import type { CheckoutInput, IdentityResult, PaymentsProvider } from "./types";

/**
 * Local stand-in for Stripe (D49). Hosted steps (Identity, onboarding, Checkout) become
 * small pages under /dev/stripe that record the outcome and redirect back, so the rest of
 * the app runs the same code paths as production.
 */
export class DevPayments implements PaymentsProvider {
  readonly name = "dev" as const;

  async startIdentityCheck({ accountId, returnUrl }: { accountId: string; returnUrl: string }) {
    const sessionId = `vs_dev_${accountId}`;
    const url = `${siteUrl}/dev/stripe/identity?session=${sessionId}&return=${encodeURIComponent(returnUrl)}`;
    return { sessionId, url };
  }

  async getIdentity(sessionId: string): Promise<IdentityResult> {
    const accountId = sessionId.replace("vs_dev_", "");
    const { data } = await createAdminClient()
      .from("filmmaker_accounts")
      .select("identity_status, legal_name")
      .eq("id", accountId)
      .maybeSingle();
    const status = (data?.identity_status ?? "pending") as IdentityResult["status"];
    return { status, verifiedName: status === "verified" ? (data?.legal_name ?? null) : null };
  }

  async createPayoutAccount({ accountId }: { accountId: string }) {
    return `acct_dev_${accountId.replace(/-/g, "").slice(0, 16)}`;
  }

  async payoutOnboardingUrl({ stripeAccountId, returnUrl }: { stripeAccountId: string; returnUrl: string }) {
    return `${siteUrl}/dev/stripe/onboarding?account=${stripeAccountId}&return=${encodeURIComponent(returnUrl)}`;
  }

  async payoutsReady(stripeAccountId: string) {
    const { data } = await createAdminClient()
      .from("filmmaker_accounts")
      .select("payouts_enabled")
      .eq("stripe_account_id", stripeAccountId)
      .maybeSingle();
    return !!data?.payouts_enabled;
  }

  async createCheckout(input: CheckoutInput) {
    const sessionId = `cs_dev_${input.orderId}`;
    const q = new URLSearchParams({ session: sessionId, order: input.orderId, success: input.successUrl, cancel: input.cancelUrl });
    return { sessionId, url: `${siteUrl}/dev/stripe/checkout?${q}` };
  }

  async refund() {}

  async transfer({ reference }: { reference: string }) {
    return `tr_dev_${Buffer.from(reference).toString("hex").slice(0, 20)}`;
  }

  async reverseTransfer() {}

  async expressDashboardUrl() {
    return null;
  }
}
