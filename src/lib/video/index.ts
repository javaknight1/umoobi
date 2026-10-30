import "server-only";
import { devProvidersAllowed } from "@/lib/payments";
import { DevVideo } from "./dev";
import { MuxVideo } from "./mux";
import type { VideoProvider } from "./types";

let cached: VideoProvider | undefined;

export function video(): VideoProvider {
  if (cached) return cached;
  if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) cached = new MuxVideo();
  else if (devProvidersAllowed()) cached = new DevVideo();
  else throw new Error("MUX_TOKEN_ID / MUX_TOKEN_SECRET are not set");
  return cached;
}

export type { VideoProvider } from "./types";
