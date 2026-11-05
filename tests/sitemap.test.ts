import { ROLES } from "../lib/report/companyRoles";
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import sitemap, { generateSitemaps } from "../app/sitemap";
import { findResourcePillarBySlug } from "../lib/resourcesContent";
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
    // A redirect into Decide and Guides since 2026-10-08, so not submitted.
    assert.ok(!urls.has(`${siteUrl}/resolve`));
    assert.ok(urls.has(`${siteUrl}/operate`));
    assert.ok(!urls.has(`${siteUrl}/toolkits`));
    assert.ok(!urls.has(`${siteUrl}/answers`));
    assert.ok(!urls.has(`${siteUrl}/posture`));
    assert.ok(urls.has(`${siteUrl}/resources`));
    assert.ok(urls.has(`${siteUrl}/operate/financial`));
    assert.ok(urls.has(`${siteUrl}/operate/scenarios`));
    assert.ok(!urls.has(`${siteUrl}/search`));
    assert.ok(!urls.has(`${siteUrl}/learn/failure-modes`));
    assert.ok(urls.has(`${siteUrl}/concepts`));

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

    // A page nothing dates makes no lastmod claim, rather than one constant
    // that predated most of the pages it was stamped on.
    const method = entries.find((entry) => entry.url === `${siteUrl}/trust`);
    assert.ok(method);
    assert.equal(method?.lastModified, undefined);

    // A resource carries the date its own copy last changed.
    const firstAuthorityResource = entries.find(
      (entry) => entry.url === `${siteUrl}/resources/capital-discipline-venture-backed-companies`,
    );
    const resourceDate = firstAuthorityResource?.lastModified;
    assert.ok(resourceDate instanceof Date);
    assert.equal(resourceDate.toISOString(), new Date(findResourcePillarBySlug("capital-discipline-venture-backed-companies")?.updatedAt ?? "").toISOString());
  });

  it("dates the weekly pages to the read, never to a fixed day", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
    const reportDate = byUrl.get(siteUrl)?.lastModified;
    assert.ok(reportDate instanceof Date);
    const operate = byUrl.get(`${siteUrl}/operate`)?.lastModified;
    assert.ok(operate instanceof Date);
    assert.equal(operate.toISOString(), reportDate.toISOString());
    const history = byUrl.get(`${siteUrl}/history`)?.lastModified;
    assert.ok(history instanceof Date, "/history is dated by its newest entry");
    assert.ok(history.getTime() > new Date("2026-02-01").getTime());
    for (const entry of entries) {
      if (entry.changeFrequency === "weekly") {
        assert.ok(entry.lastModified instanceof Date, `${entry.url} claims weekly changes with no date`);
      }
    }
  });

  it("keeps curated authority pages below the primary hubs", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const priorityByUrl = new Map(entries.map((entry) => [entry.url, entry.priority]));

    assert.ok(
      (priorityByUrl.get(`${siteUrl}/resources`) ?? 0) >
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

describe("segmented sitemaps", () => {
  it("splits the corpus into one child per content type", async () => {
    const segments = await generateSitemaps();
    assert.deepEqual(segments.map((segment) => segment.id), ["pages", "answers", "signals", "companies", "roles", "history", "briefs"]);
  });

  it("lists every pilot company and role while they can be stood behind, and none when the week can't be", async () => {
    const companies = await sitemap({ id: "companies", programmaticEligible: true });
    assert.ok(companies.every((entry) => entry.url.includes("/companies")));
    assert.ok(companies.some((entry) => entry.url.endsWith("/companies/microsoft/product-managers")));
    assert.ok(companies.some((entry) => entry.url.endsWith("/companies/rivian")));
    assert.deepEqual(await sitemap({ id: "companies", programmaticEligible: false }), []);
  });

  it("lists every role while the week can be stood behind, and keeps new families off company pages", async () => {
    const roles = await sitemap({ id: "roles", programmaticEligible: true });
    assert.equal(roles.length, ROLES.length + 1);
    assert.ok(roles.some((entry) => entry.url.endsWith("/roles/recruiters")));
    assert.deepEqual(await sitemap({ id: "roles", programmaticEligible: false }), []);
    const companies = await sitemap({ id: "companies", programmaticEligible: true });
    assert.ok(!companies.some((entry) => entry.url.endsWith("/recruiters")));
  });

  it("keeps history and briefs when the live answer segment is withheld", async () => {
    const answers = await sitemap({ id: "answers", programmaticEligible: false });
    assert.ok(
      answers.every((entry) => !entry.url.includes("/answers/")),
      "a stale live payload must drop the decision answers",
    );

    /* Closed records carry no freshness risk, so they survive a stale live read. */
    const history = await sitemap({ id: "history", programmaticEligible: false });
    assert.ok(history.length > 0);
    assert.ok(history.every((entry) => entry.url.includes("/history/")));

    const briefs = await sitemap({ id: "briefs", programmaticEligible: false });
    assert.ok(briefs.length > 0);
    assert.ok(briefs.every((entry) => entry.url.includes("/brief/")));
  });

  it("reads the id the framework hands over as a promise", async () => {
    const briefs = await sitemap({ id: Promise.resolve("briefs"), programmaticEligible: true });
    const all = await sitemap({ programmaticEligible: true });
    assert.ok(briefs.length > 0 && briefs.length < all.length);
    assert.ok(briefs.every((entry) => entry.url.includes("/brief/")));
  });

  it("puts each route in exactly one child", async () => {
    const seen = new Map<string, string>();
    for (const segment of ["pages", "answers", "signals", "companies", "roles", "history", "briefs"] as const) {
      for (const entry of await sitemap({ id: segment, programmaticEligible: true })) {
        assert.ok(!seen.has(entry.url), `${entry.url} appears in both ${seen.get(entry.url)} and ${segment}`);
        seen.set(entry.url, segment);
      }
    }
    const all = await sitemap({ programmaticEligible: true });
    assert.equal(seen.size, all.length);
  });
});
