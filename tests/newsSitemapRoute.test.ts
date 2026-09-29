import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { GET } from "../app/news-sitemap.xml/route";
import robots from "../app/robots";
import { buildPublishedBriefPath, buildPublishedBriefTitle, getPublishedBriefs } from "../lib/report/publishedBriefs";
import { siteUrl } from "../lib/siteUrl";

const realNow = Date.now;
const setSystemTime = (at: Date) => {
  Date.now = () => at.getTime();
};
afterEach(() => {
  Date.now = realNow;
});

describe("news-sitemap.xml", () => {
  it("lists a week inside the two-day window with the page's own title", async () => {
    const [latest] = getPublishedBriefs();
    setSystemTime(new Date(new Date(latest.publishedAt).getTime() + 60 * 60 * 1000));
    const xml = await (await GET()).text();
    assert.match(xml, new RegExp(`<loc>${siteUrl}${buildPublishedBriefPath(latest.slug)}</loc>`));
    assert.ok(xml.includes(`<news:title>${buildPublishedBriefTitle(latest).replace(/&/g, "&amp;")}</news:title>`));
    assert.match(xml, /<news:name>Whether<\/news:name>/);
    assert.match(xml, /<news:publication_date>\d{4}-\d\d-\d\dT/);
  });

  it("is a valid empty urlset once the window has passed", async () => {
    const [latest] = getPublishedBriefs();
    setSystemTime(new Date(new Date(latest.publishedAt).getTime() + 3 * 24 * 60 * 60 * 1000));
    const xml = await (await GET()).text();
    assert.ok(!xml.includes("<url>"));
    assert.match(xml, /<urlset[^>]*sitemap-news/);
  });

  it("is submitted from robots.txt", () => {
    const { sitemap } = robots();
    assert.ok((Array.isArray(sitemap) ? sitemap : [sitemap]).includes(`${siteUrl}/news-sitemap.xml`));
  });
});
