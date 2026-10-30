import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { admin, signInAs } from "./db";
import { uniqueEmail } from "./helpers";

const cronSecret = readFileSync(join(process.cwd(), ".env.local"), "utf8").match(/^CRON_SECRET=(.*)$/m)?.[1] ?? "";

/** Retries the local auth admin API when it's overloaded (parallel test runs). */
async function retry<R extends { error: { name?: string; message: string } | null }>(fn: () => Promise<R>): Promise<R> {
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    const { error } = res;
    if (!error) return res;
    if (attempt >= 5 || !/retry|timed out|fetch/i.test(`${error.name} ${error.message}`)) throw error;
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

/** A fresh approved filmmaker (its own yearly caps), returning the email and account id. */
export async function newFilmmaker(prefix = "fm") {
  const email = uniqueEmail(prefix);
  const { data } = await retry(() => admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { birth_year: 1988 } }));
  const userId = data.user!.id;
  await admin.from("profiles").update({ roles: ["viewer", "filmmaker"] }).eq("id", userId);
  const slug = `e2e-${userId.slice(0, 12)}`;
  const { data: acct, error: e2 } = await admin
    .from("filmmaker_accounts")
    .insert({
      owner_id: userId,
      display_name: `E2E ${prefix}`,
      slug,
      legal_name: "E2E Filmmaker",
      status: "approved",
      identity_status: "verified",
      payouts_enabled: true,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (e2) throw e2;
  return { email, userId, accountId: acct!.id };
}

/** Signs in an existing (seeded) user. */
export async function signInExisting(page: Page, email: string, next = "/") {
  await signInAs(page, email, { next });
}

/** Drains `check_film` jobs until the film leaves draft/checking. */
export async function runChecks(request: APIRequestContext, filmId: string) {
  await expect
    .poll(
      async () => {
        await request.get("/api/cron/worker?kind=check_film", { headers: { authorization: `Bearer ${cronSecret}` } });
        const { data } = await admin.from("films").select("status").eq("id", filmId).single();
        return data?.status;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .not.toMatch(/^(draft|checking)$/);
}

export async function filmByTitle(title: string) {
  const { data } = await admin.from("films").select("*").eq("title", title).single();
  return data!;
}

/** Pricing belongs to another screen (T011); tests add an offer directly. */
export async function addRentOffer(filmId: string) {
  const { error } = await admin.from("offers").insert({ film_id: filmId, kind: "rent", price_cents: 499, rental_hours: 48 });
  if (error) throw error;
}
