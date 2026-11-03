import { describe, expect, it } from "vitest";
import { openDuringWaitlist } from "./launch";

describe("openDuringWaitlist", () => {
  it("serves the pre-launch pages", () => {
    for (const p of ["/", "/waitlist/confirm", "/waitlist/confirmed", "/guides/leaving-vimeo-on-demand", "/legal/terms", "/dmca", "/sign-in", "/auth/callback", "/staff/waitlist", "/staff/waitlist/export", "/settings/security", "/robots.txt", "/sitemap.xml"]) {
      expect(openDuringWaitlist(p), p).toBe(true);
    }
  });

  it("closes the marketplace", () => {
    for (const p of ["/discover", "/f/salt-and-static", "/checkout/abc", "/studio", "/filmmakers/apply", "/staff", "/staff/payouts", "/library", "/api/webhooks/stripe", "/dev/stripe/checkout", "/waitlistx"]) {
      expect(openDuringWaitlist(p), p).toBe(false);
    }
  });
});
