import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSeoDecisionPayload, type SeoDecisionPayload } from "../lib/report/seoDecisionPayload";

const baseInput = {
  assessment: {
    regime: "EXPANSION" as const,
    thresholds: {
      riskAppetiteRegime: 50,
      tightnessRegime: 70,
      baseRateTightness: 5,
    },
    scores: {
      riskAppetite: 60,
      tightness: 55,
      baseRate: 4,
      baseRateUsed: "1M" as const,
      curveSlope: 1,
    },
  },
  mappedRules: [
    {
      area: "capital-raising" as const,
      recommendation: "Raise proactively from leverage while window quality is favorable.",
      doNow: ["Run financing decisions with term quality gates while the window is open."],
      avoidNow: [],
      scope: "Fundraising",
      pauseTrigger: "Pause acceleration if risk appetite falls below 44 or funding pressure tightens above 76.",
      resumeTrigger: "Resume full process when risk appetite > 54 and funding pressure < 66.",
      flipConditions: [{ metric: "riskAppetite" as const, operator: ">" as const, value: 54, label: "Risk appetite > 54" }],
      rationale: "Preserve optionality",
    },
  ],
  mappedDecisionAreas: ["capital-raising" as const],
  fallbackCurrentCall: "Fallback current call",
  fallbackImmediateAction: "Fallback immediate action",
  reportEvidenceItems: [
    {
      key: "riskAppetite" as const,
      title: "Risk appetite is improving",
      supportingBullets: [],
      confidenceLabel: "HIGH",
      directionLabel: "Easing" as const,
      immediateImplication: "Raise planning can remain active while terms stay disciplined.",
    },
  ],
  freshnessLabel: "2026-01-01 10:00 UTC",
  recordDateLabel: "Jan 01, 2026",
  confidenceLabel: "HIGH" as const,
  transitionWatch: "OFF" as const,
  isFallbackSnapshot: false,
  provenanceStatusLabel: "Live (high confidence)",
  fetchedAtIso: new Date().toISOString(),
  provenanceLinks: ["https://fred.stlouisfed.org/series/DGS10"],
};

describe("seo decision payload", () => {
  it("returns all required decision transmission fields", () => {
    const payload = buildSeoDecisionPayload(baseInput);

    const requiredFields: Array<keyof SeoDecisionPayload> = [
      "currentCall",
      "immediateAction",
      "triggerThreshold",
      "reversalCondition",
      "evidence",
      "freshness",
    ];

    for (const field of requiredFields) {
      assert.ok(payload[field], `${field} should be present`);
    }

    assert.equal(payload.noindex, false);
    assert.equal(payload.degraded, false);
  });

  it("marks stale/fallback payloads as degraded and noindex", () => {
    const payload = buildSeoDecisionPayload({
      ...baseInput,
      freshnessLabel: "Unavailable",
      isFallbackSnapshot: true,
      provenanceStatusLabel: "Cached (medium)",
      fetchedAtIso: "2025-12-20T10:00:00.000Z",
    });

    assert.equal(payload.degraded, true);
    assert.equal(payload.noindex, true);
  });
});
