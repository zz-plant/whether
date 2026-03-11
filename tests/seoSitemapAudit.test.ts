import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { siteUrl } from "../lib/siteUrl";
import { buildSeoSitemapAudit, resolveSitemapFamily } from "../lib/seoSitemapAudit";

describe("seo sitemap audit", () => {
  it("classifies url paths into expected families", () => {
    assert.equal(resolveSitemapFamily("/answers/should-we-hire"), "/answers/");
    assert.equal(resolveSitemapFamily("/resources/capital-posture-template"), "/resources/");
    assert.equal(resolveSitemapFamily("/not-a-family"), "other");
  });

  it("builds family counts and thin-risk flags from sitemap snapshots", () => {
    const indexable = [
      { url: `${siteUrl}/answers/should-we-hire` },
      { url: `${siteUrl}/decide/founder/hiring` },
      { url: `${siteUrl}/resources/capital-posture-template` },
    ];

    const nonIndexable = [
      { url: `${siteUrl}/answers/should-we-hire` },
      { url: `${siteUrl}/resources/capital-posture-template` },
    ];

    const report = buildSeoSitemapAudit(indexable, nonIndexable, new Date("2026-03-11T00:00:00.000Z"));

    assert.equal(report.totalUrls, 3);
    assert.equal(report.generatedAtIso, "2026-03-11T00:00:00.000Z");

    const answers = report.families.find((family) => family.family === "/answers/");
    assert.equal(answers?.totalUrls, 1);
    assert.equal(answers?.thinRiskUrls, 1);

    const decide = report.families.find((family) => family.family === "/decide/");
    assert.equal(decide?.decisionContractRequired, true);

    const resources = report.families.find((family) => family.family === "/resources/");
    assert.equal(resources?.decisionContractRequired, false);
    assert.equal(resources?.thinRiskUrls, 0);
  });
});
