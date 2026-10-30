import type { Page } from "@playwright/test";
import { admin } from "./db";

/**
 * Signs in a seeded user (maya@, jordan@…) by magic-link token hash. Unlike signInAs it
 * never creates the user, so it doesn't depend on listUsers paging through test users.
 */
export async function signInSeeded(page: Page, email: string, next = "/") {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const q = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "magiclink", next });
  await page.goto(`/auth/callback?${q}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
  return data.user;
}
