import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/og/font";
import { posterArt, PosterShape } from "@/components/brand";
import { formatCents } from "@/lib/money";
import { createPublicClient } from "@/lib/supabase/public";

export const alt = "Film on Umoobi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card for a film link (T019): its generated poster, title, filmmaker and price. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: film } = await createPublicClient()
    .from("films")
    .select("title, release_year, runtime_seconds, ai_generated, filmmaker_accounts(display_name), offers(kind, price_cents, active)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  const title = film?.title ?? "Umoobi";
  const art = posterArt(slug, title);
  const by = (film?.filmmaker_accounts as unknown as { display_name: string } | null)?.display_name;
  const offers = (film?.offers ?? []).filter((o) => o.active);
  const price = offers
    .sort((a, b) => (a.kind === "rent" ? -1 : 1) - (b.kind === "rent" ? -1 : 1))
    .map((o) => (o.price_cents === 0 ? "Free" : `${o.kind === "rent" ? "Rent" : "Buy"} ${formatCents(o.price_cents)}`))
    .join(" · ");
  const meta = [film?.release_year, film?.runtime_seconds ? `${Math.round(film.runtime_seconds / 60)} min` : null].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#1a1730", color: "#f1effa", fontFamily: "Bricolage", padding: 56, gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 340, height: 518, borderRadius: 24, background: art.bg, padding: 28, justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: art.title, lineHeight: 1.05 }}>{title}</div>
          <svg width="230" height="299" viewBox="0 0 200 260" style={{ alignSelf: "center" }}>
            {PosterShape({ m: art.motif, ink: art.ink })}
          </svg>
          {by ? <div style={{ display: "flex", fontSize: 20, color: art.title }}>A film by {by}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700 }}>
            <div style={{ width: 30, height: 30, borderRadius: 30, background: "#ffad33" }} />
            umoobi
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {meta ? <div style={{ display: "flex", fontSize: 26, color: "#b3aed3" }}>{meta}</div> : null}
            <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1 }}>{title}</div>
            {by ? <div style={{ display: "flex", fontSize: 30, color: "#d4d0ea" }}>A film by {by}</div> : null}
            {film?.ai_generated ? <div style={{ display: "flex", fontSize: 22, color: "#ffad33" }}>AI-generated</div> : null}
          </div>
          {price ? (
            <div style={{ display: "flex", alignSelf: "flex-start", background: "#ffad33", color: "#1a1730", borderRadius: 999, padding: "16px 30px", fontSize: 30, fontWeight: 700 }}>
              {price}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      </div>
    ),
    { ...size, fonts: await brandFonts() },
  );
}
