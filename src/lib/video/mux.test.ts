/* eslint-disable @typescript-eslint/no-explicit-any -- untyped mocked SDK payloads */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const created: Record<string, any>[] = [];
vi.mock("@mux/mux-node", () => ({
  default: class {
    video = {
      uploads: { create: vi.fn(async (p: Record<string, any>) => (created.push(p), { id: "up_1", url: "https://storage.mux.com/up" })) },
    };
    jwt = { signPlaybackId: vi.fn(async () => "jwt") };
  },
}));

const { MuxVideo } = await import("./mux");

describe("MuxVideo uploads", () => {
  it("masters are signed, trailers are public", async () => {
    const mux = new MuxVideo();
    await mux.createUpload({ filmId: "f", assetRowId: "a1", kind: "master", corsOrigin: "https://umoobi.sharkfins.xyz" });
    await mux.createUpload({ filmId: "f", assetRowId: "a2", kind: "trailer", corsOrigin: "https://umoobi.sharkfins.xyz" });
    expect(created[0].new_asset_settings.playback_policies).toEqual(["signed"]);
    expect(created[1].new_asset_settings.playback_policies).toEqual(["public"]);
    expect(JSON.parse(created[0].new_asset_settings.passthrough)).toEqual({ film_id: "f", asset_row_id: "a1", kind: "master" });
  });

  it("signs playback tokens for six hours with no viewer identity beyond the session", async () => {
    const mux = new MuxVideo();
    const t = await mux.playbackTokens("pb_1", { viewerSession: "sess-1" });
    expect(t.playback).toBe("jwt");
    expect(t.drm).toBeNull();
    expect(Date.parse(t.expiresAt) - Date.now()).toBeGreaterThan(5.9 * 3600_000);
  });
});
