import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/staff", "/settings", "/library", "/watch", "/checkout", "/api", "/dev", "/auth", "/claim", "/waitlist/confirm"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
