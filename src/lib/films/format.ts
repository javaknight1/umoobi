import { formatCents } from "@/lib/money";

/** 5640 → "1 h 34 min"; 240 → "4 min". */
export function formatRuntime(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export interface OfferLike {
  kind: string;
  price_cents: number;
  rental_hours: number | null;
}

/** "Rent $4.99 · 48 h", "Buy $12.99", "Watch free". */
export function offerLabel(o: OfferLike): string {
  if (o.price_cents === 0) return "Watch free";
  const price = formatCents(o.price_cents);
  return o.kind === "rent" ? `Rent ${price} · ${o.rental_hours} h` : `Buy ${price}`;
}

/** Cheapest way in, for film cards: "From $4.99" or "Free". */
export function fromPrice(offers: OfferLike[]): string | null {
  if (!offers.length) return null;
  const min = Math.min(...offers.map((o) => o.price_cents));
  return min === 0 ? "Free" : `From ${formatCents(min)}`;
}

/** Rentals first, then buy. */
export function sortOffers<T extends OfferLike>(offers: T[]): T[] {
  return [...offers].sort((a, b) => (a.kind === b.kind ? a.price_cents - b.price_cents : a.kind === "rent" ? -1 : 1));
}

/** Shown next to every Buy button and at checkout (AB 2426, D39). */
export const LICENSE_STATEMENT =
  "Buying gets you a license to watch, not ownership. If the filmmaker pulls the film or Umoobi closes, access can end.";
