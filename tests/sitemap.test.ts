import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sitemap from "../app/sitemap";
import { snapshotData } from "../lib/snapshot";
import { siteUrl } from "../lib/siteUrl";
import {
  failureModes,
  postureDefinitions,
  situationUseCases,
  toolkitDefinitions,
  useCaseRoles,
} from "../lib/decisionDomainCatalog";
import {
  conceptAudiences,
  conceptFocuses,
  productConceptArticles,
  toConceptTaxonomySlug,
} from "../lib/productCanon";
import { stageGuides } from "../app/guides/stageGuides";
import { stakeholderGuides } from "../app/guides/stakeholderGuides";
import { roleLandings } from "../app/solutions/career-paths/roleLandingData";
import { retiredSitemapPaths } from "../app/sitemapExclusions";

describe("sitemap", () => {
  it("returns canonical URLs and includes posture, decide, learn, and toolkit routes", async () => {
    const entries = await sitemap({ programmaticEligible: true });

    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.url.startsWith(siteUrl)));

    const urls = new Set(entries.map((entry) => entry.url));

    assert.equal(urls.size, entries.length);
    assert.ok(urls.has(siteUrl));
    assert.ok(urls.has(`${siteUrl}/posture`));
    assert.ok(urls.has(`${siteUrl}/decide`));
    assert.ok(urls.has(`${siteUrl}/toolkits`));
    assert.ok(urls.has(`${siteUrl}/operations`));

    for (const retiredPath of retiredSitemapPaths) {
      assert.ok(!urls.has(`${siteUrl}${retiredPath}`));
    }

    for (const posture of postureDefinitions) {
      assert.ok(urls.has(`${siteUrl}/posture/${posture.slug}`));
    }

    for (const role of useCaseRoles) {
      assert.ok(urls.has(`${siteUrl}/decide/${role.slug}`));
    }

    for (const situation of situationUseCases) {
      assert.ok(urls.has(`${siteUrl}/decide/${situation}`));
    }

    for (const toolkit of toolkitDefinitions) {
      assert.ok(urls.has(`${siteUrl}/toolkits/${toolkit.slug}`));
    }

    for (const mode of failureModes) {
      assert.ok(urls.has(`${siteUrl}/learn/failure-modes/${mode}`));
    }

    assert.ok(!urls.has(`${siteUrl}/library/failure-modes`));

    for (const article of productConceptArticles) {
      assert.ok(urls.has(`${siteUrl}/concepts/${article.slug}`));
    }


    for (const stageGuide of stageGuides) {
      assert.ok(urls.has(`${siteUrl}/guides/stage/${stageGuide.slug}`));
    }

    for (const stakeholderGuide of stakeholderGuides) {
      assert.ok(urls.has(`${siteUrl}/guides/${stakeholderGuide.slug}`));
    }

    for (const roleLanding of roleLandings) {
      assert.ok(urls.has(`${siteUrl}/solutions/career-paths/${roleLanding.slug}`));
    }

    for (const focus of conceptFocuses) {
      assert.ok(urls.has(`${siteUrl}/concepts/focus/${toConceptTaxonomySlug(focus)}`));
    }

    for (const audience of conceptAudiences) {
      assert.ok(urls.has(`${siteUrl}/concepts/audience/${toConceptTaxonomySlug(audience)}`));
    }
  });

  it("uses valid last modified dates for root, static pages, and canon article pages", async () => {
    const entries = await sitemap({ programmaticEligible: true });

    const root = entries.find((entry) => entry.url === siteUrl);
    assert.ok(root?.lastModified instanceof Date);
    assert.equal(root?.lastModified?.toISOString(), new Date(snapshotData.record_date).toISOString());

    const posture = entries.find((entry) => entry.url === `${siteUrl}/posture`);
    assert.ok(posture?.lastModified instanceof Date);
    assert.equal(posture?.lastModified?.toISOString(), new Date("2026-02-01T00:00:00.000Z").toISOString());

    const firstConceptArticle = productConceptArticles[0];
    const firstConceptEntry = entries.find(
      (entry) => entry.url === `${siteUrl}/concepts/${firstConceptArticle.slug}`,
    );
    assert.ok(firstConceptEntry?.lastModified instanceof Date);
    assert.equal(
      firstConceptEntry?.lastModified?.toISOString(),
      new Date(
        Date.UTC(firstConceptArticle.publishedYear, firstConceptArticle.publishedMonth - 1, 1),
      ).toISOString(),
    );
  });

  it("keeps supporting and secondary surfaces below their primary parent priorities", async () => {
    const entries = await sitemap({ programmaticEligible: true });
    const priorityByUrl = new Map(entries.map((entry) => [entry.url, entry.priority]));

    assert.ok((priorityByUrl.get(`${siteUrl}/decide`) ?? 0) > (priorityByUrl.get(`${siteUrl}/toolkits`) ?? 1));
    assert.ok((priorityByUrl.get(`${siteUrl}/method`) ?? 0) > (priorityByUrl.get(`${siteUrl}/learn/failure-modes`) ?? 1));
    assert.ok((priorityByUrl.get(`${siteUrl}/method`) ?? 0) > (priorityByUrl.get(`${siteUrl}/concepts`) ?? 1));
  });

  it("omits programmatic answer/regime URLs when eligibility fails", async () => {
    const entries = await sitemap({ programmaticEligible: false });
    const urls = new Set(entries.map((entry) => entry.url));

    assert.ok(!urls.has(`${siteUrl}/answers/should-we-hire-engineers-right-now`));
    assert.ok(!urls.has(`${siteUrl}/should-we-hire-engineers-right-now`));
    assert.ok(!urls.has(`${siteUrl}/startup-macro-posture/scarcity`));
  });
});
