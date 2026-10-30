import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";

test.beforeAll(async () => {
  // Roll up the seeded page events for the last 30 days (the nightly job does this in production).
  for (let i = 0; i < 31; i++) {
    await admin.rpc("rollup_film_day", { p_day: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10) });
  }
});

test("Maya sees her last 30 days, statement and analytics", async ({ page }) => {
  await signInAs(page, "maya@umoobi.test", { next: "/studio" });
  await expect(page.getByRole("heading", { name: "Last 30 days" })).toBeVisible();
  await expect(page.locator("figcaption", { hasText: "Daily sales" })).toBeVisible();

  await page.getByRole("link", { name: "Money" }).click();
  await expect(page.getByRole("heading", { name: "Money" })).toBeVisible();
  const row = page.locator("tr", { hasText: "Salt & Static" }).filter({ hasText: "Rental" }).first();
  await expect(row).toContainText("$4.99");
  await expect(row).toContainText("−$0.50");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV" }).click();
  const csv = await (await download).createReadStream();
  const text = await new Promise<string>((res) => {
    let s = "";
    csv.on("data", (c) => (s += c));
    csv.on("end", () => res(s));
  });
  expect(text.split("\n")[0]).toBe("order_ref,paid_at,film_title,kind,status,price_cents,fee_cents,processing_cents,net_cents,refunded_at");
  expect(text).not.toContain("jordan");

  await page.goto("/studio/analytics?film=c0000000-0000-0000-0000-000000000001");
  await expect(page.locator("figcaption", { hasText: "From visit to sale" })).toBeVisible();
  await expect(page.locator("figcaption", { hasText: "Where visitors came from" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Where visitors came from" }).getByText("instagram", { exact: true })).toBeVisible();
});

test("a viewer can't open the studio", async ({ page }) => {
  await signInAs(page, "jordan@umoobi.test", { next: "/studio" });
  await expect(page).toHaveURL(/\/filmmakers\/apply/);
});
