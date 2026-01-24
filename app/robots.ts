import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

// Market Climate Station SEO guardrails: make the dashboard discoverable and scannable.

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
