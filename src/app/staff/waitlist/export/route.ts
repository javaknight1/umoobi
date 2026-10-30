import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/waitlist";

const COLUMNS = ["email", "role", "film_title", "film_kind", "sells_today", "trailer_url", "launch_emails", "source", "confirmed_at", "created_at"];

export async function GET() {
  const user = await getSessionUser();
  if (!hasRole(user, "staff")) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (process.env.STAFF_REQUIRE_2FA !== "false" && aal?.currentLevel !== "aal2") {
    return new NextResponse("Two-factor sign-in required", { status: 403 });
  }
  const { data } = await supabase.from("waitlist_signups").select(COLUMNS.join(",")).order("created_at");
  return new NextResponse(toCsv((data ?? []) as unknown as Record<string, unknown>[], COLUMNS), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="umoobi-waitlist.csv"`,
    },
  });
}
