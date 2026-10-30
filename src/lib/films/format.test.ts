import { describe, expect, it } from "vitest";
import { formatRuntime, fromPrice, offerLabel, sortOffers } from "./format";

describe("film formatting", () => {
  it("formats runtimes", () => {
    expect(formatRuntime(5640)).toBe("1 h 34 min");
    expect(formatRuntime(240)).toBe("4 min");
    expect(formatRuntime(7200)).toBe("2 h");
    expect(formatRuntime(null)).toBe("");
  });

  it("labels offers", () => {
    expect(offerLabel({ kind: "rent", price_cents: 499, rental_hours: 48 })).toBe("Rent $4.99 · 48 h");
    expect(offerLabel({ kind: "buy", price_cents: 1299, rental_hours: null })).toBe("Buy $12.99");
    expect(offerLabel({ kind: "buy", price_cents: 0, rental_hours: null })).toBe("Watch free");
  });

  it("shows the cheapest price and sorts rentals first", () => {
    const offers = [
      { kind: "buy", price_cents: 1299, rental_hours: null },
      { kind: "rent", price_cents: 499, rental_hours: 48 },
    ];
    expect(fromPrice(offers)).toBe("From $4.99");
    expect(fromPrice([{ kind: "buy", price_cents: 0, rental_hours: null }])).toBe("Free");
    expect(fromPrice([])).toBeNull();
    expect(sortOffers(offers)[0].kind).toBe("rent");
  });
});
