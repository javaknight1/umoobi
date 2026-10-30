import { describe, expect, it } from "vitest";
import { parseRegion, parseSource } from "./source";

describe("parseSource", () => {
  it("prefers ref and utm_source", () => {
    expect(parseSource({ ref: "Instagram", referrer: "https://t.co/x" })).toBe("instagram");
    expect(parseSource({ utmSource: "newsletter" })).toBe("newsletter");
  });

  it("maps referrers", () => {
    expect(parseSource({ referrer: "https://l.instagram.com/?u=1" })).toBe("instagram");
    expect(parseSource({ referrer: "https://www.letterboxd.com/film/x" })).toBe("letterboxd");
    expect(parseSource({ referrer: "https://umoobi.com/discover", siteHost: "umoobi.com" })).toBe("umoobi");
    expect(parseSource({ referrer: "https://blog.example.org/post" })).toBe("blog.example.org");
  });

  it("falls back to direct", () => {
    expect(parseSource({})).toBe("direct");
    expect(parseSource({ referrer: "not a url" })).toBe("direct");
  });
});

describe("parseRegion", () => {
  it("keeps US states only", () => {
    expect(parseRegion("US", "CA")).toBe("CA");
    expect(parseRegion(null, "us-hi")).toBe("HI");
    expect(parseRegion("CA", "ON")).toBeNull();
    expect(parseRegion("US", null)).toBeNull();
  });
});
