import type { ContentScanner, FrameScore, ScanContext } from "./types";

/**
 * Dev scanner (D49): every frame is clean unless the film title contains "[flag-ai]" or
 * "[flag-nudity]" (or "[review-nudity]" for a borderline score), so tests can exercise
 * each path without a Sightengine account.
 */
export class DevScanner implements ContentScanner {
  readonly name = "dev" as const;

  async scanFrames(urls: string[], { title }: ScanContext): Promise<FrameScore[]> {
    const t = title.toLowerCase();
    return urls.map((url, i) => ({
      url,
      explicit: t.includes("[flag-nudity]") && i === 1 ? 0.97 : t.includes("[review-nudity]") && i === 1 ? 0.6 : 0.01,
      suggestive: 0.02,
      aiGenerated: t.includes("[flag-ai]") && i === 2 ? 0.98 : 0.03,
    }));
  }
}
