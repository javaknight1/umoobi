import { describe, expect, it } from "vitest";
import {
  estimatedProcessingCents,
  feeCents,
  formatCents,
  parsePriceToCents,
  previewSale,
  validatePrice,
} from "./index";

describe("money", () => {
  it("formats cents", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(499)).toBe("$4.99");
    expect(formatCents(397586)).toBe("$3,975.86");
    expect(formatCents(-25)).toBe("-$0.25");
  });

  it("parses prices", () => {
    expect(parsePriceToCents("$4.99")).toBe(499);
    expect(parsePriceToCents("12.9")).toBe(1290);
    expect(parsePriceToCents("4")).toBe(400);
    expect(parsePriceToCents("4.999")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
  });

  it("takes the greater of 10% or 25¢, never more than the price (D2, D34)", () => {
    expect(feeCents(499)).toBe(50);
    expect(feeCents(1299)).toBe(130);
    expect(feeCents(99)).toBe(25);
    expect(feeCents(0)).toBe(0);
    expect(feeCents(1299, 500)).toBe(65);
  });

  it("estimates card fees at 2.9% + 30¢", () => {
    expect(estimatedProcessingCents(499)).toBe(44);
    expect(estimatedProcessingCents(0)).toBe(0);
  });

  it("previews Maya's $4.99 rental", () => {
    expect(previewSale(499)).toEqual({ priceCents: 499, feeCents: 50, processingCents: 44, netCents: 405 });
  });

  it("matches the database price rules (D17, D22)", () => {
    expect(validatePrice(98, 5640)).toBe("below_floor");
    expect(validatePrice(99, 5640)).toBeNull();
    expect(validatePrice(0, 5640)).toBe("free_not_allowed");
    expect(validatePrice(0, 240)).toBeNull();
    expect(validatePrice(0, null)).toBe("free_not_allowed");
  });
});
