import {
  buildPublishedBriefDescription,
  buildPublishedBriefFeedHtml,
  buildPublishedBriefImageUrl,
  buildPublishedBriefPath,
  buildPublishedBriefTitle,
  getPublishedBriefs,
  type PublishedBrief,
} from "../../lib/report/publishedBriefs";
import { canonicalPositioningLine, escapeXml, organizationName } from "../../lib/seo";
import { publisherAuthor, weeklyPublicationName } from "../../lib/publisher";
import { siteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

const FEED_PATH = "/feed.xml";

/* The size /api/og draws at, and the size Discover's large-image rule needs. */
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const toRfc822 = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toUTCString() : date.toUTCString();
};

/*
 * The item's title is the page's own, as the news sitemap's is. It printed the archive's slug and
 * the record date ("Week 2026-w45: Cloudy — week of Nov 3, 2026") over a page that says Nov 2.
 */
const renderItem = (brief: PublishedBrief) => {
  const link = `${siteUrl}${buildPublishedBriefPath(brief.slug)}`;
  return `    <item>
      <title>${escapeXml(buildPublishedBriefTitle(brief))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(brief.publishedAt)}</pubDate>
      <dc:creator>${escapeXml(publisherAuthor.name)}</dc:creator>
      <media:content url="${escapeXml(buildPublishedBriefImageUrl(brief))}" medium="image" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" />
      <description>${escapeXml(buildPublishedBriefDescription(brief))}</description>
      <content:encoded><![CDATA[
${buildPublishedBriefFeedHtml(brief)}
      ]]></content:encoded>
    </item>`;
};

/**
 * One item per published week, each at its permalink, and nothing else.
 *
 * The archive is the feed's content: a frozen record with a `publishedAt` stamp and a page that
 * will not change. Until 2026-11-05 the feed also carried the current week until it was frozen,
 * as an item at the homepage. That page changes every Monday, the item's guid stopped being used
 * at the freeze, so a reader showed the week twice, and a news platform takes an item's link as
 * an article. The homepage and the Monday email carry the week until its permalink exists.
 */
export async function GET() {
  const briefs = getPublishedBriefs();
  const newest = briefs[0];
  const lastBuildDate = newest ? toRfc822(newest.publishedAt) : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${weeklyPublicationName}</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}${FEED_PATH}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(canonicalPositioningLine)}</description>
    <language>en</language>
    <image>
      <url>${siteUrl}/icon-192.png</url>
      <title>${escapeXml(organizationName)}</title>
      <link>${siteUrl}</link>
    </image>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${briefs.map(renderItem).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
