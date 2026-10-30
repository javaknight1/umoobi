import type { FrameScore, ScanSummary } from "./types";

/** Thresholds (D53, Proposed until spike S4 tunes them on 50 real films). */
export const EXPLICIT_BLOCK = 0.85;
export const EXPLICIT_REVIEW = 0.5;
export const AI_FLAG = 0.9;

export function summarize(frames: FrameScore[], requested: number): ScanSummary {
  return {
    framesScanned: frames.length,
    maxExplicit: Math.max(0, ...frames.map((f) => f.explicit)),
    explicitFrames: frames.filter((f) => f.explicit >= EXPLICIT_REVIEW).length,
    maxAiGenerated: Math.max(0, ...frames.map((f) => f.aiGenerated)),
    aiFrames: frames.filter((f) => f.aiGenerated >= AI_FLAG).length,
    failedFrames: Math.max(0, requested - frames.length),
  };
}
