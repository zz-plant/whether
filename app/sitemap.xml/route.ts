import { SITEMAP_SEGMENTS } from "../sitemap";
import { escapeXml } from "../../lib/seo";
import { siteUrl } from "../../lib/siteUrl";

export const runtime = "edge";

/**
 * The sitemap index.
 *
 * `app/sitemap.ts` declares `generateSitemaps`, which vinext renders as
 * `/sitemap/{segment}.xml` children but does not also serve an index for. Robots
 * and every search engine expect `/sitemap.xml`, so the index is explicit here.
 */
export async function GET() {
  const children = SITEMAP_SEGMENTS.map(
    (segment) => `  <sitemap><loc>${escapeXml(`${siteUrl}/sitemap/${segment}.xml`)}</loc></sitemap>`,
  ).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${children}\n</sitemapindex>`,
    {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}
