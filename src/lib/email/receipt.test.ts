import { describe, expect, it } from "vitest";
import { receiptEmail } from "./receipt";

const base = {
  to: "jordan@umoobi.test",
  orderId: "o1",
  filmTitle: "Salt & Static",
  subtotalCents: 1299,
  taxCents: 117,
  totalCents: 1416,
  rentalHours: null,
  libraryUrl: "https://umoobi.test/library",
};

describe("receiptEmail", () => {
  it("repeats the license statement on a purchase", () => {
    const e = receiptEmail({ ...base, kind: "buy" });
    expect(e.subject).toBe("Your Umoobi receipt: Salt & Static");
    expect(e.text).toContain("Total: $14.16");
    expect(e.text).toContain("license to stream");
    expect(e.html).toContain("Salt &amp; Static");
  });

  it("explains the rental window on a rental", () => {
    const e = receiptEmail({ ...base, kind: "rent", subtotalCents: 499, taxCents: 35, totalCents: 534, rentalHours: 48 });
    expect(e.text).toContain("48 hours to finish");
    expect(e.text).not.toContain("license to stream");
  });
});
