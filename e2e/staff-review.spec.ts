import { expect, test } from "@playwright/test";
import { admin, signInStaff } from "./db";
import { newFilmmaker, signInExisting } from "./fixtures";

test.describe.configure({ timeout: 120_000 });
const slow = expect.configure({ timeout: 45_000 });


async function filmInReview(accountId: string, title: string, status: "review" | "hidden", kind: "film" | "ai_flag") {
  const { data: film } = await admin
    .from("films")
    .insert({
      account_id: accountId,
      title,
      slug: `e2e-${crypto.randomUUID().slice(0, 12)}`,
      runtime_seconds: 600,
      status,
      vetting_score: 65,
      ai_declared_at: new Date().toISOString(),
      rights_statement_at: new Date().toISOString(),
      ai_flagged: kind === "ai_flag",
    })
    .select("id")
    .single();
  await admin.from("review_items").insert({
    kind,
    film_id: film!.id,
    account_id: accountId,
    score: 65,
    reason: kind === "ai_flag" ? "AI scan found undeclared AI imagery" : "Matches a known commercial release",
    due_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  return film!.id;
}

const item = (page: import("@playwright/test").Page, text: string) => page.getByTestId("review-item").filter({ hasText: text });

test("staff approve a film the checks weren't sure about", async ({ page }) => {
  const fm = await newFilmmaker("rv");
  const title = `Review Me ${Date.now()}`;
  const filmId = await filmInReview(fm.accountId, title, "review", "film");
  await signInStaff(page, "/staff");
  await item(page, title).getByRole("button", { name: "Approve" }).click();
  await slow(item(page, title)).toHaveCount(0);
  const { data } = await admin.from("films").select("status, staff_approved").eq("id", filmId).single();
  expect(data).toEqual({ status: "ready", staff_approved: true });
  const { count } = await admin.from("staff_audit_log").select("id", { count: "exact", head: true }).like("target", "review_item:%");
  expect(count).toBeGreaterThan(0);
});

test("staff confirm undeclared AI on a hidden film: removed with a strike", async ({ page }) => {
  const fm = await newFilmmaker("ai");
  const title = `Hidden AI ${Date.now()}`;
  const filmId = await filmInReview(fm.accountId, title, "hidden", "ai_flag");
  await signInStaff(page, "/staff");
  await item(page, title).getByRole("button", { name: "Confirm undeclared AI" }).click();
  await slow(item(page, title)).toHaveCount(0);
  const { data } = await admin.from("films").select("status").eq("id", filmId).single();
  expect(data?.status).toBe("rejected");
  const { data: strikes } = await admin.from("strikes").select("reason").eq("account_id", fm.accountId);
  expect(strikes).toEqual([{ reason: "undeclared_ai" }]);
});

test("staff clear a misfired AI flag and the film goes back on sale", async ({ page }) => {
  const fm = await newFilmmaker("clear");
  const title = `False Alarm ${Date.now()}`;
  const filmId = await filmInReview(fm.accountId, title, "hidden", "ai_flag");
  await signInStaff(page, "/staff");
  await item(page, title).getByRole("button", { name: "Clear flag (not AI)" }).click();
  await slow(item(page, title)).toHaveCount(0);
  const { data } = await admin.from("films").select("status, ai_flagged").eq("id", filmId).single();
  expect(data).toEqual({ status: "published", ai_flagged: false });
});

test("staff approve a filmmaker application from the queue", async ({ page }) => {
  const fm = await newFilmmaker("acct");
  await admin.from("filmmaker_accounts").update({ status: "review", approved_at: null }).eq("id", fm.accountId);
  await admin.from("profiles").update({ roles: ["viewer"] }).eq("id", fm.userId);
  await admin.from("filmmaker_accounts").update({ display_name: `Pending ${fm.accountId.slice(0, 8)}` }).eq("id", fm.accountId);
  await admin.from("review_items").insert({ kind: "account", account_id: fm.accountId, score: 72, reason: "No past work" });
  await signInStaff(page, "/staff");
  const row = item(page, `Pending ${fm.accountId.slice(0, 8)}`);
  await row.getByRole("button", { name: "Approve" }).click();
  await slow(row).toHaveCount(0);
  const { data } = await admin.from("profiles").select("roles").eq("id", fm.userId).single();
  expect(data?.roles).toContain("filmmaker");
});

test("staff retry a failed job", async ({ page }) => {
  const { data: job } = await admin
    .from("jobs")
    .insert({ kind: "e2e_noop", status: "failed", attempts: 5, last_error: "boom", run_after: new Date(Date.now() + 86_400_000).toISOString() })
    .select("id")
    .single();
  await signInStaff(page, "/staff/jobs");
  const row = page.locator("li").filter({ hasText: `#${job!.id} e2e_noop` });
  await row.getByRole("button", { name: "Retry" }).click();
  await slow(row).toHaveCount(0);
  const { data } = await admin.from("jobs").select("attempts").eq("id", job!.id).single();
  expect(data?.attempts).toBe(0);
  await admin.from("jobs").delete().eq("id", job!.id);
});

test("viewers can't open the staff tools", async ({ page }) => {
  await signInExisting(page, "jordan@umoobi.test", "/staff");
  await slow(page).not.toHaveURL(/\/staff/);
});
