import "server-only";
import { devProvidersAllowed } from "@/lib/payments";
import { DevScanner } from "./dev";
import { SightengineScanner } from "./sightengine";
import type { ContentScanner } from "./types";

export function scanner(): ContentScanner {
  const user = process.env.SIGHTENGINE_API_USER;
  const secret = process.env.SIGHTENGINE_API_SECRET;
  if (user && secret) return new SightengineScanner(user, secret);
  if (devProvidersAllowed()) return new DevScanner();
  throw new Error("SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET are not set");
}

export type { ContentScanner, ScanSummary } from "./types";
