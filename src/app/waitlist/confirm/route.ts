import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Double opt-in: the emailed link confirms the address once, then shows a thank-you page. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const target = new URL("/waitlist/confirmed", request.url);
  if (!UUID_RE.test(token)) {
    target.searchParams.set("error", "1");
    return NextResponse.redirect(target);
  }
  const db = createAdminClient();
  const { data } = await db
    .from("waitlist_signups")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("confirm_token", token)
    .is("confirmed_at", null)
    .select("role")
    .maybeSingle();
  if (!data) {
    const { data: already } = await db.from("waitlist_signups").select("role").eq("confirm_token", token).maybeSingle();
    if (!already) target.searchParams.set("error", "1");
    else target.searchParams.set("role", already.role);
  } else {
    target.searchParams.set("role", data.role);
  }
  return NextResponse.redirect(target);
}
