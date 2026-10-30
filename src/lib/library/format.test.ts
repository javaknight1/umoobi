import { describe, expect, it } from "vitest";
import { formatPosition, rentalState, rentalWindowLabel, timeLeft } from "./format";

const now = new Date("2026-10-30T12:00:00Z");

describe("rentalWindowLabel", () => {
  it("labels windows", () => {
    expect(rentalWindowLabel(24)).toBe("24 hours");
    expect(rentalWindowLabel(48)).toBe("48 hours");
    expect(rentalWindowLabel(72)).toBe("72 hours");
    expect(rentalWindowLabel(168)).toBe("7 days");
  });
});

describe("timeLeft", () => {
  it("counts down", () => {
    expect(timeLeft("2026-10-30T12:40:00Z", now)).toBe("40 minutes left");
    expect(timeLeft("2026-10-30T13:00:30Z", now)).toBe("1 hour left");
    expect(timeLeft("2026-11-01T11:00:00Z", now)).toBe("47 hours left");
    expect(timeLeft("2026-11-04T12:00:00Z", now)).toBe("5 days left");
    expect(timeLeft("2026-10-30T11:00:00Z", now)).toBe("Expired");
  });
});

describe("rentalState", () => {
  it("waits for first play", () => {
    expect(rentalState({ first_played_at: null, expires_at: "2026-11-29T12:00:00Z", rental_hours: 48 }, now)).toEqual({
      label: "Starts when you press play · 48 hours to finish",
      watchable: true,
    });
  });
  it("counts down once started, then expires", () => {
    expect(
      rentalState({ first_played_at: "2026-10-30T10:00:00Z", expires_at: "2026-11-01T10:00:00Z", rental_hours: 48 }, now).label,
    ).toBe("46 hours left");
    expect(
      rentalState({ first_played_at: "2026-10-28T10:00:00Z", expires_at: "2026-10-30T10:00:00Z", rental_hours: 48 }, now),
    ).toEqual({ label: "Expired", watchable: false });
  });
});

describe("formatPosition", () => {
  it("formats resume points", () => {
    expect(formatPosition(247)).toBe("4:07");
    expect(formatPosition(3909)).toBe("1:05:09");
  });
});
