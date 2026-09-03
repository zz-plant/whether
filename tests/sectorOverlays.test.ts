import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { applySectorOverlay } from "../lib/sectorOverlays";
import type { RegimeAssessment } from "../lib/regimeEngine";

const mockAssessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: {
    baseRate: 5.25,
    baseRateUsed: "FED",
    curveSlope: -0.30,
    tightness: 70,
    riskAppetite: 40,
  },
  thresholds: {
    baseRateTightness: 4.0,
    tightnessRegime: 60,
    riskAppetiteRegime: 50,
  },
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 10,
    confidence: "HIGH",
    transitionWatch: false,
    intensity: "STANDARD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "Defensive conditions",
  constraints: [],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  inputs: [],
  policyAssessment: {} as any,
};

describe("sectorOverlays", () => {
  it("adjusts tightness and risk appetite for AI compute sector", () => {
    const result = applySectorOverlay(mockAssessment, "ai_compute");

    assert.equal(result.sector.id, "ai_compute");
    assert.equal(result.effectiveTightness, 78); // 70 + 8
    assert.equal(result.effectiveRiskAppetite, 35); // 40 - 5
    assert.equal(result.adjustedRegime, "SCARCITY"); // triggered threshold breach
    assert.ok(result.sectorSpecificDirective.includes("GPU cluster depreciation"));
  });

  it("applies biotech overlay with high capital sensitivity", () => {
    const result = applySectorOverlay(mockAssessment, "biotech");

    assert.equal(result.sector.id, "biotech");
    assert.equal(result.effectiveTightness, 82); // 70 + 12
    assert.ok(result.sectorSpecificDirective.includes("24+ months"));
  });
});
