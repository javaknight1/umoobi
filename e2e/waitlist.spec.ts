import { expect, test } from "@playwright/test";
import { appEmail, uniqueEmail } from "./helpers";

test("a filmmaker joins the waitlist and confirms by email", async ({ page, request }) => {
  const email = uniqueEmail("maya");
  await page.goto("/?ref=instagram");
  await expect(page.getByRole("heading", { name: /Sell your film from one link/ })).toBeVisible();
  await expect(page.getByText("You earn").first()).toBeVisible();

  const form = page.locator("#waitlist form");
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByLabel("Film title").fill("Salt & Static");
  await form.getByLabel("Feature or short").selectOption("feature");
  await form.getByLabel("Where you sell today").selectOption("Vimeo On Demand");
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("status")).toContainText(email);

  const mail = await appEmail(request, email);
  expect(mail.subject).toContain("Confirm your spot");
  const link = mail.text.match(/https?:\/\/\S+/)![0];
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page.getByRole("heading", { name: "You're on the list." })).toBeVisible();
  await expect(page.getByText(/download everything you need before November 20/)).toBeVisible();
});

test("a viewer sees no film questions", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#waitlist form");
  await form.getByText("Viewer", { exact: true }).click();
  await expect(form.getByLabel("Film title")).toHaveCount(0);
});

test("a bad confirm link explains itself", async ({ page }) => {
  await page.goto("/waitlist/confirm?token=nope");
  await expect(page.getByRole("heading", { name: "That link didn't work." })).toBeVisible();
});

test("the Vimeo On Demand guide is linked from the banner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /What to download before then/ }).click();
  await expect(page.getByRole("heading", { name: "Leaving Vimeo On Demand" })).toBeVisible();
});
