import { describe, expect, it } from "vitest";
import { bpsToPercent, percentToBps, sharesState } from "./shares";

describe("revenue shares", () => {
  it("converts percent and basis points", () => {
    expect(percentToBps("60")).toBe(6000);
    expect(percentToBps("12.5%")).toBe(1250);
    expect(percentToBps("")).toBe(0);
    expect(percentToBps(101)).toBeNull();
    expect(percentToBps("x")).toBeNull();
    expect(bpsToPercent(1250)).toBe("12.5");
    expect(bpsToPercent(6000)).toBe("60");
    expect(bpsToPercent(3333)).toBe("33.33");
  });

  it("requires 100% or nothing", () => {
    expect(sharesState([6000, 2500, 1500])).toEqual({ total: 10000, state: "complete" });
    expect(sharesState([0, 0])).toEqual({ total: 0, state: "none" });
    expect(sharesState([6000, 3000]).state).toBe("incomplete");
  });
});
