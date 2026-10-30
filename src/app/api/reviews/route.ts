import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Reviews: verified buyers only, never the film's own people (16 CFR 465). RLS enforces it
 * with can_review(); filmmakers have no way to hide reviews.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const filmId = String(body?.filmId ?? "");
  const rating = Number(body?.rating);
  const text = body?.body ? String(body.body).trim().slice(0, 5000) : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Pick 1 to 5 stars." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to review." }, { status: 401 });

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("film_id", filmId)
    .eq("author_id", auth.user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("reviews").update({ rating, body: text }).eq("id", existing.id)
    : await supabase.from("reviews").insert({ film_id: filmId, author_id: auth.user.id, rating, body: text });
  if (error) {
    return NextResponse.json({ error: "Only people who rented or bought this film can review it." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await supabase.from("reviews").delete().eq("id", id).eq("author_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
