import { describe, expect, it } from "vitest";
import { addBusinessDays, isBusinessDay } from "./business-days";

const day = (s: string) => new Date(`${s}T12:00:00Z`);

describe("business days", () => {
  it("skips weekends and federal holidays", () => {
    expect(isBusinessDay(day("2026-11-26"))).toBe(false); // Thanksgiving
    expect(isBusinessDay(day("2026-11-28"))).toBe(false); // Saturday
    expect(isBusinessDay(day("2026-11-27"))).toBe(true);
    expect(isBusinessDay(day("2026-07-03"))).toBe(false); // July 4 falls on Saturday, observed Friday
  });

  it("counts 10 business days over Thanksgiving", () => {
    // Fri Nov 20 2026 + 10 business days: Nov 23,24,25,27,30, Dec 1,2,3,4,7
    expect(addBusinessDays(day("2026-11-20"), 10).toISOString().slice(0, 10)).toBe("2026-12-07");
  });
});
