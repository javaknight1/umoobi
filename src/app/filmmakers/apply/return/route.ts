import { NextResponse, type NextRequest } from "next/server";
import { evaluateAccount } from "@/lib/onboarding/evaluate";
import { createClient } from "@/lib/supabase/server";

/** Stripe-hosted steps return here; refresh the application, then show the wizard. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    const { data } = await supabase.from("filmmaker_accounts").select("id").eq("owner_id", auth.user.id).maybeSingle();
    if (data) await evaluateAccount(data.id);
  }
  return NextResponse.redirect(new URL("/filmmakers/apply", request.url));
}

/** Server-action redirects (dev provider) arrive as POST. */
export const POST = GET;
