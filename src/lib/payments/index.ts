import "server-only";
import { DevPayments } from "./dev";
import { StripePayments } from "./stripe";
import type { PaymentsProvider } from "./types";

/** Dev providers are allowed outside production, or on previews that opt in. */
export function devProvidersAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_PROVIDERS === "true";
}

let cached: PaymentsProvider | undefined;

export function payments(): PaymentsProvider {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) cached = new StripePayments(key);
  else if (devProvidersAllowed()) cached = new DevPayments();
  else throw new Error("STRIPE_SECRET_KEY is not set");
  return cached;
}

export function stripeTaxCode(kind: "rent" | "buy", withDownload = false): string {
  // Stripe tax codes: streamed rentals and buys vs. buy-with-download (V1) — Technical Requirements.
  return kind === "buy" && withDownload ? "txcd_10804003" : "txcd_10402000";
}

export type { PaymentsProvider } from "./types";
