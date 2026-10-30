import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";
import { uniqueEmail } from "./helpers";

test("a filmmaker applies, passes the ID check, sets up payouts and is approved", async ({ page }) => {
  const email = uniqueEmail("maya");
  const user = await signInAs(page, email, { next: "/filmmakers/apply" });
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();

  await page.getByLabel("Filmmaker or company name").fill("Low Tide Pictures");
  await page.getByLabel("Your legal name").fill("Maya Okafor");
  await page.getByLabel("Past work").fill("https://www.imdb.com/name/nm0000001\nvimeo.com/123");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByRole("heading", { name: "Check your ID" })).toBeVisible();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await page.getByRole("button", { name: "Pass ID check" }).click();

  await expect(page.getByRole("heading", { name: "Set up payouts" })).toBeVisible();
  await page.getByRole("button", { name: "Set up payouts" }).click();
  await page.getByRole("button", { name: "Finish payout setup" }).click();

  await expect(page.getByRole("heading", { name: /You're approved, Low Tide Pictures/ })).toBeVisible();
  await expect(page.getByText("3 features and 12 shorts")).toBeVisible();

  const { data: profile } = await admin.from("profiles").select("roles").eq("id", user.id).single();
  expect(profile?.roles).toContain("filmmaker");
  const { data: acct } = await admin.from("filmmaker_accounts").select("vetting_score, status").eq("owner_id", user.id).single();
  expect(acct).toMatchObject({ status: "approved" });
  expect(acct!.vetting_score).toBeGreaterThanOrEqual(80);
});

test("an applicant with no past work goes to staff review", async ({ page }) => {
  await signInAs(page, uniqueEmail("sam").replace("@umoobi.test", "@gmail.com"), { next: "/filmmakers/apply" });
  await page.getByLabel("Filmmaker or company name").fill("Sam Films");
  await page.getByLabel("Your legal name").fill("Sam Lee");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await page.getByRole("button", { name: "Pass ID check" }).click();
  await page.getByRole("button", { name: "Set up payouts" }).click();
  await page.getByRole("button", { name: "Finish payout setup" }).click();
  await expect(page.getByRole("heading", { name: "Almost there." })).toBeVisible();
});

test("a failed ID check can be retried", async ({ page }) => {
  await signInAs(page, uniqueEmail("rosa"), { next: "/filmmakers/apply" });
  await page.getByLabel("Filmmaker or company name").fill("Rosa Films");
  await page.getByLabel("Your legal name").fill("Rosa Diaz");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.getByRole("button", { name: "Start ID check" }).click();
  await page.getByRole("button", { name: "Fail ID check" }).click();
  await expect(page.getByText("The last check couldn't be completed.")).toBeVisible();
});
