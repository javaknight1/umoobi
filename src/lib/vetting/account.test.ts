import { describe, expect, it } from "vitest";
import { extractLinks, namesMatch, scoreAccount, type AccountSignals } from "./account";

const maya: AccountSignals = {
  identityVerified: true,
  nameMatches: true,
  pastWorkLinks: ["https://www.imdb.com/name/nm000"],
  website: "lowtidepictures.com",
  email: "maya@lowtidepictures.com",
  payoutsReady: true,
};

describe("scoreAccount", () => {
  it("approves a verified filmmaker with film credits", () => {
    expect(scoreAccount(maya)).toMatchObject({ score: 100, decision: "approve" });
  });

  it("approves on ID + name + film site + payouts, even on gmail without a website", () => {
    expect(scoreAccount({ ...maya, website: null, email: "maya@gmail.com" })).toMatchObject({ score: 90, decision: "approve" });
  });

  it("sends a filmmaker with no past work to review", () => {
    expect(scoreAccount({ ...maya, pastWorkLinks: [], website: null, email: "m@gmail.com" })).toMatchObject({
      score: 75,
      decision: "review",
    });
  });

  it("rejects without a verified ID", () => {
    expect(scoreAccount({ ...maya, identityVerified: false, nameMatches: null }).decision).toBe("reject");
  });
});

describe("namesMatch", () => {
  it("ignores case, accents and middle names", () => {
    expect(namesMatch("Maya Okafor", "MAYA A. OKAFOR")).toBe(true);
    expect(namesMatch("José Núñez", "Jose Nunez")).toBe(true);
    expect(namesMatch("Maya Okafor", "Sam Lee")).toBe(false);
    expect(namesMatch(null, "Sam Lee")).toBeNull();
  });
});

describe("extractLinks", () => {
  it("finds links in free text", () => {
    expect(extractLinks("IMDb: imdb.com/name/nm1, trailer https://vimeo.com/123 thanks")).toEqual([
      "imdb.com/name/nm1",
      "https://vimeo.com/123",
    ]);
  });
});
