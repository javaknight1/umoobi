import { describe, expect, it } from "vitest";
import { parseWaitlistForm, toCsv } from "./index";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("parseWaitlistForm", () => {
  it("accepts a filmmaker with film details", () => {
    const r = parseWaitlistForm(
      form({
        email: " Maya@LowTide.test ",
        role: "filmmaker",
        film_title: "Salt & Static",
        film_kind: "feature",
        sells_today: "Vimeo On Demand",
        trailer_url: "vimeo.com/123",
        launch_emails: "on",
        source: "instagram",
      }),
    );
    expect(r).toEqual({
      ok: true,
      value: {
        email: "maya@lowtide.test",
        role: "filmmaker",
        film_title: "Salt & Static",
        film_kind: "feature",
        sells_today: "Vimeo On Demand",
        trailer_url: "https://vimeo.com/123",
        launch_emails: true,
        source: "instagram",
      },
    });
  });

  it("drops film details for viewers and leaves launch emails unticked by default", () => {
    const r = parseWaitlistForm(form({ email: "jordan@test.dev", role: "viewer", film_title: "x" }));
    expect(r.ok && r.value.film_title).toBeNull();
    expect(r.ok && r.value.launch_emails).toBe(false);
  });

  it("rejects bad email and missing role", () => {
    const r = parseWaitlistForm(form({ email: "nope" }));
    expect(r).toEqual({ ok: false, errors: { email: "Enter a valid email address.", role: "Pick one." } });
  });
});

describe("toCsv", () => {
  it("quotes fields and neutralizes formulas", () => {
    expect(toCsv([{ a: 'He said "hi"', b: "=SUM(A1)" }], ["a", "b"])).toBe('a,b\n"He said ""hi""","\'=SUM(A1)"\n');
  });
});
