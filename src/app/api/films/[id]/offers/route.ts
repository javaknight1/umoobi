import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RENTAL_WINDOWS } from "@/lib/library/format";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  rent: z.object({ priceCents: z.number().int().min(0), hours: z.number().int() }).nullable(),
  buy: z.object({ priceCents: z.number().int().min(0) }).nullable(),
});

/**
 * Replaces a film's offers. Price floors and the free-under-5-minutes rule are enforced
 * by the offers_rules trigger (D17, D22); RLS limits this to the film's own account.
 */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/films/[id]/offers">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid prices." }, { status: 400 });
  const { rent, buy } = parsed.data;
  if (rent && !(RENTAL_WINDOWS as readonly number[]).includes(rent.hours)) {
    return NextResponse.json({ error: "Pick a rental window." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const { data, error } = await supabase.rpc("set_film_offers", {
    f: id,
    p_rent_cents: (rent?.priceCents ?? null) as number,
    p_rent_hours: (rent?.hours ?? null) as number,
    p_buy_cents: (buy?.priceCents ?? null) as number,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : 422;
    return NextResponse.json({ error: error.code === "42501" ? "You can't change this film." : error.message }, { status });
  }
  return NextResponse.json({ offers: data });
}
