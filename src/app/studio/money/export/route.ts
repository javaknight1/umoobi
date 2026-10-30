import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { monthBounds, salesBetween } from "@/lib/portal";
import { toCsv } from "@/lib/waitlist";

const COLUMNS = ["order_ref", "paid_at", "film_title", "kind", "status", "price_cents", "fee_cents", "processing_cents", "net_cents", "refunded_at"];

/** Statement CSV for one month. Amounts in cents, no buyer identity (D38). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Sign in", { status: 401 });
  const { data: account } = await supabase.from("filmmaker_accounts").select("id, slug").eq("owner_id", auth.user.id).maybeSingle();
  if (!account) return new NextResponse("Not found", { status: 404 });
  const { from, to, label } = monthBounds(request.nextUrl.searchParams.get("month"), new Date());
  const lines = await salesBetween(account.id, from, to);
  return new NextResponse(toCsv(lines as unknown as Record<string, unknown>[], COLUMNS), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="umoobi-${account.slug}-${label}.csv"`,
    },
  });
}
