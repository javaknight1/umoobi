import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { video } from "@/lib/video";

const Body = z.object({
  kind: z.enum(["master", "trailer", "clip"]),
  label: z.string().trim().max(120).optional(),
});

/**
 * Starts a direct upload: creates the film_assets row and returns a URL the browser uploads
 * to (Mux in production, a dev route locally). Master files never pass through our servers.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/films/[id]/uploads">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose master, trailer or clip." }, { status: 400 });
  const { kind, label } = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  // RLS returns the film only to members of its account.
  const { data: film } = await supabase.from("films").select("id, status, ai_declared_at, rights_statement_at").eq("id", id).maybeSingle();
  const { data: member } = film
    ? await supabase.rpc("can_manage_film", { f: id })
    : { data: false };
  if (!film || !member) return NextResponse.json({ error: "Film not found." }, { status: 404 });

  const db = createAdminClient();
  if (kind === "master") {
    if (!film.ai_declared_at || !film.rights_statement_at) {
      return NextResponse.json(
        { error: "Declare whether the film uses AI-generated imagery and confirm the rights statement before uploading the master." },
        { status: 400 },
      );
    }
    if (["published", "hidden"].includes(film.status)) {
      return NextResponse.json({ error: "Pull the film before replacing its master." }, { status: 400 });
    }
    const { data: old } = await db.from("film_assets").select("id, mux_asset_id").eq("film_id", id).eq("kind", "master").maybeSingle();
    if (old) {
      if (old.mux_asset_id) await video().deleteAsset(old.mux_asset_id).catch(() => undefined);
      await db.from("film_assets").delete().eq("id", old.id);
      await db.from("films").update({ status: "draft", vetting_score: null, ai_flagged: false }).eq("id", id);
    }
  }

  const { data: row, error } = await db
    .from("film_assets")
    .insert({ film_id: id, kind, label: label ?? null, status: "uploading" })
    .select("id")
    .single();
  if (error || !row) {
    const msg = error?.message?.match(/A film can have at most \d+ \w+|Free trailers.*runtime/)?.[0];
    return NextResponse.json({ error: msg ?? "Couldn't start the upload." }, { status: 400 });
  }

  const provider = video();
  const upload = await provider.createUpload({
    filmId: id,
    assetRowId: row.id,
    kind,
    corsOrigin: request.headers.get("origin") ?? request.nextUrl.origin,
  });
  await db.from("film_assets").update({ mux_upload_id: upload.uploadId }).eq("id", row.id);
  return NextResponse.json({ assetId: row.id, uploadUrl: upload.url, provider: provider.name });
}
