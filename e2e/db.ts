import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import type { Database } from "../src/lib/supabase/database.types";

function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return out;
}

const e = env();
/** Service-role client for test setup only. */
export const admin = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Creates (or reuses) a user and signs the browser in through a one-time magic link. */
export async function signInAs(page: Page, email: string, opts: { roles?: string[]; next?: string } = {}) {
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { birth_year: 1990 } });
    if (error) throw error;
    user = data.user;
  }
  if (opts.roles) await admin.from("profiles").update({ roles: opts.roles }).eq("id", user.id);
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const q = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "magiclink", next: opts.next ?? "/" });
  await page.goto(`/auth/callback?${q}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
  return user;
}
