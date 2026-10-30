import { describe, expect, it } from "vitest";
import { isOldEnough } from "./age";

describe("isOldEnough", () => {
  const now = new Date("2026-10-30");
  it("blocks under-13s", () => expect(isOldEnough(2016, now)).toBe(false));
  it("allows 13 and over", () => {
    expect(isOldEnough(2013, now)).toBe(true);
    expect(isOldEnough(1990, now)).toBe(true);
  });
});
