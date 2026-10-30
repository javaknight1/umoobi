import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Create a list, optionally starting with one film. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "Give the list a title." }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to make lists." }, { status: 401 });

  const { data: list, error } = await supabase
    .from("lists")
    .insert({
      owner_id: auth.user.id,
      title,
      description: body?.description ? String(body.description).slice(0, 1000) : null,
      is_public: body?.isPublic !== false,
    })
    .select("id")
    .single();
  if (error || !list) return NextResponse.json({ error: "Couldn't create the list." }, { status: 400 });

  if (body?.filmId) {
    await supabase.from("list_items").insert({ list_id: list.id, film_id: String(body.filmId), position: 0 });
  }
  return NextResponse.json({ id: list.id });
}
