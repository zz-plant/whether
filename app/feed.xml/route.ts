import { buildAgentInterfaceResponse } from "../../lib/agentInterface";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { weeklyHeadline } from "../../lib/report/reportEvidence";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { formatMarginStamp } from "../../lib/report/reportFormatting";
import { buildPublishedBriefImageUrl, buildPublishedBriefPath, getPublishedBriefs, publishedBriefDisplay, publishedBriefHeadline } from "../../lib/report/publishedBriefs";
import { buildSocialImageUrl, canonicalPositioningLine, escapeXml, organizationName } from "../../lib/seo";
import { publisherAuthor } from "../../lib/publisher";
import { siteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

const FEED_PATH = "/feed.xml";
const CHANNEL_TITLE = "Whether Weekly Brief";
const CHANNEL_DESCRIPTION = canonicalPositioningLine;

const toRfc822 = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? new Date().toUTCString() : date.toUTCString();
};

type FeedItem = {
  title: string;
  link: string;
  guid: string;
  isPermaLink: boolean;
  pubDate: string;
  description: string;
  html: string;
  /** The card the item's page declares; readers and Apple News take it as the lead image. */
  imageUrl: string;
};

/* The size /api/og draws at, and the size Discover's large-image rule needs. */
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const renderItem = (item: FeedItem) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="${item.isPermaLink ? "true" : "false"}">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <dc:creator>${escapeXml(publisherAuthor.name)}</dc:creator>
      <media:content url="${escapeXml(item.imageUrl)}" medium="image" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" />
      <description>${escapeXml(item.description)}</description>
      <content:encoded><![CDATA[
${item.html}
      ]]></content:encoded>
    </item>`;

const renderChannel = (items: FeedItem[], lastBuildDate: string) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${CHANNEL_TITLE}</title>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}${FEED_PATH}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>
    <language>en</language>
    <image>
      <url>${siteUrl}/icon.svg</url>
      <title>${escapeXml(organizationName)}</title>
      <link>${siteUrl}</link>
    </image>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items.map(renderItem).join("\n")}
  </channel>
</rss>`;

/**
 * One item per published week, each at its permalink.
 *
 * The archive is the feed's real content: a frozen record with a `publishedAt`
 * stamp and a page that will not change. The feed used to ignore it and emit a
 * single item pointing at the homepage, so a reader saw the same entry rewrite
 * itself every week and never got a link that stayed true.
 */
const publishedItems = (): FeedItem[] =>
  getPublishedBriefs().map((brief) => {
    const display = publishedBriefDisplay(brief);
    const link = `${siteUrl}${buildPublishedBriefPath(brief.slug)}`;
    return {
      title: `Week ${brief.slug}: ${display.headline.startsWith(display.conditions) ? display.headline : `${display.conditions} — ${display.headline}`}`,
      link,
      guid: link,
      isPermaLink: true,
      pubDate: toRfc822(brief.publishedAt),
      description: brief.summary,
      imageUrl: buildPublishedBriefImageUrl(brief),
      html: [
        `        <p><strong>Conditions:</strong> ${escapeXml(display.conditions)}</p>`,
        /* The week's one headline (`publishedBriefHeadline`); the stored action
           printed under "Action" beside it, a second instruction for the week. */
        `        <p>${escapeXml(publishedBriefHeadline(brief).composed)}</p>`,
        /* Through the display layer: w38 and w39 stored "Pressure increased by +3.0 this week", a figure in no unit against Aug 31. */
        `        <p><strong>What changed:</strong> ${escapeXml(display.whatChanged)}</p>`,
        `        <p><strong>Record date:</strong> ${escapeXml(brief.recordDateLabel)} · Margin: ${escapeXml(display.confidence.toLowerCase())}</p>`,
        `        <p><a href="${escapeXml(link)}">Read the published brief →</a></p>`,
      ].join("\n"),
    };
  });

export async function GET() {
  const published = publishedItems();

  try {
    const brief = await buildAgentInterfaceResponse("weekly");
    const summary = brief.summary;
    const regime = summary.regimeLabel;
    /* The week's headline action, from the source the homepage h1 and every paste
       read (`weeklyHeadline`). It printed the weekly summary's own sentence, a third
       wording of the week's instruction. */
    const action = await loadWeeklyBriefSnapshot(undefined, { route: "/feed.xml" })
      .then(({ snapshot }) => weeklyHeadline(snapshot.weeklyCall).action)
      .catch(() => summary.guidance);
    const recordDateIso = brief.agentHandoff.payload.report_date;
    const recordDateLabel = summary.recordDateLabel ?? recordDateIso;
    /* The published confidence, worded as the archive items below word theirs. This
       printed `summary.confidence`, the engine's own label, as a raw code ("MEDIUM")
       while the page said "High confidence". The phrase carries its own noun, so it
       stands alone: under a "Confidence:" label it read "Confidence: Medium confidence." */
    const confidence = formatMarginStamp(brief.confidence.label);

    /*
     * The current week, until it is frozen. Once the archive holds a record for
     * this record date the permalink item carries it, and a second entry for
     * the same week would only make readers show it twice.
     */
    const alreadyPublished = getPublishedBriefs().some((entry) => entry.recordDate === recordDateIso);
    const liveItem: FeedItem[] = alreadyPublished
      ? []
      : [{
          title: `This week — ${regime}: ${action}`,
          link: `${siteUrl}/`,
          guid: `whether-brief-live-${recordDateIso}`,
          isPermaLink: false,
          pubDate: toRfc822(recordDateIso),
          imageUrl: buildSocialImageUrl(),
          description: `Conditions: ${regime}. ${DECISION_CONTRACT_LABELS.slot.action}: ${action}. ${confidence}.`,
          html: [
            `        <p><strong>Conditions:</strong> ${escapeXml(regime)}</p>`,
            `        <p><strong>${DECISION_CONTRACT_LABELS.slot.action}:</strong> ${escapeXml(action)}</p>`,
            `        <p><strong>Record date:</strong> ${escapeXml(recordDateLabel)} · ${escapeXml(confidence)}</p>`,
            `        <p><a href="${siteUrl}/">View the live brief →</a></p>`,
            `        <p style="font-size:0.85rem;color:#525c60;">Based on public data. Your situation may vary.</p>`,
          ].join("\n"),
        }];

    return new Response(renderChannel([...liveItem, ...published], toRfc822(recordDateIso)), {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    /*
     * The live brief failed to assemble. The archive does not depend on it, so
     * the feed still carries every published week rather than an apology.
     */
    const lastBuildDate = published[0]?.pubDate ?? new Date().toUTCString();
    return new Response(renderChannel(published, lastBuildDate), {
      headers: { "content-type": "application/rss+xml; charset=utf-8" },
    });
  }
}
