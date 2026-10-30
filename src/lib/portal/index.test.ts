import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { dailyTotals, monthBounds, nextPayoutDate } = await import("./index");

describe("portal helpers", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("zero-fills daily totals", () => {
    const t = dailyTotals(
      [
        { paid_at: "2026-10-30T01:00:00Z", price_cents: 499 },
        { paid_at: "2026-10-30T02:00:00Z", price_cents: 1299 },
        { paid_at: "2026-10-01T02:00:00Z", price_cents: 5 },
      ] as never,
      3,
      now,
      (l) => l.price_cents,
    );
    expect(t).toEqual([
      { label: "10-28", value: 0 },
      { label: "10-29", value: 0 },
      { label: "10-30", value: 1798 },
    ]);
  });

  it("pays out on the 1st of next month", () => {
    expect(nextPayoutDate(now).toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(nextPayoutDate(new Date("2026-12-15")).toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("parses statement months", () => {
    expect(monthBounds("2026-09", now)).toMatchObject({ label: "2026-09" });
    expect(monthBounds("junk", now).label).toBe("2026-10");
  });
});
