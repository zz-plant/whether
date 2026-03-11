import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateSeoQualityGates } from "../lib/report/seoQualityGates";

describe("seo quality gates", () => {
  it("passes when decision, freshness, uniqueness, thin-page, and trust gates pass", () => {
    const result = evaluateSeoQualityGates({
      pageKey: "/decide/ceo/capital-raising",
      currentCall: "Run financing decisions with strict term gates.",
      immediateAction: "Prioritize extension runway and diligence prep.",
      triggerThreshold: "Trigger tighter mode if tightness > 70.",
      reversalCondition: "Reverse after two easing reads.",
      evidenceCount: 3,
      evidenceTitles: ["Yield curve inversion", "Venture pace", "Treasury volatility"],
      fetchedAtIso: "2026-02-10T12:00:00.000Z",
      provenanceStatusLabel: "Live (high confidence)",
      provenanceLinks: ["https://fred.stlouisfed.org/series/DGS10"],
      confidenceLabel: "HIGH",
      fallbackLabel: "live",
      trustSummary: "High confidence • fresh signals",
      citationMeta: "Cite: 2026-02-10 UTC",
      interpretationLabel: "capital strategy",
      siblingsInCluster: [
        {
          pageKey: "/decide/board/capital-raising",
          interpretationLabel: "board oversight",
          evidenceTitles: ["Treasury volatility"],
        },
      ],
    }, new Date("2026-02-12T00:00:00.000Z"));

    assert.equal(result.eligible, true);
    assert.equal(result.noindex, false);
    assert.deepEqual(result.reasons, []);
  });

  it("fails uniqueness when sibling pages share the same data points and interpretation", () => {
    const result = evaluateSeoQualityGates({
      pageKey: "/signals/capital-tightness-watch/hiring",
      currentCall: "Hold hiring pace.",
      immediateAction: "Backfill only critical roles.",
      triggerThreshold: "Trigger tighter mode if tightness > 70.",
      reversalCondition: "Reverse after two easing reads.",
      evidenceCount: 2,
      evidenceTitles: ["Treasury volatility", "Credit spreads"],
      fetchedAtIso: "2026-02-10T12:00:00.000Z",
      provenanceStatusLabel: "Live (high confidence)",
      provenanceLinks: ["https://fred.stlouisfed.org/series/DGS10"],
      confidenceLabel: "MED",
      fallbackLabel: "live",
      trustSummary: "Medium confidence",
      citationMeta: "Cite: 2026-02-10 UTC",
      interpretationLabel: "same-view",
      siblingsInCluster: [
        {
          pageKey: "/signals/capital-tightness-watch/product-tempo",
          interpretationLabel: "same-view",
          evidenceTitles: ["Treasury volatility", "Credit spreads"],
        },
      ],
    }, new Date("2026-02-12T00:00:00.000Z"));

    assert.equal(result.eligible, false);
    assert.equal(result.noindex, true);
    assert.ok(result.reasons.includes("cluster-duplicate-no-distinct-datapoint-or-interpretation"));
    assert.equal(result.gates.uniqueness.passed, false);
  });

  it("fails thin-page and trust gates for incomplete sections and missing trust labels", () => {
    const result = evaluateSeoQualityGates({
      pageKey: "/answers/should-we-hire-engineers-right-now",
      currentCall: "Hold.",
      immediateAction: "Reduce burn.",
      triggerThreshold: "",
      reversalCondition: "",
      evidenceCount: 1,
      evidenceTitles: ["Treasury volatility"],
      fetchedAtIso: "2026-02-10T12:00:00.000Z",
      provenanceStatusLabel: "Cached (fallback)",
      provenanceLinks: [],
      confidenceLabel: "",
      fallbackLabel: "",
      trustSummary: "",
      citationMeta: "",
    }, new Date("2026-02-12T00:00:00.000Z"));

    assert.equal(result.eligible, false);
    assert.ok(result.reasons.includes("section-incomplete"));
    assert.ok(result.reasons.includes("decision-value-below-minimum"));
    assert.ok(result.reasons.includes("provenance-links-missing"));
    assert.ok(result.reasons.includes("confidence-label-missing"));
    assert.ok(result.reasons.includes("fallback-label-missing"));
    assert.equal(result.gates["thin-page"].passed, false);
    assert.equal(result.gates.trust.passed, false);
  });
});
