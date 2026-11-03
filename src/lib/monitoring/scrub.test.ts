import { describe, expect, it } from "vitest";
import { scrubEvent, scrubPath } from "./scrub";

describe("error report scrubbing (VPPA)", () => {
  it("hides which film or person a URL was about", () => {
    expect(scrubPath("/watch/salt-and-static")).toBe("/watch/[id]");
    expect(scrubPath("/f/salt-and-static?ref=ig")).toBe("/f/[id]");
    expect(scrubPath("/p/leilani-kahale")).toBe("/p/[id]");
    expect(scrubPath("/checkout/d000")).toBe("/checkout/[id]");
    expect(scrubPath("/studio/money")).toBe("/studio/money");
  });

  it("drops user, cookies, query and identifying headers", () => {
    const e = scrubEvent({
      user: { id: "u1", ip_address: "1.2.3.4" },
      request: {
        url: "https://umoobi.sharkfins.xyz/watch/salt-and-static?t=1",
        cookies: { sb: "x" },
        query_string: "t=1",
        headers: { "user-agent": "UA", cookie: "sb=x", "x-forwarded-for": "1.2.3.4", "x-vercel-ip-country-region": "CA" },
      },
    });
    expect(e.user).toBeUndefined();
    expect(e.request).toEqual({ url: "https://umoobi.sharkfins.xyz/watch/[id]", headers: { "user-agent": "UA" } });
  });
});
