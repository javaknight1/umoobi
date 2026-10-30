import "server-only";
import { enqueue } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marks an uploaded asset encoded. Footage-limit triggers (D23) can refuse the duration; then
 * the asset is marked errored with the trigger's message so the filmmaker sees why.
 * A ready master sets the film's runtime when it's missing and queues the automatic checks.
 */
export async function markAssetReady(
  assetRowId: string,
  info: { muxAssetId?: string | null; playbackId: string | null; durationSeconds: number | null },
): Promise<void> {
  const db = createAdminClient();
  const { data: row } = await db.from("film_assets").select("id, film_id, kind").eq("id", assetRowId).maybeSingle();
  if (!row) return;

  const { error } = await db
    .from("film_assets")
    .update({
      status: "ready",
      mux_playback_id: info.playbackId,
      duration_seconds: info.durationSeconds,
      error_message: null,
      ...(info.muxAssetId ? { mux_asset_id: info.muxAssetId } : {}),
    })
    .eq("id", assetRowId);
  if (error) {
    await markAssetErrored(assetRowId, error.message);
    return;
  }

  if (row.kind === "master") {
    const { data: film } = await db.from("films").select("runtime_seconds").eq("id", row.film_id).single();
    if (film && film.runtime_seconds === null && info.durationSeconds) {
      await db.from("films").update({ runtime_seconds: Math.round(info.durationSeconds) }).eq("id", row.film_id);
    }
    await enqueue("check_film", { film_id: row.film_id });
  }
}

export async function markAssetErrored(assetRowId: string, message: string) {
  await createAdminClient()
    .from("film_assets")
    .update({ status: "errored", error_message: message.slice(0, 500) })
    .eq("id", assetRowId);
}
