import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDecisionAnswerMetadata } from "../app/answers/[slug]/page";
import { isSeoPageIndexEligible } from "../lib/report/seoIndexEligibility";
import { indexableAnswerSlugs } from "../lib/seo/indexationPolicy";

describe("SEO index eligibility", () => {
  it("treats fresh complete payloads as index-eligible", () => {
    const eligibility = isSeoPageIndexEligible({
      currentCall: "Keep approvals selective and weekly-gated.",
      immediateAction: "Gate hiring to backfill and revenue-critical roles.",
      triggerThreshold: "Trigger tighter mode if tightness > 70.",
      reversalCondition: "Reverse after two easing reads.",
      evidenceCount: 3,
      fetchedAtIso: "2026-02-10T12:00:00.000Z",
      provenanceStatusLabel: "Live (high confidence)",
    }, new Date("2026-02-12T00:00:00.000Z"));

    assert.equal(eligibility.eligible, true);
  });

  it("applies noindex robots metadata when payload is stale", () => {
    const eligibility = isSeoPageIndexEligible({
      currentCall: "Hold.",
      immediateAction: "Reduce burn.",
      triggerThreshold: "Trigger tighter mode if tightness > 70.",
      reversalCondition: "Reverse after two easing reads.",
      evidenceCount: 1,
      fetchedAtIso: "2026-02-01T00:00:00.000Z",
      provenanceStatusLabel: "Cached (fallback)",
      isFallbackSnapshot: true,
    }, new Date("2026-02-12T00:00:00.000Z"));

    const metadata = buildDecisionAnswerMetadata({
      title: "Should we hire engineers right now?",
      slug: "should-we-hire-engineers-right-now",
      payload: {
        currentCall: "Hold.",
        immediateAction: "Reduce burn.",
        triggerThreshold: "Trigger tighter mode if tightness > 70.",
        reversalCondition: "Reverse after two easing reads.",
        evidence: [],
        freshness: "Unavailable",
        degraded: true,
        noindex: !eligibility.eligible,
        noindexReasons: eligibility.reasons,
        trustSummary: "Fallback",
        citationMeta: "Fallback",
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });

  it("applies noindex robots metadata to low-priority answer pages even when payload is fresh", () => {
    const nonPrioritySlug = "startup-market-outlook";
    assert.ok(!indexableAnswerSlugs.includes(nonPrioritySlug as (typeof indexableAnswerSlugs)[number]));

    const metadata = buildDecisionAnswerMetadata({
      title: "Startup Market Outlook",
      slug: nonPrioritySlug,
      payload: {
        currentCall: "Stay selective.",
        immediateAction: "Prioritize reversible moves.",
        triggerThreshold: "Tighten if conditions deteriorate.",
        reversalCondition: "Re-open after two improving reads.",
        evidence: [],
        freshness: "Fresh",
        degraded: false,
        noindex: false,
        noindexReasons: [],
        trustSummary: "Live",
        citationMeta: "Current week",
      },
    });

    assert.deepEqual(metadata.robots, { index: false, follow: true });
  });
});
