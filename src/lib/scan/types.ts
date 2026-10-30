/** Per-frame model outputs, each 0–1. */
export interface FrameScore {
  url: string;
  /** Sexual activity, sexual display or erotica (the strongest of the three). */
  explicit: number;
  /** Very suggestive / suggestive, for reasons only; doesn't block. */
  suggestive: number;
  /** Probability the picture was made by a generative model. */
  aiGenerated: number;
}

export interface ScanSummary {
  framesScanned: number;
  maxExplicit: number;
  explicitFrames: number;
  maxAiGenerated: number;
  aiFrames: number;
  /** Frames the scanner couldn't read (network, quota). */
  failedFrames: number;
}

export interface ScanContext {
  title: string;
}

/**
 * Content scanning on sampled frames: nudity and AI-generated imagery (D42, D46).
 * Sightengine in production; a deterministic dev scanner locally (D49).
 */
export interface ContentScanner {
  readonly name: "sightengine" | "dev";
  scanFrames(urls: string[], ctx: ScanContext): Promise<FrameScore[]>;
}
