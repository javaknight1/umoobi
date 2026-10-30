import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/next-path";
import { HIDE_AI_COOKIE } from "@/lib/viewer";

/** Toggles the "Hide AI-generated" filter (D46) and returns to the page it came from. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const on = form.get("hide") === "1";
  const next = safeNextPath(String(form.get("next") ?? "/discover"));
  const res = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  res.cookies.set(HIDE_AI_COOKIE, on ? "1" : "0", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
