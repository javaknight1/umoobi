export type AssetKind = "master" | "trailer" | "clip";

export interface DirectUpload {
  uploadId: string;
  /** PUT target for the browser (resumable chunks via UpChunk for Mux). */
  url: string;
}

export interface AssetInfo {
  assetId: string;
  playbackId: string | null;
  durationSeconds: number | null;
  status: "processing" | "ready" | "errored";
}

export interface PlaybackTokens {
  playbackId: string;
  /** Signed JWTs for signed playback ids; null for public (trailers, dev). */
  playback: string | null;
  thumbnail: string | null;
  storyboard: string | null;
  /** DRM license token when DRM is on (D44). */
  drm: string | null;
  expiresAt: string;
}

/**
 * Video hosting: Mux in production, a dev provider locally (D49). Masters use signed
 * playback ids; trailers and clips are public. Masters never touch Umoobi's servers.
 */
export interface VideoProvider {
  readonly name: "mux" | "dev";
  createUpload(input: { filmId: string; assetRowId: string; kind: AssetKind; corsOrigin: string }): Promise<DirectUpload>;
  getAsset(assetId: string): Promise<AssetInfo>;
  /** Signed playback for a viewer session; tokens expire after 6 hours. */
  playbackTokens(playbackId: string, opts: { viewerSession: string }): Promise<PlaybackTokens>;
  /** Thumbnail URLs every `everySeconds` across the film, for content scanning. */
  frameUrls(playbackId: string, durationSeconds: number, everySeconds: number): Promise<string[]>;
  deleteAsset(assetId: string): Promise<void>;
}
