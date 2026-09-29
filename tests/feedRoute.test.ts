import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { GET } from "../app/feed.xml/route";
import { buildPublishedBriefPath, getPublishedBriefs } from "../lib/report/publishedBriefs";
import { siteUrl } from "../lib/siteUrl";

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

  it("is announced from the root layout", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /rel="alternate" type="application\/rss\+xml"/);
  });
});
