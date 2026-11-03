import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET } from "../app/sitemap.xml/route";
import { SITEMAP_SEGMENTS } from "../app/sitemap";
import { siteUrl } from "../lib/siteUrl";

/**
 * `generateSitemaps` renders the child sitemaps but vinext serves no index for
 * them. Robots and search engines expect `/sitemap.xml`, so this pins the index
 * that lists every child.
 */
describe("sitemap index", () => {
  it("lists one child per segment", async () => {
    const response = await GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/xml/);

    const body = await response.text();
    assert.match(body, /<sitemapindex/);
    for (const segment of SITEMAP_SEGMENTS) {
      assert.ok(body.includes(`${siteUrl}/sitemap/${segment}.xml`), `missing child: ${segment}`);
    }
  });
});
