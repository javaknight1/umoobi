import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";
import { uniqueEmail } from "./helpers";

test("a rights holder files a DMCA notice and it reaches the staff queue", async ({ page }) => {
  const name = `Claimant ${Date.now()}`;
  await page.goto("/dmca");
  await page.getByLabel("Your full name", { exact: true }).fill(name);
  await page.getByLabel("Email").fill("rights@studio.test");
  await page.getByLabel("The copyrighted work").fill("My short film, registered 2024");
  await page.getByLabel("Link to the material on Umoobi").fill("http://localhost:3100/f/tidepool");
  await page.getByLabel(/good-faith belief/).check();
  await page.getByLabel(/penalty of perjury/).check();
  await page.getByLabel("Signature (type your full name)").fill(name);
  await page.getByRole("button", { name: "Send notice" }).click();
  await expect(page.getByRole("status")).toContainText("Notice received");
  const { data } = await admin.from("takedowns").select("id, film_id").eq("claimant_name", name).single();
  expect(data?.film_id).toBe("c0000000-0000-0000-0000-000000000002");
  const { count } = await admin.from("review_items").select("*", { count: "exact", head: true }).like("reason", `%${data!.id}%`);
  expect(count).toBe(1);
});

test("the license page says buying is a license, not ownership", async ({ page }) => {
  await page.goto("/legal/license");
  await expect(page.getByText("Buying a film on Umoobi gets you a license to watch it, not ownership of it.")).toBeVisible();
});

test("a buyer shares identity with one filmmaker and withdraws it", async ({ page }) => {
  // A fresh buyer with one paid purchase of Night Shift (Rosa Diaz Films), so parallel runs don't collide.
  const user = await signInAs(page, uniqueEmail("buyer"), { next: "/settings/sharing" });
  const { data: order } = await admin
    .from("orders")
    .insert({
      viewer_id: user.id,
      offer_id: "d0000000-0000-0000-0000-000000000005",
      film_id: "c0000000-0000-0000-0000-000000000003",
      account_id: "b0000000-0000-0000-0000-000000000002",
      kind: "buy",
      subtotal_cents: 999,
      license_ack_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  await admin.rpc("record_sale", { p_order: order!.id, p_tax_cents: 70, p_processing_cents: 61, p_payment_intent: `pi_e2e_${order!.id}`, p_charge: "" });
  await page.reload();
  const card = page.locator("li", { hasText: "Rosa Diaz Films" });
  await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Share with Rosa Diaz Films" }).click();
  await expect(card.getByText(/Sharing your name and email until/)).toBeVisible();
  await card.getByRole("button", { name: "Stop sharing" }).click();
  await expect(card.getByRole("button", { name: "Share with Rosa Diaz Films" })).toBeVisible();
});
