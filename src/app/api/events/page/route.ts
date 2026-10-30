import { NextResponse, type NextRequest } from "next/server";
import { parseRegion, parseSource } from "@/lib/analytics/source";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE } from "@/lib/viewer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENTS = new Set(["view", "trailer_play"]);

/**
 * First-party page analytics (D38, VPPA): a film id, an event, the traffic source and a US
 * state, keyed to a random session cookie. No user id is ever stored with a film id.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const filmId = String(body?.filmId ?? "");
  const event = String(body?.event ?? "");
  if (!UUID_RE.test(filmId) || !EVENTS.has(event)) return new NextResponse(null, { status: 400 });

  let sid = request.cookies.get(SESSION_COOKIE)?.value;
  const fresh = !sid || !UUID_RE.test(sid);
  if (fresh) sid = crypto.randomUUID();

  const db = createAdminClient();
  const { data: film } = await db.from("films").select("id").eq("id", filmId).eq("status", "published").maybeSingle();
  if (film) {
    await db.from("page_events").insert({
      session_id: sid!,
      film_id: filmId,
      event: event as "view" | "trailer_play",
      source: parseSource({
        ref: body?.ref,
        utmSource: body?.utmSource,
        referrer: body?.referrer,
        siteHost: new URL(siteUrl).hostname,
      }),
      region: parseRegion(request.headers.get("x-vercel-ip-country"), request.headers.get("x-vercel-ip-country-region")),
    });
  }

  const res = new NextResponse(null, { status: 204 });
  if (fresh) {
    res.cookies.set(SESSION_COOKIE, sid!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
