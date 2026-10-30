import { expect, test } from "@playwright/test";
import { authLink, uniqueEmail } from "./helpers";

test("a new viewer is asked their birth year, and under-13s are blocked", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(uniqueEmail("kid"));
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const year = page.getByLabel("What year were you born?");
  await expect(year).toBeVisible();
  await year.fill(String(new Date().getFullYear() - 10));
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText("Umoobi accounts are for people 13 and over.")).toBeVisible();
});

test("a new viewer signs up with a magic link and lands where they were going", async ({ page, request }) => {
  const email = uniqueEmail("jordan");
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary/);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByLabel("What year were you born?").fill("1994");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText(`Check ${email}`)).toBeVisible();
  await page.goto(await authLink(request, email));
  await expect(page).toHaveURL(/\/library/);
});
