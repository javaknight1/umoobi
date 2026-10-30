import { describe, expect, it, vi } from "vitest";
import { DevScanner } from "./dev";
import { mapSightengine, SightengineScanner } from "./sightengine";
import { summarize } from "./summary";

describe("mapSightengine", () => {
  it("takes the strongest explicit class and the genai score", () => {
    expect(
      mapSightengine("u", {
        status: "success",
        nudity: { sexual_activity: 0.1, sexual_display: 0.7, erotica: 0.2, very_suggestive: 0.3, suggestive: 0.4, context: { sea_lake_pool: 0.9 } },
        type: { ai_generated: 0.92 },
      }),
    ).toEqual({ url: "u", explicit: 0.7, suggestive: 0.4, aiGenerated: 0.92 });
  });
});

describe("SightengineScanner", () => {
  it("drops failed frames and keeps going", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => {
      n++;
      if (n === 2) throw new Error("network");
      return new Response(JSON.stringify({ status: "success", nudity: { none: 0.99 }, type: { ai_generated: 0.01 } }));
    }) as unknown as typeof fetch;
    const frames = await new SightengineScanner("u", "s", fetchImpl, 1).scanFrames(["a", "b", "c"]);
    expect(frames).toHaveLength(2);
    expect(summarize(frames, 3)).toMatchObject({ framesScanned: 2, failedFrames: 1, aiFrames: 0, explicitFrames: 0 });
  });
});

describe("DevScanner", () => {
  it("flags only tagged titles", async () => {
    const s = new DevScanner();
    const urls = ["0", "5", "10", "15"];
    expect(summarize(await s.scanFrames(urls, { title: "Salt & Static" }), 4)).toMatchObject({ aiFrames: 0, explicitFrames: 0 });
    expect(summarize(await s.scanFrames(urls, { title: "Dreams [flag-ai]" }), 4)).toMatchObject({ aiFrames: 1 });
    expect(summarize(await s.scanFrames(urls, { title: "X [flag-nudity]" }), 4).maxExplicit).toBeGreaterThan(0.85);
  });
});
