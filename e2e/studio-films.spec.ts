import { expect, test, type Page } from "@playwright/test";
import { addRentOffer, filmByTitle, newFilmmaker, runChecks, signInExisting } from "./fixtures";

// Upload → encode → checks is a long flow; give it room on a busy dev server.
test.describe.configure({ timeout: 240_000 });
const slow = expect.configure({ timeout: 45_000 });

const fakeVideo = { name: "master.mov", mimeType: "video/quicktime", buffer: Buffer.from("not really a movie") };

async function createFilm(page: Page, title: string, minutes: string, kind: "feature" | "short") {
  await page.goto("/studio/films/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Runtime (minutes)").fill(minutes);
  await page.getByLabel("Feature or short").selectOption(kind);
  await page.getByRole("button", { name: "Create film" }).click();
  await slow(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

async function declareAndConfirm(page: Page) {
  const ai = page.locator("section#ai");
  await ai.getByLabel(/No, none of the picture/).check();
  await ai.getByRole("button", { name: "Save declaration" }).click();
  await slow(ai.getByRole("status")).toHaveText("Saved.");
  await page.getByLabel(/I own or have licensed every right/).check();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await slow(page.getByText(/You confirmed the rights statement/)).toBeVisible();
}

async function uploadMaster(page: Page, filmId: string) {
  await page.goto(`/studio/films/${filmId}/uploads`);
  await page.getByLabel("Upload master file").setInputFiles(fakeVideo);
  await page.getByRole("button", { name: "Upload", exact: true }).first().click();
  await slow(page.getByText(/^Ready/).first()).toBeVisible();
}

test("a filmmaker adds a film, uploads the master, passes the checks and publishes", async ({ page, request }) => {
  const fm = await newFilmmaker("studio");
  await signInExisting(page, fm.email, "/studio/films");
  await slow(page.getByText(/0 of 3/)).toBeVisible();

  const title = `Harbor Lights ${Date.now()}`;
  await createFilm(page, title, "52", "feature");
  const film = await filmByTitle(title);

  // The master is gated on the AI declaration and rights statement (D42).
  await page.goto(`/studio/films/${film.id}/uploads`);
  await slow(page.getByText(/Before uploading the master, declare/)).toBeVisible();
  await page.goto(`/studio/films/${film.id}`);
  await declareAndConfirm(page);

  await uploadMaster(page, film.id);
  await runChecks(request, film.id);
  await addRentOffer(film.id);

  await page.goto(`/studio/films/${film.id}/publish`);
  await slow(page.getByText("Ready to publish")).toBeVisible();
  await page.getByRole("button", { name: "Publish film" }).click();
  await slow(page.getByText("Live at")).toBeVisible();
  expect((await filmByTitle(title)).status).toBe("published");

  // Pull it again: sales stop.
  await page.getByLabel(/I understand sales stop/).check();
  await page.getByRole("button", { name: "Pull film" }).click();
  await slow(page.getByText(/^Pulled on/)).toBeVisible();
});

test("undeclared AI found by the scan blocks publishing until the film is labeled", async ({ page, request }) => {
  const fm = await newFilmmaker("aiscan");
  await signInExisting(page, fm.email, "/studio/films/new");
  const title = `Synthetic Dawn ${Date.now()} [flag-ai]`;
  await createFilm(page, title, "12", "short");
  const film = await filmByTitle(title);
  await declareAndConfirm(page);
  await uploadMaster(page, film.id);
  await runChecks(request, film.id);
  await addRentOffer(film.id);

  await page.goto(`/studio/films/${film.id}/publish`);
  await slow(page.getByRole("heading", { name: "Our scan found AI-generated imagery" })).toBeVisible();
  await slow(page.getByLabel("Publish blockers")).toContainText("The AI scan flagged frames");
  await page.getByRole("button", { name: "Add the AI-generated label" }).click();
  await slow.poll(async () => (await filmByTitle(title)).ai_generated).toBe(true);
  await page.reload();
  await slow(page.getByRole("button", { name: "Publish film" })).toBeVisible();
  await page.getByRole("button", { name: "Publish film" }).click();
  await slow(page.getByText("Live at")).toBeVisible();
  expect((await filmByTitle(title)).ai_generated).toBe(true);
});

test("explicit content is rejected outright", async ({ page, request }) => {
  const fm = await newFilmmaker("nsfw");
  await signInExisting(page, fm.email, "/studio/films/new");
  const title = `Night Swim ${Date.now()} [flag-nudity]`;
  await createFilm(page, title, "9", "short");
  const film = await filmByTitle(title);
  await declareAndConfirm(page);
  await uploadMaster(page, film.id);
  await runChecks(request, film.id);
  await page.goto(`/studio/films/${film.id}/publish`);
  await slow(page.getByText("Sexually explicit content isn't allowed on Umoobi.")).toBeVisible();
});

test("a new account can't add a fourth feature in a year", async ({ page }) => {
  const fm = await newFilmmaker("caps");
  await signInExisting(page, fm.email, "/studio/films/new");
  for (let i = 1; i <= 3; i++) await createFilm(page, `Feature ${i} ${Date.now()}`, "90", "feature");
  await page.goto("/studio/films/new");
  await page.getByLabel("Title").fill("One too many");
  await page.getByLabel("Runtime (minutes)").fill("90");
  await page.getByRole("button", { name: "Create film" }).click();
  await slow(page.getByText(/Yearly limit reached: 3 features/)).toBeVisible();
});
