import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Add a film to one of your lists (RLS: owner only). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/lists/[id]/items">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const supabase = await createClient();
  const { count } = await supabase.from("list_items").select("film_id", { count: "exact", head: true }).eq("list_id", id);
  const { error } = await supabase
    .from("list_items")
    .insert({ list_id: id, film_id: String(body?.filmId ?? ""), position: count ?? 0 });
  if (error && error.code !== "23505") return NextResponse.json({ error: "Couldn't add the film." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/lists/[id]/items">) {
  const { id } = await ctx.params;
  const filmId = request.nextUrl.searchParams.get("film") ?? "";
  const supabase = await createClient();
  await supabase.from("list_items").delete().eq("list_id", id).eq("film_id", filmId);
  return NextResponse.json({ ok: true });
}
