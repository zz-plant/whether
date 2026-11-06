import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { GET } from "../app/feed.xml/route";
import {
  buildPublishedBriefPath,
  buildPublishedBriefTitle,
  correctionBody,
  findPublishedBrief,
  getPublishedBriefs,
  labelForArea,
} from "../lib/report/publishedBriefs";
import { siteUrl } from "../lib/siteUrl";
import { escapeXml } from "../lib/seo";

const items = (xml: string) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
const tag = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "";
const itemFor = (xml: string, slug: string) => {
  const link = `${siteUrl}${buildPublishedBriefPath(slug)}`;
  const entry = items(xml).find((block) => tag(block, "link") === link);
  assert.ok(entry, `an item at ${link}`);
  return entry;
};

describe("feed.xml", () => {
  it("carries one permalink item per published week, and nothing else", async () => {
    const xml = await (await GET()).text();
    const published = getPublishedBriefs();
    assert.ok(published.length > 0, "the archive has at least one published week");

    const entries = items(xml);
    assert.equal(entries.length, published.length, "a news platform takes every item's link as an article");

    for (const brief of published) {
      const entry = itemFor(xml, brief.slug);
      assert.match(entry, /isPermaLink="true"/);
      assert.equal(tag(entry, "guid"), `${siteUrl}${buildPublishedBriefPath(brief.slug)}`);
      assert.equal(tag(entry, "pubDate"), new Date(brief.publishedAt).toUTCString());
    }
    assert.ok(!entries.some((block) => tag(block, "link") === `${siteUrl}/`), "no item points at the homepage");
  });

  it("titles each item with the page's own title, not the archive's slug", async () => {
    const xml = await (await GET()).text();
    for (const brief of getPublishedBriefs()) {
      assert.equal(tag(itemFor(xml, brief.slug), "title"), escapeXml(buildPublishedBriefTitle(brief)));
    }
    assert.doesNotMatch(xml, /<title>Week \d{4}-w/);
  });

  it("carries each week in full, so a platform that takes only full text can run it", async () => {
    const xml = await (await GET()).text();
    for (const brief of getPublishedBriefs()) {
      const content = tag(itemFor(xml, brief.slug), "content:encoded");
      for (const decision of brief.decisions) {
        assert.ok(content.includes(`<h3>${escapeXml(labelForArea(decision.area))}</h3>`), `${brief.slug}: ${decision.area}`);
      }
      assert.ok(content.includes("<h2>What changed this week</h2>"), brief.slug);
      assert.ok(content.includes("<h2>Provenance</h2>"), brief.slug);
    }
    const w45 = findPublishedBrief("2026-w45");
    assert.ok(w45);
    const content = tag(itemFor(xml, w45.slug), "content:encoded");
    assert.ok(content.includes("<h2>The numbers behind the guidance</h2>"));
    assert.ok(content.includes("Only replace people who leave"), "an area's own action, not only its name");
    assert.ok(content.split(/\s+/).length > 250, "more words than a teaser");
  });

  it("prints a correction inside the item it corrects", async () => {
    const xml = await (await GET()).text();
    const w44 = findPublishedBrief("2026-w44");
    assert.ok(w44?.correction);
    const content = tag(itemFor(xml, w44.slug), "content:encoded");
    assert.ok(content.includes(`<strong>Correction:</strong> ${escapeXml(correctionBody(w44.correction))}`));
  });

  it("names the channel's image in a format RSS allows", async () => {
    const xml = await (await GET()).text();
    assert.match(tag(xml, "image"), /<url>[^<]+\.png<\/url>/);
    assert.ok(readFileSync(new URL("../public/icon-192.png", import.meta.url)).length > 0, "the file the feed names exists");
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

  /* The items' html had no test, so the 2026-10-28 rename of the margin label missed every
     frozen week: the feed kept printing "Margin:" beside each record date. */
  it("words each item's margin the way the page does", async () => {
    const xml = await (await GET()).text();
    for (const item of items(xml)) {
      assert.match(item, /<strong>Data as of:<\/strong> [^<]* · Room before a change: (plenty|some|little)<\/p>/);
      assert.doesNotMatch(item, /Margin:|Confidence:/);
    }
  });

  it("is announced from the root layout", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /rel="alternate" type="application\/rss\+xml"/);
  });
});
