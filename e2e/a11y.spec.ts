import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAs } from "./db";

/** Serious and critical WCAG 2.1 AA problems fail the build; minor ones are reported only. */
async function audit(page: import("@playwright/test").Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `${name}\n${summary.join("\n")}`).toEqual([]);
}

test.describe("accessibility", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixtures argument
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one run is enough"));

  for (const [name, path] of [
    ["landing", "/"],
    ["Vimeo guide", "/guides/leaving-vimeo-on-demand"],
    ["sign-in", "/sign-in"],
    ["license", "/legal/license"],
    ["copyright notice", "/dmca"],
    ["film page", "/f/salt-and-static"],
    ["discover", "/discover"],
    ["person page", "/p/leilani-kahale"],
  ] as const) {
    test(`${name} has no serious accessibility problems`, async ({ page }) => {
      await page.goto(path);
      await audit(page, name);
    });
  }

  test("studio dashboard and checkout have no serious accessibility problems", async ({ page }) => {
    await signInAs(page, "maya@umoobi.test", { next: "/studio" });
    await audit(page, "studio dashboard");
    await page.goto("/checkout/d0000000-0000-0000-0000-000000000002");
    await audit(page, "checkout");
  });
});
