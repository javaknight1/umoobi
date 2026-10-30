import { expect, test } from "@playwright/test";
import { admin, signInStaff } from "./db";
import { signInExisting } from "./existing-user";

test("discover shows curated, trending, shorts and genre shelves with prices", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
  const staffPicks = page.getByRole("region", { name: "Staff picks" });
  await expect(staffPicks.getByRole("link", { name: /Salt & Static/ })).toBeVisible();
  await expect(staffPicks.getByText("From $4.99")).toBeVisible();
  await expect(page.getByRole("region", { name: "Trending" }).getByTestId("film-card").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Shorts" }).getByRole("link", { name: /Tidepool/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Shorts" }).getByText("Free")).toBeVisible();
  await expect(page.getByRole("region", { name: "Animation" }).getByRole("link", { name: /Paper Orchard/ })).toBeVisible();
});

test("the hide AI-generated filter removes labeled films and is remembered", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("link", { name: /Paper Orchard/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Hide AI-generated" }).click();
  await expect(page.getByRole("button", { name: "✓ Hiding AI-generated" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Paper Orchard/ })).toHaveCount(0);
  await page.goto("/search?q=orchard");
  await expect(page.getByText("No films match “orchard”.")).toBeVisible();
  await page.getByRole("button", { name: "✓ Hiding AI-generated" }).click();
  await expect(page.getByRole("link", { name: /Paper Orchard/ })).toBeVisible();
});

test("search finds films and people", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Search films and people").fill("planetarium");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=planetarium/);
  await expect(page.getByRole("link", { name: /Night Shift at the Planetarium/ })).toBeVisible();

  await page.goto("/search?q=leilani");
  await expect(page.getByRole("region", { name: "People" }).getByRole("link", { name: "Leilani Kahale" })).toHaveAttribute(
    "href",
    "/p/leilani-kahale",
  );
});

test("a viewer gets 'because you watched' and makes a list", async ({ page }) => {
  test.slow();
  const jordan = await signInExisting(page, "jordan@umoobi.test", "/discover");
  // Jordan rented Salt & Static and bought Night Shift; Leilani is in both, and in Tidepool.
  await expect(page.getByRole("region", { name: "Because you watched" }).getByRole("link", { name: /Tidepool/ })).toBeVisible();

  const title = `Island films ${Date.now()}`;
  try {
    await page.goto("/f/tidepool");
    await page.getByRole("link", { name: /Start a list with this film|New list/ }).first().click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create list" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("link", { name: /Tidepool/ })).toBeVisible();
    await expect(page.getByText("Public list")).toBeVisible();
  } finally {
    await admin.from("lists").delete().eq("owner_id", jordan.id).eq("title", title);
  }
});

test("staff curate a shelf behind two-factor sign-in", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough for shared shelves");
  test.slow();
  const staff = await signInStaff(page, "/staff/shelves");
  await expect(page.getByRole("heading", { name: "Featured shelves" })).toBeVisible();

  const shelf = `E2E shelf ${Date.now()}`;
  try {
    await page.getByLabel("New shelf").fill(shelf);
    await page.getByRole("button", { name: "Create shelf" }).click();
    const section = page.getByRole("region", { name: shelf });
    await section.getByPlaceholder(/Film link or slug/).fill("tidepool");
    await section.getByRole("button", { name: "Add film" }).click();
    await expect(section.getByText("Tidepool")).toBeVisible();

    await page.goto("/discover");
    await expect(page.getByRole("region", { name: shelf }).getByRole("link", { name: /Tidepool/ })).toBeVisible();

    const { data: log } = await admin.from("staff_audit_log").select("action").eq("actor_id", staff.id).order("id", { ascending: false }).limit(2);
    expect(log!.map((l) => l.action)).toEqual(["shelf.add_film", "shelf.create"]);
  } finally {
    await admin.from("shelves").delete().eq("title", shelf);
  }
});
