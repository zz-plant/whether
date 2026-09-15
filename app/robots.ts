import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/siteUrl";

// Capital Posture Governance SEO guardrails: make the dashboard discoverable and scannable.

export default function robots(): MetadataRoute.Robots {
  return {
    /*
     * `/api/` is closed by default; every API path a public document advertises
     * is opened here by name. `/api/mcp` was the one that slipped: llms.txt led
     * with it as the tool endpoint for agents while this file told the same
     * agents not to fetch it. `tests/robotsRoute.test.ts` now reads llms.txt and
     * checks each `/api/...` path it names against this allow list.
     */
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/og",
          "/brief.md",
          "/api/agent",
          "/api/mcp",
          "/.well-known/whether-agent.json",
          "/llms.txt",
          "/api/posture/current",
        ],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
