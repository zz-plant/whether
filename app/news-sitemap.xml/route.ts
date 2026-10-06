import { buildPublishedBriefPath, buildPublishedBriefTitle, getPublishedBriefs } from "../../lib/report/publishedBriefs";
import { escapeXml, organizationName } from "../../lib/seo";
import { siteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

/** Google News reads only articles published in the last two days from this file. */
const NEWS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Published weeks inside Google News's two-day window, as a news sitemap.
 *
 * The brief lands on Mondays, so the file holds the newest week for two days and
 * is then a valid, empty `urlset`; the archive stays in `sitemap.xml` and the
 * whole run in `feed.xml`. The title is the page's own, because News matches it to the article.
 */
export async function GET() {
  const now = Date.now();
  const entries = getPublishedBriefs().filter((brief) => {
    const published = new Date(brief.publishedAt).getTime();
    return !Number.isNaN(published) && now - published <= NEWS_WINDOW_MS && published <= now;
  });

  const urls = entries
    .map(
      (brief) => `  <url>
    <loc>${escapeXml(`${siteUrl}${buildPublishedBriefPath(brief.slug)}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(organizationName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(brief.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(buildPublishedBriefTitle(brief))}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`,
    { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } },
  );
}
