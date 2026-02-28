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
} from "../lib/informationArchitecture";
import { productConceptArticles } from "../lib/productCanon";

describe("sitemap", () => {
  it("returns canonical URLs and includes posture, decide, learn, toolkit, and library routes", () => {
    const entries = sitemap();

    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.url.startsWith(siteUrl)));

    const urls = new Set(entries.map((entry) => entry.url));

    assert.equal(urls.size, entries.length);
    assert.ok(urls.has(siteUrl));
    assert.ok(urls.has(`${siteUrl}/start`));
    assert.ok(urls.has(`${siteUrl}/posture`));
    assert.ok(urls.has(`${siteUrl}/decide/use-cases`));
    assert.ok(urls.has(`${siteUrl}/guides`));
    assert.ok(urls.has(`${siteUrl}/solutions`));
    assert.ok(urls.has(`${siteUrl}/learn/failure-modes`));
    assert.ok(urls.has(`${siteUrl}/learn/concepts`));
    assert.ok(urls.has(`${siteUrl}/toolkits`));
    assert.ok(urls.has(`${siteUrl}/library`));

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
      assert.ok(urls.has(`${siteUrl}/library/failure-modes/${mode}`));
    }

    for (const article of productConceptArticles) {
      assert.ok(urls.has(`${siteUrl}/learn/concepts/${article.slug}`));
      assert.ok(urls.has(`${siteUrl}/concepts/${article.slug}`));
    }
  });

  it("uses valid last modified dates for root, static pages, and canon article pages", () => {
    const entries = sitemap();

    const root = entries.find((entry) => entry.url === siteUrl);
    assert.ok(root?.lastModified instanceof Date);
    assert.equal(root?.lastModified?.toISOString(), new Date(snapshotData.record_date).toISOString());

    const start = entries.find((entry) => entry.url === `${siteUrl}/start`);
    assert.ok(start?.lastModified instanceof Date);
    assert.equal(start?.lastModified?.toISOString(), new Date("2026-02-01T00:00:00.000Z").toISOString());

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
});
