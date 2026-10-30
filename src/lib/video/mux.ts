import "server-only";
import Mux from "@mux/mux-node";
import type { AssetInfo, AssetKind, DirectUpload, PlaybackTokens, VideoProvider } from "./types";

const SIX_HOURS = 6 * 3600;

export class MuxVideo implements VideoProvider {
  readonly name = "mux" as const;
  private mux: Mux;

  constructor() {
    this.mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
      jwtSigningKey: process.env.MUX_SIGNING_KEY_ID,
      jwtPrivateKey: process.env.MUX_SIGNING_PRIVATE_KEY,
      webhookSecret: process.env.MUX_WEBHOOK_SECRET,
    });
  }

  get client() {
    return this.mux;
  }

  async createUpload({ filmId, assetRowId, kind, corsOrigin }: { filmId: string; assetRowId: string; kind: AssetKind; corsOrigin: string }): Promise<DirectUpload> {
    const upload = await this.mux.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        // Masters are signed; trailers and clips are free to watch (D17, D23).
        playback_policies: [kind === "master" ? "signed" : "public"],
        video_quality: "plus",
        passthrough: JSON.stringify({ film_id: filmId, asset_row_id: assetRowId, kind }),
        ...(kind === "master" && process.env.MUX_DRM_ENABLED === "true"
          ? { advanced_playback_policies: [{ policy: "drm" as const, drm_configuration_id: process.env.MUX_DRM_CONFIGURATION_ID! }] }
          : {}),
      },
    });
    if (!upload.url) throw new Error("Mux returned no upload URL");
    return { uploadId: upload.id, url: upload.url };
  }

  async getAsset(assetId: string): Promise<AssetInfo> {
    const a = await this.mux.video.assets.retrieve(assetId);
    return {
      assetId,
      playbackId: a.playback_ids?.[0]?.id ?? null,
      durationSeconds: a.duration ?? null,
      status: a.status === "ready" ? "ready" : a.status === "errored" ? "errored" : "processing",
    };
  }

  async playbackTokens(playbackId: string, { viewerSession }: { viewerSession: string }): Promise<PlaybackTokens> {
    const sign = (type: "video" | "thumbnail" | "storyboard" | "drm_license") =>
      this.mux.jwt.signPlaybackId(playbackId, { type, expiration: `${SIX_HOURS}s`, params: { sub: viewerSession } });
    const drmOn = process.env.MUX_DRM_ENABLED === "true";
    return {
      playbackId,
      playback: await sign("video"),
      thumbnail: await sign("thumbnail"),
      storyboard: await sign("storyboard"),
      drm: drmOn ? await sign("drm_license") : null,
      expiresAt: new Date(Date.now() + SIX_HOURS * 1000).toISOString(),
    };
  }

  async frameUrls(playbackId: string, durationSeconds: number, everySeconds: number) {
    const urls: string[] = [];
    for (let t = 0; t < durationSeconds; t += everySeconds) {
      const token = await this.mux.jwt.signPlaybackId(playbackId, {
        type: "thumbnail",
        expiration: "1h",
        params: { time: String(t), width: "640" },
      });
      urls.push(`https://image.mux.com/${playbackId}/thumbnail.jpg?token=${token}`);
    }
    return urls;
  }

  async deleteAsset(assetId: string) {
    await this.mux.video.assets.delete(assetId);
  }
}
