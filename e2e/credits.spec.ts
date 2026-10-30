import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";
import { signInExisting } from "./existing-user";
import { uniqueEmail } from "./helpers";

const LOW_TIDE = "b0000000-0000-0000-0000-000000000001";

test("a filmmaker lists credits with shares that total 100%, and a crew member claims their page", async ({ page, browser }, info) => {
  test.slow();
  const tag = `${info.project.name}${Date.now().toString(36)}`;
  const { data: film } = await admin
    .from("films")
    .insert({ account_id: LOW_TIDE, slug: `credits-test-${tag}`, title: "Credits Test", runtime_seconds: 600 })
    .select("id")
    .single()
    .throwOnError();
  const newName = `Nova Crew ${tag}`;
  try {
    await signInExisting(page, "maya@umoobi.test", `/studio/films/${film!.id}/credits`);
    await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();

    await page.getByLabel("Add a person").fill("Leilani");
    await page.getByRole("button", { name: /^Leilani Kahale/ }).click();
    await page.getByLabel("Role for Leilani Kahale").fill("Lead actor");
    await page.getByLabel("Revenue share for Leilani Kahale").fill("60");

    await page.getByLabel("Add a person").fill(newName);
    await page.getByRole("button", { name: `+ Add “${newName}” as a new person` }).click();
    await page.getByLabel(`Role for ${newName}`).fill("Editor");
    await page.getByLabel(`Revenue share for ${newName}`).fill("30");

    await expect(page.getByTestId("share-total")).toContainText("Shares total 90% — must be exactly 100%");
    await expect(page.getByRole("button", { name: "Save credits" })).toBeDisabled();
    await page.getByLabel(`Revenue share for ${newName}`).fill("40");
    await expect(page.getByTestId("share-total")).toContainText("Shares total 100% ✓");
    await page.getByRole("button", { name: "Save credits" }).click();
    await expect(page.getByRole("status")).toHaveText("Credits saved.");

    const { data: saved } = await admin.from("credits").select("role, share_bps, billing_order").eq("film_id", film!.id).order("billing_order");
    expect(saved).toEqual([
      { role: "Lead actor", share_bps: 6000, billing_order: 0 },
      { role: "Editor", share_bps: 4000, billing_order: 1 },
    ]);

    // Invite the new person, then claim the page as them.
    const crewEmail = uniqueEmail("nova");
    await page.getByRole("button", { name: "Invite to claim" }).click();
    await page.getByLabel(`Email for ${newName}`).fill(crewEmail);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Invite sent.")).toBeVisible();

    const { data: person } = await admin.from("people").select("invite_token, slug").eq("name", newName).single();
    const crew = await browser.newPage();
    await signInAs(crew, crewEmail, { next: `/claim/${person!.invite_token}` });
    await crew.getByRole("button", { name: "Claim my page" }).click();
    await expect(crew.getByText("Page claimed. It's yours now.")).toBeVisible();
    await crew.getByLabel("Bio").fill("Editor and colorist.");
    await crew.getByRole("button", { name: "Save" }).click();
    await expect(crew.getByText("Saved.")).toBeVisible();
    await crew.close();

    const { data: claimed } = await admin.from("people").select("claimed_by, bio, invite_token").eq("slug", person!.slug).single();
    expect(claimed!.claimed_by).not.toBeNull();
    expect(claimed!.bio).toBe("Editor and colorist.");
    expect(claimed!.invite_token).toBeNull();
  } finally {
    await admin.from("credits").delete().eq("film_id", film!.id);
    await admin.from("films").delete().eq("id", film!.id);
    await admin.from("people").delete().eq("name", newName);
  }
});
