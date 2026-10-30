import "server-only";
import { cookies } from "next/headers";

/**
 * First-party, anonymous analytics session id (cookie `umoobi_sid`). Never stored next to
 * a user id in analytics tables (D38, VPPA). Setting the cookie only works in server
 * actions and route handlers; elsewhere a fresh id is returned without persisting.
 */
export const SID_COOKIE = "umoobi_sid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function sessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SID_COOKIE)?.value;
  if (existing && UUID_RE.test(existing)) return existing;
  const id = crypto.randomUUID();
  try {
    jar.set(SID_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  } catch {
    // Read-only context (Server Component): use the id for this request only.
  }
  return id;
}
