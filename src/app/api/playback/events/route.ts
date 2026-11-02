import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sessionId } from "@/lib/session/sid";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  // Shape check only: zod's uuid() also enforces RFC version bits, which ids from seeds lack.
  filmId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  position: z.number().min(0).max(60 * 60 * 24),
  event: z.enum(["start", "heartbeat", "pause", "end"]),
});

/**
 * Player heartbeats (every 30 s). Two separate writes:
 *  - playback_events: session id + film + position, never a user id (analytics, D38)
 *  - watch_progress: the signed-in viewer's resume point (their own row only, RLS)
 */
export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad event" }, { status: 400 });
  const { filmId, position, event } = parsed.data;
  const seconds = Math.floor(position);

  // Only a viewer who holds the film can report playback, so analytics can't be inflated.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { count } = await supabase
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("film_id", filmId)
    .is("revoked_at", null);
  if (!count) return NextResponse.json({ error: "No access" }, { status: 403 });

  // The analytics row carries an anonymous session id, never the user (D38).
  await createAdminClient()
    .from("playback_events")
    .insert({ session_id: await sessionId(), film_id: filmId, position_seconds: seconds, event });
  await supabase
    .from("watch_progress")
    .upsert({ viewer_id: auth.user.id, film_id: filmId, position_seconds: seconds, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}
