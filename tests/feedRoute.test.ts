import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { GET } from "../app/feed.xml/route";
import { formatDateUTC } from "../lib/formatters";
import { buildPublishedBriefPath, getPublishedBriefs } from "../lib/report/publishedBriefs";
import { siteUrl } from "../lib/siteUrl";
import { escapeXml } from "../lib/seo";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import { weeklyHeadline } from "../lib/report/reportEvidence";
import { serveUnreachableUpstreams } from "./fixtures/unreachableUpstreams";

serveUnreachableUpstreams();

const items = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "";

describe("feed.xml", () => {
  it("carries one permalink item per published week, plus the live week", async () => {
    const xml = await (await GET()).text();
    const published = getPublishedBriefs();
    assert.ok(published.length > 0, "the archive has at least one published week");

    const entries = items(xml);
    assert.ok(entries.length >= published.length, `${entries.length} items for ${published.length} published weeks`);

    for (const brief of published) {
      const link = `${siteUrl}${buildPublishedBriefPath(brief.slug)}`;
      const entry = entries.find((block) => tag(block, "link") === link);
      assert.ok(entry, `published week ${brief.slug} has an item at ${link}`);
      assert.match(entry, /isPermaLink="true"/);
      assert.equal(tag(entry, "guid"), link);
      assert.equal(tag(entry, "pubDate"), new Date(brief.publishedAt).toUTCString());
    }

    /* A live item, when present, is the only one allowed to point at the homepage. */
    const homepageItems = entries.filter((block) => tag(block, "link") === `${siteUrl}/`);
    assert.ok(homepageItems.length <= 1, "at most one item points at the live homepage");
  });

  it("gives every item a byline and a lead image, for readers and Apple News", async () => {
    const xml = await (await GET()).text();
    assert.match(xml, /xmlns:media="http:\/\/search\.yahoo\.com\/mrss\/"/);
    for (const entry of items(xml)) {
      assert.match(entry, /<dc:creator>Kanav Jain<\/dc:creator>/);
      assert.match(entry, /<media:content url="[^"]+\/api\/og[^"]*" medium="image" width="1200" height="630" \/>/);
    }
  });

  it("declares itself and links the site from the configured URL, not a literal", async () => {
    const xml = await (await GET()).text();
    assert.match(xml, new RegExp(`<atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss\\+xml" />`));
    assert.match(xml, new RegExp(`<link>${siteUrl}</link>`));

    const source = readFileSync(new URL("../app/feed.xml/route.ts", import.meta.url), "utf8");
    assert.ok(!source.includes('"https://whether.work"'), "the route derives every URL from siteUrl");
  });

  it("is well-formed XML", async () => {
    const xml = await (await GET()).text();
    /* Every text node went through the escaper: no bare ampersand survives outside CDATA. */
    const outsideCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|#)/.test(outsideCdata), "no unescaped ampersand outside CDATA");
    assert.equal((xml.match(/<item>/g) ?? []).length, (xml.match(/<\/item>/g) ?? []).length);
  });

  /*
   * The live item printed "Record date: Oct 9, 2026" (the week-ending Friday) under
   * a guid and pubDate dated Oct 5, and its confidence as "Confidence: Medium
   * confidence." Its record date is the one its guid names, and its confidence reads
   * as the published items' do.
   */
  it("dates the live item by its record date and states the margin once", async () => {
    const xml = await (await GET()).text();
    const live = items(xml).find((block) => tag(block, "link") === `${siteUrl}/`);
    if (!live) return; // the archive already carries this week

    const recordDate = tag(live, "guid").replace("whether-brief-live-", "");
    assert.match(recordDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(tag(live, "pubDate"), new Date(recordDate).toUTCString());
    assert.match(live, new RegExp(`<strong>Record date:</strong> ${formatDateUTC(recordDate)} · Room before a change: (clear of the line|within reach of the line|close to the line)</p>`));
    assert.doesNotMatch(live, /Confidence:|\b(High|Medium|Low) confidence\b/);
    /* The week's one headline action (`weeklyHeadline`), not the weekly summary's own sentence. */
    const { snapshot } = await loadWeeklyBriefSnapshot(undefined, { route: "test" });
    assert.ok(tag(live, "title").includes(escapeXml(weeklyHeadline(snapshot.weeklyCall).action)), tag(live, "title"));
  });

  /* The published items' html branch had no test, so the 2026-10-28 rename of the
     margin label reached the live item and missed every frozen week: the feed kept
     printing "Margin:" beside each record date. The archive is always present, so
     this runs on every invocation regardless of whether the live item does. */
  it("words the published items' margin the way the live item does", async () => {
    const xml = await (await GET()).text();
    const published = items(xml).filter((block) => tag(block, "link") !== `${siteUrl}/`);
    assert.ok(published.length > 0, "the archive is the feed's content; at least one frozen week is on the record");
    for (const item of published) {
      assert.match(item, /<strong>Record date:<\/strong> [^<]* · Room before a change: (clear of the line|within reach of the line|close to the line)<\/p>/);
      assert.doesNotMatch(item, /Margin:|Confidence:/);
    }
  });

  it("is announced from the root layout", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /rel="alternate" type="application\/rss\+xml"/);
  });
});
