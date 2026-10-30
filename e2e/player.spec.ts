import { expect, test } from "@playwright/test";
import { admin, signInAs } from "./db";
import { uniqueEmail } from "./helpers";
import { signInSeeded } from "./seeded";

const NIGHT_SHIFT = "c0000000-0000-0000-0000-000000000003";

test("the watch page sends viewers without a rental or purchase to the film page", async ({ page }) => {
  await signInAs(page, uniqueEmail("nobuy"), { next: "/watch/salt-and-static" });
  await expect(page.getByText("You don't have an active rental or purchase for this film.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Rent or buy" })).toHaveAttribute("href", "/f/salt-and-static");
});

test("Jordan resumes a purchased film, and heartbeats store no viewer id", async ({ page }) => {
  const jordan = await signInSeeded(page, "jordan@umoobi.test", "/watch/night-shift-at-the-planetarium");
  await expect(page.getByText("Purchased · yours to stream")).toBeVisible();

  // A heartbeat from this browser: analytics row is session-keyed, resume row is per viewer.
  const since = new Date(Date.now() - 1000).toISOString();
  const res = await page.request.post("/api/playback/events", { data: { filmId: NIGHT_SHIFT, position: 1234, event: "heartbeat" } });
  expect(res.ok()).toBe(true);
  const { data: rows } = await admin
    .from("playback_events")
    .select("*")
    .eq("film_id", NIGHT_SHIFT)
    .eq("position_seconds", 1234)
    .gte("created_at", since);
  expect(rows!.length).toBeGreaterThanOrEqual(1);
  expect(Object.keys(rows![0]).sort()).toEqual(["created_at", "event", "film_id", "id", "position_seconds", "session_id"]);

  const { data: progress } = await admin.from("watch_progress").select("position_seconds").eq("viewer_id", jordan.id).eq("film_id", NIGHT_SHIFT).single();
  expect(progress?.position_seconds).toBe(1234);

  await page.goto("/library");
  await expect(page.getByText(/Resume at 20:34/).first()).toBeVisible();

  await page.goto("/watch/night-shift-at-the-planetarium");
  await page.getByRole("button", { name: "Play Night Shift at the Planetarium" }).click();
  const player = page.locator("mux-player");
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("start-time", "1234");
});

test("the playback token is refused without an entitlement", async ({ page }) => {
  await signInAs(page, uniqueEmail("sneaky"), { next: "/" });
  const res = await page.request.post(`/api/playback/${NIGHT_SHIFT}/token`);
  expect(res.status()).toBe(403);
});
