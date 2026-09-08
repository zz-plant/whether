import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import sitemap from "../app/sitemap";
import { snapshotData } from "../lib/snapshot";
import { siteUrl } from "../lib/siteUrl";
import { resourceArticles } from "../lib/resourceArticles";
import { resourcePillarPages } from "../lib/resourcesContent";
import { retiredSitemapPaths } from "../app/sitemapExclusions";
import {
  indexableAnswerSlugs,
  indexableResourceArticleSlugs,
  indexableResourcePillarSlugs,
} from "../lib/seo/indexationPolicy";
import { buildPostureArchivePath, getPostureArchivePeriods } from "../lib/summary/postureArchive";
import { buildPublishedBriefPath, getPublishedBriefs } from "../lib/report/publishedBriefs";

describe("sitemap", () => {
  it("returns canonical URLs and includes only the curated indexable routes", async () => {
    const entries = await sitemap({ programmaticEligible: true });

    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.url.startsWith(siteUrl)));

    const urls = new Set(entries.map((entry) => entry.url));

    assert.equal(urls.size, entries.length);
    assert.ok(urls.has(siteUrl));
    assert.ok(urls.has(`${siteUrl}/resolve`));
    assert.ok(urls.has(`${siteUrl}/operate`));
    assert.ok(!urls.has(`${siteUrl}/toolkits`));
    assert.ok(!urls.has(`${siteUrl}/answers`));
    assert.ok(!urls.has(`${siteUrl}/posture`));
    assert.ok(!urls.has(`${siteUrl}/resources`));
    assert.ok(!urls.has(`${siteUrl}/search`));
    assert.ok(!urls.has(`${siteUrl}/learn/failure-modes`));
    assert.ok(!urls.has(`${siteUrl}/concepts`));

    for (const retiredPath of retiredSitemapPaths) {
      assert.ok(!urls.has(`${siteUrl}${retiredPath}`));
    }

    for (const slug of indexableAnswerSlugs) {
      assert.ok(urls.has(`${siteUrl}/answers/${slug}`));
    }

    for (const page of resourcePillarPages) {
      const shouldIndex = indexableResourcePillarSlugs.includes(
        page.slug as (typeof indexableResourcePillarSlugs)[number],
      );
      assert.equal(urls.has(`${siteUrl}/resources/${page.slug}`), shouldIndex);
    }

    for (const article of resourceArticles) {
      const shouldIndex = indexableResourceArticleSlugs.includes(
        article.slug as (typeof indexableResourceArticleSlugs)[number],
      );
      assert.equal(urls.has(`${siteUrl}/resources/${article.slug}`), shouldIndex);
    }

    assert.ok(!urls.has(`${siteUrl}/library/failure-modes`));

    assert.ok(!urls.has(`${siteUrl}/guides/stage`));
    assert.ok(!urls.has(`${siteUrl}/concepts/conflicts`));
  });

  it("uses valid last modified dates for root and curated static pages", async () => {
    const entries = await sitemap({ programmaticEligible: true });

    const root = entries.find((entry) => entry.url === siteUrl);
    assert.ok(root?.lastModified instanceof Date);
    assert.equal(root?.lastModified?.toISOString(), new Date(snapshotData.record_date).toISOString());

    const method = entries.find((entry) => entry.url === `${siteUrl}/trust`);
    assert.ok(method?.lastModified instanceof Date);
    assert.equal(method?.lastModified?.toISOString(), new Date("2026-02-01T00:00:00.000Z").toISOString());

    const firstAuthorityResource = entries.find(
      (entry) => entry.url === `${siteUrl}/resources/capital-discipline-venture-backed-companies`,
    );
    assert.ok(firstAuthorityResource?.lastModified instanceof Date);
    assert.equal(
      firstAuthorityResource?.lastModified?.toISOString(),
      new Date("2026-02-01T00:00:00.000Z").toISOString(),
    );
  });

  it("keeps curated authority pages below the primary hubs", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const priorityByUrl = new Map(entries.map((entry) => [entry.url, entry.priority]));

    assert.ok(
      (priorityByUrl.get(`${siteUrl}/resolve`) ?? 0) >
        (priorityByUrl.get(`${siteUrl}/answers/${indexableAnswerSlugs[0]}`) ?? 1),
    );
    assert.ok(
      (priorityByUrl.get(`${siteUrl}/operate`) ?? 0) >
        (priorityByUrl.get(`${siteUrl}/resources/capital-discipline-venture-backed-companies`) ?? 1),
    );
  });

  it("omits programmatic answer/regime URLs when eligibility fails", async () => {
    const entries = await sitemap({ programmaticEligible: false });
    const urls = new Set(entries.map((entry) => entry.url));

    assert.ok(!urls.has(`${siteUrl}/answers/should-we-hire-engineers-right-now`));
    assert.ok(!urls.has(`${siteUrl}/signals/capital-tightness-watch/hiring`));
    assert.ok(!urls.has(`${siteUrl}/should-we-hire-engineers-right-now`));
    assert.ok(!urls.has(`${siteUrl}/startup-macro-posture/scarcity`));
  });

  it("keeps closed archive periods indexed regardless of live-payload eligibility", async () => {
    const periods = getPostureArchivePeriods();
    assert.ok(periods.length > 0);

    for (const eligible of [true, false]) {
      const entries = await sitemap({ programmaticEligible: eligible });
      const urls = new Set(entries.map((entry) => entry.url));

      for (const period of periods) {
        assert.ok(
          urls.has(`${siteUrl}${buildPostureArchivePath(period.slug)}`),
          `archive period ${period.slug} missing when programmaticEligible=${eligible}`,
        );
      }
    }
  });

  it("indexes published weeks and the publisher identity pages Discover requires", async () => {
    const briefs = getPublishedBriefs();
    assert.ok(briefs.length > 0);

    for (const eligible of [true, false]) {
      const entries = await sitemap({ programmaticEligible: eligible });
      const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

      assert.ok(entryByUrl.has(`${siteUrl}/about`));
      assert.ok(entryByUrl.has(`${siteUrl}/contact`));

      for (const brief of briefs) {
        const entry = entryByUrl.get(`${siteUrl}${buildPublishedBriefPath(brief.slug)}`);
        assert.ok(entry, `published week ${brief.slug} missing when programmaticEligible=${eligible}`);
        assert.ok(entry?.lastModified instanceof Date, `published week ${brief.slug} carries no lastModified date`);
        assert.equal(entry.lastModified.toISOString(), new Date(brief.publishedAt).toISOString());
      }
    }
  });

  it("dates archive periods to the period they close and ranks years above quarters", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));

    for (const period of getPostureArchivePeriods()) {
      const entry = entryByUrl.get(`${siteUrl}${buildPostureArchivePath(period.slug)}`);
      assert.ok(entry?.lastModified instanceof Date);
      assert.equal(entry?.lastModified?.toISOString(), new Date(period.asOf).toISOString());
    }

    const year = entryByUrl.get(`${siteUrl}/history/2022`);
    const quarter = entryByUrl.get(`${siteUrl}/history/2022-q2`);
    assert.ok((year?.priority ?? 0) > (quarter?.priority ?? 1));
  });
});
