import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";
import { uniqueEmail } from "./helpers";
import { signInExisting } from "./existing-user";

const SALT = "c0000000-0000-0000-0000-000000000001";
const ROSA_ACCOUNT = "b0000000-0000-0000-0000-000000000002";

test("a visitor sees the shareable film page with prices, license wording and credits", async ({ page }) => {
  const { count: before } = await admin.from("page_events").select("id", { count: "exact", head: true }).eq("film_id", SALT).eq("source", "e2e");
  await page.goto("/f/salt-and-static?ref=e2e");
  await expect(page.getByRole("heading", { level: 1, name: "Salt & Static" })).toBeVisible();
  await expect(page.getByText("2026 · 1 h 34 min · PG-13 · Drama")).toBeVisible();
  await expect(page.getByRole("link", { name: "Rent $4.99 · 48 h" })).toHaveAttribute("href", "/checkout/d0000000-0000-0000-0000-000000000001");
  await expect(page.getByRole("link", { name: "Buy $12.99" })).toBeVisible();
  await expect(page.getByTestId("license-statement")).toContainText("license to watch, not ownership");
  await expect(page.getByRole("link", { name: "Leilani Kahale Lead actor" })).toHaveAttribute("href", "/p/leilani-kahale");
  await expect(page.getByText("Only people who rented or bought the film can review it.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Watch now/ })).toHaveCount(0);
  await expect(page).toHaveTitle(/Salt & Static/);

  await expect
    .poll(async () => (await admin.from("page_events").select("id", { count: "exact", head: true }).eq("film_id", SALT).eq("source", "e2e")).count)
    .toBeGreaterThan(before ?? 0);
  const { data: ev } = await admin.from("page_events").select("*").eq("film_id", SALT).eq("source", "e2e").limit(1).single();
  expect(Object.keys(ev!)).not.toContain("user_id");
});

// notFound() inside a streamed Suspense boundary renders the not-found page (noindex) with status 200.
test("drafts and unknown films are not found", async ({ page }) => {
  await page.goto("/f/low-water");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Low Water" })).toHaveCount(0);
  await page.goto("/f/does-not-exist");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("an AI-generated film is labeled", async ({ page }) => {
  await page.goto("/f/paper-orchard");
  await expect(page.getByText("Contains AI-generated imagery.")).toBeVisible();
});

test("a renter can watch, review and follow the filmmaker", async ({ page }) => {
  test.slow();
  const jordan = await signInExisting(page, "jordan@umoobi.test", "/f/salt-and-static");
  await admin.from("reviews").delete().eq("film_id", SALT).eq("author_id", jordan.id);
  await admin.from("follows").delete().eq("follower_id", jordan.id).eq("account_id", "b0000000-0000-0000-0000-000000000001");
  await page.reload();

  await expect(page.getByRole("link", { name: /Watch now/ })).toHaveAttribute("href", "/watch/salt-and-static");

  const form = page.getByRole("form", { name: "Your review" });
  await form.getByRole("radio", { name: "4 stars" }).click();
  await form.getByLabel("Review").fill("The radio scenes got under my skin.");
  await form.getByRole("button", { name: "Post review" }).click();
  await expect(form.getByRole("button", { name: "Update review" })).toBeVisible({ timeout: 30_000 });
  const listed = page.getByRole("listitem").filter({ hasText: "The radio scenes got under my skin." });
  await expect(listed).toContainText("Verified viewer");

  await page.getByRole("button", { name: "Follow Low Tide Pictures" }).click();
  await expect(page.getByRole("button", { name: "Following Low Tide Pictures" })).toBeVisible();

  await admin.from("reviews").delete().eq("film_id", SALT).eq("author_id", jordan.id);
  await admin.from("follows").delete().eq("follower_id", jordan.id).eq("account_id", "b0000000-0000-0000-0000-000000000001");
});

async function reportableFilm(project: string) {
  const slug = `report-me-${project}-${Date.now()}`;
  const { data: film } = await admin
    .from("films")
    .insert({
      account_id: ROSA_ACCOUNT,
      slug,
      title: "Report Me",
      runtime_seconds: 600,
      status: "published",
      vetting_score: 95,
      ai_declared_at: new Date().toISOString(),
      rights_statement_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single()
    .throwOnError();
  return { slug, id: film!.id };
}

async function cleanupFilm(id: string) {
  await admin.from("content_reports").delete().eq("film_id", id);
  await admin.from("review_items").delete().eq("film_id", id);
  await admin.from("entitlements").delete().eq("film_id", id);
}

async function sendAiReport(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`/f/${slug}`);
  await page.getByText("Report this film").click();
  await page.getByLabel("Uses AI-generated imagery without a label").check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Umoobi staff will look at this within 24 hours.")).toBeVisible();
}

test("a stranger's undisclosed-AI report queues a staff review but doesn't hide the film (D66)", async ({ page }, info) => {
  const film = await reportableFilm(info.project.name);
  try {
    await sendAiReport(page, film.slug);
    const { data: after } = await admin.from("films").select("status").eq("id", film.id).single();
    expect(after!.status).toBe("published");
    const { data: items } = await admin.from("review_items").select("kind, status").eq("film_id", film.id);
    expect(items).toEqual([{ kind: "report", status: "open" }]);
  } finally {
    await cleanupFilm(film.id);
    await admin.from("films").delete().eq("id", film.id);
  }
});

test("a buyer's undisclosed-AI report hides the film at once and queues a staff review (D46)", async ({ page }, info) => {
  const film = await reportableFilm(info.project.name);
  const buyer = await signInAs(page, uniqueEmail("reporter"));
  const { data: offer } = await admin.from("offers").insert({ film_id: film.id, kind: "rent", price_cents: 199, rental_hours: 48 }).select("id").single().throwOnError();
  const { data: order } = await admin
    .from("orders")
    .insert({ viewer_id: buyer.id, offer_id: offer!.id, film_id: film.id, account_id: ROSA_ACCOUNT, kind: "rent", subtotal_cents: 199 })
    .select("id")
    .single()
    .throwOnError();
  await admin.rpc("record_sale", { p_order: order!.id, p_tax_cents: 0, p_processing_cents: 36, p_payment_intent: `pi_e2e_${order!.id}`, p_charge: "" });
  await sendAiReport(page, film.slug);
  const { data: after } = await admin.from("films").select("status").eq("id", film.id).single();
  expect(after!.status).toBe("hidden");
  const { data: items } = await admin.from("review_items").select("kind, status").eq("film_id", film.id);
  expect(items).toEqual([{ kind: "report", status: "open" }]);
  await page.goto(`/f/${film.slug}`);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  // Orders and ledger lines are append-only records, so this film stays (hidden) in the test DB.
});
test("person and filmmaker pages list their films", async ({ page }) => {
  await page.goto("/p/leilani-kahale");
  await expect(page.getByRole("heading", { name: "Leilani Kahale" })).toBeVisible();
  await expect(page.getByText("Actor. Honolulu and Los Angeles.")).toBeVisible();
  await expect(page.getByTestId("film-card")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Follow Leilani" })).toHaveAttribute("href", "/sign-in?next=%2Fp%2Fleilani-kahale");

  await page.goto("/c/low-tide-pictures");
  await expect(page.getByRole("heading", { name: "Low Tide Pictures" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Salt & Static/ })).toBeVisible();
  await expect(page.getByText("Low Water")).toHaveCount(0); // drafts stay private
});
