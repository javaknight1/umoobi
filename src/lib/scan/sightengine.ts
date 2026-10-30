import type { ContentScanner, FrameScore } from "./types";

interface SightengineResponse {
  status: "success" | "failure";
  nudity?: Record<string, number | Record<string, number>>;
  type?: { ai_generated?: number };
  error?: { message: string };
}

const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** Maps one Sightengine response (models nudity-2.1 + genai) to a frame score. */
export function mapSightengine(url: string, r: SightengineResponse): FrameScore {
  const n = r.nudity ?? {};
  return {
    url,
    explicit: Math.max(num(n.sexual_activity), num(n.sexual_display), num(n.erotica)),
    suggestive: Math.max(num(n.very_suggestive), num(n.suggestive)),
    aiGenerated: num(r.type?.ai_generated),
  };
}

/**
 * Sightengine image API on frames sampled every 5 s from Mux thumbnails. Runs a few
 * requests at a time; frames that fail are dropped and counted as failed by the caller.
 */
export class SightengineScanner implements ContentScanner {
  readonly name = "sightengine" as const;

  constructor(
    private user: string,
    private secret: string,
    private fetchImpl: typeof fetch = fetch,
    private concurrency = 4,
  ) {}

  async scanFrames(urls: string[]): Promise<FrameScore[]> {
    const out: FrameScore[] = [];
    let next = 0;
    const worker = async () => {
      while (next < urls.length) {
        const url = urls[next++];
        const q = new URLSearchParams({ url, models: "nudity-2.1,genai", api_user: this.user, api_secret: this.secret });
        try {
          const res = await this.fetchImpl(`https://api.sightengine.com/1.0/check.json?${q}`);
          const body = (await res.json()) as SightengineResponse;
          if (body.status === "success") out.push(mapSightengine(url, body));
        } catch {
          // counted as a failed frame
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, urls.length) }, worker));
    return out;
  }
}
