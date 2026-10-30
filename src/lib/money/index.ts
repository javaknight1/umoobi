/**
 * Money is integer cents everywhere. These helpers mirror the Postgres functions
 * `fee_cents` and `estimated_processing_cents` so price editors can preview a sale;
 * the database stays the source of truth for real sales.
 */

export const MIN_PAID_PRICE_CENTS = 99; // D22
export const FREE_MAX_RUNTIME_SECONDS = 300; // D17
export const DEFAULT_FEE_BPS = 1000; // D2
export const FOUNDING_FEE_BPS = 500; // D35
export const MIN_FEE_CENTS = 25; // D34
export const RESERVE_BPS = 1000; // D37

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

/** Parses "$4.99", "4.99" or "4" into cents; null when it isn't a price. */
export function parsePriceToCents(input: string): number | null {
  const m = input.trim().replace(/^\$/, "").match(/^(\d{1,5})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

/** Postgres `round()` on numerics rounds half away from zero; Math.round rounds half up. Same for positives. */
function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n));
}

export function feeCents(subtotalCents: number, feeBps = DEFAULT_FEE_BPS): number {
  if (subtotalCents === 0) return 0;
  return Math.min(subtotalCents, Math.max(MIN_FEE_CENTS, roundHalfUp((subtotalCents * feeBps) / 10000)));
}

/** Estimated card fee: 2.9% + 30¢ (Stripe US cards). The filmmaker pays it (D31). */
export function estimatedProcessingCents(totalCents: number): number {
  if (totalCents === 0) return 0;
  return roundHalfUp(totalCents * 0.029) + 30;
}

export interface SalePreview {
  priceCents: number;
  feeCents: number;
  processingCents: number;
  netCents: number;
}

/** What the filmmaker gets from one sale, before tax (tax is added on top for the buyer). */
export function previewSale(priceCents: number, feeBps = DEFAULT_FEE_BPS): SalePreview {
  const fee = feeCents(priceCents, feeBps);
  // Card fees are charged on what the buyer pays; the preview ignores tax, which varies by state.
  const processing = estimatedProcessingCents(priceCents);
  return { priceCents, feeCents: fee, processingCents: processing, netCents: priceCents - fee - processing };
}

export type PriceError = "below_floor" | "free_not_allowed" | null;

/** Same rule as the `offers_rules` trigger, for instant form feedback. */
export function validatePrice(priceCents: number, runtimeSeconds: number | null): PriceError {
  if (priceCents === 0) {
    return runtimeSeconds !== null && runtimeSeconds < FREE_MAX_RUNTIME_SECONDS ? null : "free_not_allowed";
  }
  return priceCents < MIN_PAID_PRICE_CENTS ? "below_floor" : null;
}
