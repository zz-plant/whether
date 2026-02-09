import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

// Market Climate Station SEO guardrails: make the dashboard discoverable and scannable.

export default function robots(): MetadataRoute.Robots {
  return {
    // Allow social unfurlers and crawlers to resolve dynamic OG images while blocking other API routes.
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
