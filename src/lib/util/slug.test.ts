import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("makes DB-safe slugs", () => {
    expect(slugify("Salt & Static")).toBe("salt-and-static");
    expect(slugify("  Café   Noir! ")).toBe("cafe-noir");
    expect(slugify("!!!")).toBe("untitled");
  });
  it("finds a free slug", async () => {
    const taken = new Set(["tidepool", "tidepool-2"]);
    expect(await uniqueSlug("Tidepool", async (s) => taken.has(s))).toBe("tidepool-3");
  });
});
