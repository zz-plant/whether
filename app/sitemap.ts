import type { MetadataRoute } from "next";

// Regime Station SEO map for the primary report surface.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/formulas`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6
    }
  ];
}
