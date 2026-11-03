import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { launchStage } from "@/lib/launch";
import { siteUrl } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

const STATIC = ["/", "/guides/leaving-vimeo-on-demand", "/legal/terms", "/legal/privacy", "/legal/license", "/legal/ai-policy", "/dmca"];

/** Public pages; after launch also every published film and every person page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const pages: MetadataRoute.Sitemap = STATIC.map((p) => ({ url: `${siteUrl}${p}` }));
  if (launchStage === "waitlist") return pages;

  const db = createPublicClient();
  const [{ data: films }, { data: people }] = await Promise.all([
    db.from("films").select("slug, published_at").eq("status", "published").order("published_at", { ascending: false }).limit(5000),
    db.from("people").select("slug, created_at").limit(5000),
  ]);
  pages.push({ url: `${siteUrl}/discover` });
  for (const f of films ?? []) pages.push({ url: `${siteUrl}/f/${f.slug}`, lastModified: f.published_at ?? undefined });
  for (const p of people ?? []) pages.push({ url: `${siteUrl}/p/${p.slug}`, lastModified: p.created_at });
  return pages;
}
