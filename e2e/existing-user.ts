import type { Page } from "@playwright/test";
import { signInAs } from "./db";

/** Signs the browser in as an existing (seeded) user. */
export async function signInExisting(page: Page, email: string, next = "/") {
  return signInAs(page, email, { next });
}
