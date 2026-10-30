import "server-only";
import { siteUrl } from "@/lib/site";
import type { AssetInfo, DirectUpload, PlaybackTokens, VideoProvider } from "./types";

/** Mux's public demo stream, so dev playback is real HLS without an account. */
export const DEV_PLAYBACK_ID = "a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M";

/**
 * Local stand-in for Mux (D49). Uploads go to a dev route that accepts and discards the
 * bytes, then marks the asset ready with the demo playback id and a duration from the form.
 */
export class DevVideo implements VideoProvider {
  readonly name = "dev" as const;

  async createUpload({ assetRowId }: { assetRowId: string }): Promise<DirectUpload> {
    return { uploadId: `up_dev_${assetRowId}`, url: `${siteUrl}/api/dev/video/upload?asset=${assetRowId}` };
  }

  async getAsset(assetId: string): Promise<AssetInfo> {
    return { assetId, playbackId: DEV_PLAYBACK_ID, durationSeconds: null, status: "ready" };
  }

  async playbackTokens(playbackId: string): Promise<PlaybackTokens> {
    return {
      playbackId,
      playback: null,
      thumbnail: null,
      storyboard: null,
      drm: null,
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    };
  }

  async frameUrls(playbackId: string, durationSeconds: number, everySeconds: number) {
    const out: string[] = [];
    for (let t = 0; t < durationSeconds; t += everySeconds) {
      out.push(`https://image.mux.com/${playbackId}/thumbnail.jpg?time=${t}&width=640`);
    }
    return out;
  }

  async deleteAsset() {}
}
