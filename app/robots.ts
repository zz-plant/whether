import type { MetadataRoute } from "next";

// Regime Station SEO guardrails: make the dashboard discoverable and scannable.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
