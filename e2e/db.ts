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
  let user: { id: string } | null = null;
  // Phone and desktop runs can sign in as the same seed user at once; a newer link
  // invalidates the older one, so retry a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) {
      const { error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { birth_year: 1990 } });
      if (error && !/already/i.test(error.message)) throw error;
      link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error) throw link.error;
    }
    user = link.data.user!;
    if (opts.roles) await admin.from("profiles").update({ roles: opts.roles }).eq("id", user.id);
    const q = new URLSearchParams({ token_hash: link.data.properties!.hashed_token, type: "email", next: opts.next ?? "/" });
    await page.goto(`/auth/callback?${q}`);
    await page.waitForURL((u) => !u.pathname.startsWith("/auth/"));
    if (!new URL(page.url()).searchParams.has("error")) return user;
    await page.waitForTimeout(200 + Math.random() * 800);
  }
  throw new Error(`Could not sign in as ${email}`);
}
