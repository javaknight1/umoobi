import type { Page } from "@playwright/test";
import { admin } from "./db";

/**
 * Signs the browser in as an existing (seeded) user without listing all users, which
 * only returns the first page once tests have created many accounts.
 */
export async function signInExisting(page: Page, email: string, next = "/") {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const q = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "magiclink", next });
  await page.goto(`/auth/callback?${q}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
  return data.user;
}
