import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markAssetErrored, markAssetReady } from "@/lib/video/assets";
import { MuxVideo } from "@/lib/video/mux";

interface MuxEvent {
  id: string;
  type: string;
  data: {
    id: string;
    asset_id?: string;
    passthrough?: string;
    duration?: number;
    playback_ids?: { id: string }[];
    errors?: { messages?: string[] };
  };
}

function assetRowFromPassthrough(p?: string): string | null {
  try {
    return p ? (JSON.parse(p).asset_row_id ?? null) : null;
  } catch {
    return null;
  }
}

/** Mux webhook: upload → asset created → ready (or errored). Signature-verified and idempotent. */
export async function POST(request: NextRequest) {
  if (!process.env.MUX_WEBHOOK_SECRET || !process.env.MUX_TOKEN_ID) return new NextResponse("Mux not configured", { status: 404 });
  const body = await request.text();
  let event: MuxEvent;
  try {
    event = (await new MuxVideo().client.webhooks.unwrap(body, request.headers)) as unknown as MuxEvent;
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  const db = createAdminClient();
  const { error: dup } = await db.from("webhook_events").insert({ id: event.id, provider: "mux", type: event.type });
  if (dup) return NextResponse.json({ received: true, duplicate: true });

  try {
    const d = event.data;
    if (event.type === "video.upload.asset_created" && d.asset_id) {
      await db.from("film_assets").update({ mux_asset_id: d.asset_id, status: "processing" }).eq("mux_upload_id", d.id);
    } else if (event.type === "video.asset.ready" || event.type === "video.asset.errored") {
      let rowId = assetRowFromPassthrough(d.passthrough);
      if (!rowId) {
        const { data } = await db.from("film_assets").select("id").eq("mux_asset_id", d.id).maybeSingle();
        rowId = data?.id ?? null;
      }
      if (rowId) {
        if (event.type === "video.asset.ready") {
          await markAssetReady(rowId, { muxAssetId: d.id, playbackId: d.playback_ids?.[0]?.id ?? null, durationSeconds: d.duration ?? null });
        } else {
          await markAssetErrored(rowId, d.errors?.messages?.join("; ") || "Encoding failed");
        }
      }
    }
  } catch (err) {
    await db.from("webhook_events").delete().eq("id", event.id);
    console.error("[mux webhook]", event.type, err);
    return new NextResponse("Handler failed", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
