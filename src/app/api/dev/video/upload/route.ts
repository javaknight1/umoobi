import { NextResponse, type NextRequest } from "next/server";
import { devProvidersAllowed } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { video } from "@/lib/video";
import { markAssetReady } from "@/lib/video/assets";
import { DEV_PLAYBACK_ID } from "@/lib/video/dev";

/**
 * Dev stand-in for Mux's upload endpoint (D49). Reads and discards the file, then marks the
 * asset encoded with the demo playback id. Duration comes from `x-duration` (seconds), or the
 * film's runtime for a master.
 */
export async function PUT(request: NextRequest) {
  if (!devProvidersAllowed() || video().name !== "dev") return new NextResponse("Not found", { status: 404 });
  const assetRowId = request.nextUrl.searchParams.get("asset") ?? "";
  const db = createAdminClient();
  const { data: row } = await db.from("film_assets").select("id, kind, film_id, status").eq("id", assetRowId).maybeSingle();
  if (!row || row.status !== "uploading") return new NextResponse("Unknown upload", { status: 404 });

  // Drain the body without keeping it.
  const reader = request.body?.getReader();
  if (reader) while (!(await reader.read()).done);

  let duration = Number(request.headers.get("x-duration")) || null;
  if (!duration && row.kind === "master") {
    const { data: film } = await db.from("films").select("runtime_seconds").eq("id", row.film_id).single();
    duration = film?.runtime_seconds ?? 600;
  }
  await markAssetReady(row.id, { muxAssetId: `dev_asset_${row.id}`, playbackId: DEV_PLAYBACK_ID, durationSeconds: duration ?? 60 });
  return new NextResponse(null, { status: 200 });
}

export const POST = PUT;
