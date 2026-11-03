import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/og/font";

export const alt = "Umoobi: sell your film from one link, at your price";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for the site (landing, guide, legal). */
export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#1a1730", color: "#f1effa", fontFamily: "Bricolage", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 36, height: 36, borderRadius: 36, background: "#ffad33" }} />
          umoobi
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 800, lineHeight: 1 }}>Your film is finished.</div>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 800, lineHeight: 1 }}>Now let people watch it.</div>
          <div style={{ display: "flex", fontSize: 34, color: "#b3aed3" }}>Rent or sell your film from one link, at your price.</div>
        </div>
      </div>
    ),
    { ...size, fonts: await brandFonts() },
  );
}
