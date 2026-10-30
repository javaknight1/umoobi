import { describe, expect, it } from "vitest";
import { scoreFilm, type FilmSignals } from "./film";

const clean = { framesScanned: 1128, maxExplicit: 0.02, explicitFrames: 0, maxAiGenerated: 0.04, aiFrames: 0, failedFrames: 0 };
const maya: FilmSignals = {
  accountVerified: true,
  established: false,
  rightsStatement: true,
  scan: clean,
  rights: "none",
  strikes: 0,
  declaredAi: false,
};

describe("scoreFilm", () => {
  it("clears a verified filmmaker's clean original film", () => {
    expect(scoreFilm(maya)).toMatchObject({ score: 95, decision: "approve", undeclaredAi: false, hardReject: null });
  });

  it("still clears without TMDB", () => {
    expect(scoreFilm({ ...maya, rights: "unavailable" })).toMatchObject({ score: 90, decision: "approve" });
  });

  it("sends a strong match to a known release to staff", () => {
    expect(scoreFilm({ ...maya, rights: "strong" })).toMatchObject({ score: 65, decision: "review" });
  });

  it("sends borderline nudity to staff", () => {
    expect(scoreFilm({ ...maya, scan: { ...clean, maxExplicit: 0.6, explicitFrames: 2 } }).decision).toBe("review");
  });

  it("rejects explicit content outright", () => {
    expect(scoreFilm({ ...maya, scan: { ...clean, maxExplicit: 0.97, explicitFrames: 1 } })).toMatchObject({
      score: 0,
      decision: "reject",
      hardReject: "Sexually explicit content isn't allowed on Umoobi.",
    });
  });

  it("flags undeclared AI without changing the score, and not when declared", () => {
    const ai = { ...clean, maxAiGenerated: 0.98, aiFrames: 1 };
    expect(scoreFilm({ ...maya, scan: ai })).toMatchObject({ score: 95, undeclaredAi: true });
    expect(scoreFilm({ ...maya, scan: ai, declaredAi: true }).undeclaredAi).toBe(false);
  });

  it("lowers the score for strikes and missing rights statements", () => {
    expect(scoreFilm({ ...maya, strikes: 2 })).toMatchObject({ score: 65, decision: "review" });
    expect(scoreFilm({ ...maya, rightsStatement: false, strikes: 3 }).decision).toBe("reject");
  });

  it("gives less credit when the scan only covered part of the film", () => {
    expect(scoreFilm({ ...maya, scan: { ...clean, framesScanned: 500, failedFrames: 628 } }).score).toBe(80);
  });
});
