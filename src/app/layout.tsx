import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { siteName, siteUrl } from "@/lib/site";
import "./globals.css";

const brand = Bricolage_Grotesque({ variable: "--font-brand", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} — Sell your film from one link`, template: `%s · ${siteName}` },
  description:
    "Umoobi lets verified independent filmmakers rent and sell their films directly to their audience, at their price, from one shareable page.",
};

export const viewport: Viewport = { themeColor: "#1a1730" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${brand.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
