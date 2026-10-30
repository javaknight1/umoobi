import { expect, test } from "@playwright/test";
import { admin, signInAs, signInStaff } from "./db";
import { uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

test("staff action a DMCA notice, then record a counter-notice", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough for shared seed data");
  // A throwaway published film so the shared seed films stay up.
  const title = `Disputed Short ${Date.now()}`;
  const { data: film } = await admin
    .from("films")
    .insert({ account_id: "b0000000-0000-0000-0000-000000000002", slug: `dmca-${Date.now()}`, title, runtime_seconds: 200, status: "published", vetting_score: 90 })
    .select("id, slug")
    .single();
  const { data: notice } = await admin
    .from("takedowns")
    .insert({ film_id: film!.id, claimant_name: "Rights Co", claimant_email: "legal@rights.test", work_described: "Our short", infringing_url: `/f/${film!.slug}`, good_faith: true, signature: "Rights Co" })
    .select("id")
    .single();

  await signInStaff(page, "/staff/takedowns");
  const card = page.locator("li", { hasText: title });
  await card.getByRole("button", { name: "Valid: take down and strike" }).click();
  await expect(card).toContainText("actioned");
  const { data: hidden } = await admin.from("films").select("status").eq("id", film!.id).single();
  expect(hidden?.status).toBe("hidden");
  const { count } = await admin.from("strikes").select("*", { count: "exact", head: true }).eq("film_id", film!.id);
  expect(count).toBe(1);

  await card.getByLabel("Counter-notice received").fill("I own the rights; signed statement attached.");
  await card.getByRole("button", { name: "Record counter-notice" }).click();
  await expect(card).toContainText("Restores on");
  const { data: t } = await admin.from("takedowns").select("status, restore_after").eq("id", notice!.id).single();
  expect(t?.status).toBe("counter_received");
});

test("staff hold and release a filmmaker's payouts", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  const owner = await admin.auth.admin.createUser({ email: uniqueEmail("holdme"), email_confirm: true });
  const name = `Hold Test ${Date.now()}`;
  const { data: acct } = await admin
    .from("filmmaker_accounts")
    .insert({ owner_id: owner.data.user!.id, display_name: name, slug: `hold-${Date.now()}`, status: "approved", payouts_enabled: true })
    .select("id")
    .single();
  await signInStaff(page, "/staff/payouts");
  const row = page.locator("tr", { hasText: name });
  await row.getByRole("button", { name: "Hold payouts" }).click();
  await expect(row.getByRole("button", { name: "Release hold" })).toBeVisible();
  expect((await admin.from("filmmaker_accounts").select("payout_hold").eq("id", acct!.id).single()).data?.payout_hold).toBe(true);
  await row.getByRole("button", { name: "Release hold" }).click();
  await expect(row.getByRole("button", { name: "Hold payouts" })).toBeVisible();
});

test("viewers can't reach staff tools", async ({ page }) => {
  await signInAs(page, uniqueEmail("viewer"), { next: "/staff/takedowns" });
  await expect(page).not.toHaveURL(/\/staff/);
});
