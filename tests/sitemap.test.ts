import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sitemap from "../app/sitemap";
import { snapshotData } from "../lib/snapshot";
import { siteUrl } from "../lib/siteUrl";
import { roleLandings } from "../app/solutions/career-paths/roleLandingData";
import { stageGuides } from "../app/guides/stageGuides";
import { stakeholderGuides } from "../app/guides/stakeholderGuides";
import { productConceptArticles } from "../lib/productCanon";

describe("sitemap", () => {
  it("returns only canonical URLs and includes dynamic guide routes", () => {
    const entries = sitemap();

    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.url.startsWith(siteUrl)));

    const urls = new Set(entries.map((entry) => entry.url));

    assert.equal(urls.size, entries.length);
    assert.ok(urls.has(`${siteUrl}/guides`));
    assert.ok(urls.has(`${siteUrl}/guides/stage`));

    for (const guide of stakeholderGuides) {
      assert.ok(urls.has(`${siteUrl}/guides/${guide.slug}`));
    }

    for (const guide of stageGuides) {
      assert.ok(urls.has(`${siteUrl}/guides/stage/${guide.slug}`));
    }

    for (const role of roleLandings) {
      assert.ok(urls.has(`${siteUrl}/solutions/career-paths/${role.slug}`));
    }

    assert.ok(urls.has(`${siteUrl}/concepts`));

    for (const article of productConceptArticles) {
      assert.ok(urls.has(`${siteUrl}/concepts/${article.slug}`));
    }
  });

  it("uses valid last modified dates for both report and static pages", () => {
    const entries = sitemap();

    const root = entries.find((entry) => entry.url === siteUrl);
    assert.ok(root?.lastModified instanceof Date);
    assert.equal(root?.lastModified?.toISOString(), new Date(snapshotData.record_date).toISOString());

    const methodology = entries.find((entry) => entry.url === `${siteUrl}/methodology`);
    assert.ok(methodology?.lastModified instanceof Date);
    assert.equal(
      methodology?.lastModified?.toISOString(),
      new Date(snapshotData.fetched_at).toISOString(),
    );
  });
});
