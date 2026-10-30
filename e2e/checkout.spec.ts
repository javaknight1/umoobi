import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { admin, signInAs } from "./db";
import { appEmail, uniqueEmail } from "./helpers";
import { signInSeeded } from "./seeded";

const SALT_RENT = "d0000000-0000-0000-0000-000000000001";
const SALT_BUY = "d0000000-0000-0000-0000-000000000002";
const TIDEPOOL_FREE = "d0000000-0000-0000-0000-000000000003";
const LOW_WATER = "c0000000-0000-0000-0000-000000000005"; // Maya's draft film

const cronSecret = readFileSync(join(process.cwd(), ".env.local"), "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1] ?? "";

async function runWorker(request: APIRequestContext) {
  const res = await request.get("/api/cron/worker", { headers: { authorization: `Bearer ${cronSecret}` } });
  expect(res.ok()).toBe(true);
}

async function noLedgerMismatches() {
  const { data, error } = await admin.rpc("order_ledger_mismatches");
  expect(error).toBeNull();
  expect(data).toEqual([]);
}

test("a viewer buys Salt & Static after acknowledging the license, then watches it", async ({ page, request }) => {
  const email = uniqueEmail("jordan");
  await signInAs(page, email, { next: `/checkout/${SALT_BUY}` });
  await expect(page.getByRole("heading", { name: "Salt & Static" })).toBeVisible();
  await expect(page.getByText("Added at checkout")).toBeVisible();

  const buy = page.getByRole("button", { name: "Buy for $12.99" });
  await expect(buy).toBeDisabled();
  const ack = page.getByRole("checkbox", { name: /buying a license to stream/ });
  await expect(ack).not.toBeChecked();
  await ack.check();
  await expect(buy).toBeEnabled();
  await buy.click();

  await expect(page.getByRole("heading", { name: "Checkout (dev)" })).toBeVisible();
  await expect(page.getByText("$13.90")).toBeVisible(); // $12.99 + 7% dev tax
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByRole("heading", { name: "Enjoy the film." })).toBeVisible();

  await page.getByRole("link", { name: "Your library" }).click();
  const purchases = page.locator("section", { has: page.getByRole("heading", { name: "Purchases" }) });
  await expect(purchases.getByRole("link", { name: "Salt & Static", exact: true })).toBeVisible();

  await purchases.getByRole("link", { name: "Watch Salt & Static" }).click();
  await page.getByRole("button", { name: "Play Salt & Static" }).click();
  await expect(page.locator("mux-player")).toBeVisible();

  await noLedgerMismatches();
  const { data: user } = await admin.from("orders").select("license_ack_at, status, total_cents").eq("offer_id", SALT_BUY).order("created_at", { ascending: false }).limit(1).single();
  expect(user).toMatchObject({ status: "paid", total_cents: 1390 });
  expect(user!.license_ack_at).not.toBeNull();

  await runWorker(request);
  const receipt = await appEmail(request, email);
  expect(receipt.subject).toBe("Your Umoobi receipt: Salt & Static");
  expect(receipt.text).toContain("license to stream");
});

test("a rental starts its 48-hour clock on first play, not at purchase", async ({ page }) => {
  const viewer = await signInAs(page, uniqueEmail("renter"), { next: `/checkout/${SALT_RENT}` });
  await expect(page.getByRole("checkbox")).toHaveCount(0); // rentals need no license box
  await page.getByRole("button", { name: "Rent for $4.99" }).click();
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByRole("heading", { name: "Enjoy the film." })).toBeVisible();

  const ent = () =>
    admin.from("entitlements").select("first_played_at, expires_at").eq("viewer_id", viewer.id).single().then((r) => r.data!);
  expect((await ent()).first_played_at).toBeNull();

  await page.goto("/library");
  await expect(page.getByText(/Starts when you press play · 48 hours to finish/)).toBeVisible();
  await page.goto("/watch/salt-and-static");
  await expect(page.getByText("Pressing play starts your 48 hours rental.")).toBeVisible();
  await page.getByRole("button", { name: "Play Salt & Static" }).click();
  await expect(page.locator("mux-player")).toBeVisible();

  const after = await ent();
  expect(after.first_played_at).not.toBeNull();
  const hours = (new Date(after.expires_at!).getTime() - new Date(after.first_played_at!).getTime()) / 3_600_000;
  expect(hours).toBe(48);
  await noLedgerMismatches();
});

test("a free short goes straight to the library without payment", async ({ page }) => {
  await signInAs(page, uniqueEmail("freebie"), { next: `/checkout/${TIDEPOOL_FREE}` });
  const add = page.getByRole("button", { name: "Add to my library" });
  await expect(add).toBeDisabled();
  await page.getByRole("checkbox", { name: /buying a license to stream/ }).check();
  await add.click();
  await expect(page.getByRole("heading", { name: "Enjoy the film." })).toBeVisible();
  await page.goto("/library");
  await expect(page.getByRole("link", { name: "Tidepool" }).first()).toBeVisible();
  await noLedgerMismatches();
});

test("canceling checkout charges nothing", async ({ page }) => {
  await signInAs(page, uniqueEmail("canceler"), { next: `/checkout/${SALT_RENT}` });
  await page.getByRole("button", { name: "Rent for $4.99" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Checkout was canceled. You haven't been charged.")).toBeVisible();
});

test("checkout asks visitors to sign in first", async ({ page }) => {
  await page.goto(`/checkout/${SALT_BUY}`);
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout%2F/);
});

test("a filmmaker sets prices with a live per-sale preview, and $0.50 is refused", async ({ page, request }) => {
  await signInSeeded(page, "maya@umoobi.test", `/studio/films/${LOW_WATER}/pricing`);
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();

  await page.getByRole("checkbox", { name: "Offer rent" }).check();
  await page.getByLabel("Rent price").fill("4.99");
  const preview = page.getByLabel("Rent per-sale preview");
  await expect(preview).toContainText("You earn per sale");
  await expect(preview).toContainText("$4.05");

  await page.getByLabel("Rent price").fill("0.50");
  await expect(page.getByText("The lowest price is $0.99.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save prices" })).toBeDisabled();

  await page.getByLabel("Rent price").fill("3.99");
  await page.getByRole("checkbox", { name: "Offer buy" }).check();
  await page.getByLabel("Buy price").fill("9.99");
  await page.getByRole("button", { name: "Save prices" }).click();
  await expect(page.getByRole("status")).toHaveText("Prices saved.");

  // The database refuses it too, whatever the form does.
  const res = await page.request.put(`/api/films/${LOW_WATER}/offers`, {
    data: { rent: { priceCents: 50, hours: 48 }, buy: null },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).error).toContain("$0.99");
  void request;
});
