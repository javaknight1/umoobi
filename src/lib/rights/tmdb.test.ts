import { describe, expect, it, vi } from "vitest";
import { judge, matchFilm, normalizeTitle } from "./tmdb";

const salt = { title: "Salt & Static", year: 2026, runtimeSeconds: 5640 };

describe("normalizeTitle", () => {
  it("ignores leading articles, punctuation and ampersands", () => {
    expect(normalizeTitle("The Salt & Static!")).toBe("salt and static");
  });
});

describe("judge", () => {
  it("needs title, year and runtime for a strong match", () => {
    expect(judge(salt, { title: "Salt and Static", year: 2026, runtimeMinutes: 93 })).toBe("strong");
    expect(judge(salt, { title: "Salt and Static", year: 2026, runtimeMinutes: 120 })).toBe("weak");
    expect(judge(salt, { title: "Salt and Static", year: 1999, runtimeMinutes: 94 })).toBe("weak");
    expect(judge(salt, { title: "Pepper", year: 2026, runtimeMinutes: 94 })).toBe("none");
  });
});

function fakeFetch(routes: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.includes(k));
    return key ? new Response(JSON.stringify(routes[key])) : new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("matchFilm", () => {
  it("is unavailable without a key", async () => {
    expect((await matchFilm(salt, undefined)).strength).toBe("unavailable");
  });

  it("finds a strong match on a known release", async () => {
    const f = fakeFetch({
      "/search/movie": { results: [{ id: 7, title: "Salt & Static", release_date: "2026-03-01" }] },
      "/movie/7": { runtime: 94 },
    });
    expect(await matchFilm(salt, "k", f)).toEqual({ strength: "strong", tmdbId: 7, matchedTitle: "Salt & Static", matchedYear: 2026 });
  });

  it("returns none when nothing shares the title", async () => {
    const f = fakeFetch({ "/search/movie": { results: [{ id: 9, title: "Something Else", release_date: "2020-01-01" }] } });
    expect((await matchFilm(salt, "k", f)).strength).toBe("none");
  });

  it("treats API errors as unavailable", async () => {
    const f = vi.fn(async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    expect((await matchFilm(salt, "k", f)).strength).toBe("unavailable");
  });
});
