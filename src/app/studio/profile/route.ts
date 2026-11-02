import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** "Public profile" in the studio sidebar: the filmmaker's public page. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/sign-in?next=/studio/profile", request.url));
  const { data } = await supabase.from("filmmaker_accounts").select("slug").eq("owner_id", auth.user.id).maybeSingle();
  return NextResponse.redirect(new URL(data ? `/c/${data.slug}` : "/filmmakers/apply", request.url));
}
