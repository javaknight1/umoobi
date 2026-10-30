import { NextResponse, type NextRequest } from "next/server";
import { sessionId } from "@/lib/session/sid";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { video } from "@/lib/video";

/**
 * Checks the viewer's rental or purchase, starts the rental clock on first play (D51),
 * and returns signed playback tokens (6 hours) plus the resume point.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/playback/[filmId]/token">) {
  const { filmId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to watch." }, { status: 401 });

  const { data, error } = await supabase.rpc("start_playback", { f: filmId });
  const ent = data as { kind: string; expires_at: string | null } | null;
  if (error || !ent) return NextResponse.json({ error: "No active rental or purchase." }, { status: 403 });

  // Masters aren't readable by viewers under RLS; the entitlement check above gates this.
  const db = createAdminClient();
  const [{ data: master }, { data: subs }, { data: film }, { data: progress }] = await Promise.all([
    db.from("film_assets").select("mux_playback_id").eq("film_id", filmId).eq("kind", "master").eq("status", "ready").maybeSingle(),
    db.from("film_assets").select("label, language, subtitle_url").eq("film_id", filmId).eq("kind", "subtitle"),
    db.from("films").select("runtime_seconds").eq("id", filmId).single(),
    supabase.from("watch_progress").select("position_seconds").eq("film_id", filmId).maybeSingle(),
  ]);
  if (!master?.mux_playback_id) return NextResponse.json({ error: "This film isn't ready to play." }, { status: 409 });

  const tokens = await video().playbackTokens(master.mux_playback_id, { viewerSession: await sessionId() });
  const runtime = film?.runtime_seconds ?? 0;
  const position = progress?.position_seconds ?? 0;
  return NextResponse.json({
    playbackId: tokens.playbackId,
    tokens: { playback: tokens.playback, thumbnail: tokens.thumbnail, storyboard: tokens.storyboard, drm: tokens.drm },
    tokensExpireAt: tokens.expiresAt,
    accessExpiresAt: ent.expires_at,
    kind: ent.kind,
    // Near the end? Start over instead of resuming into the credits.
    startTime: runtime && position > runtime - 60 ? 0 : position,
    subtitles: (subs ?? [])
      .filter((s) => s.subtitle_url)
      .map((s) => ({ src: s.subtitle_url!, label: s.label ?? s.language ?? "Subtitles", lang: s.language ?? "en" })),
  });
}
