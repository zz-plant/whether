import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPersonalizedMandate } from "../lib/personalizedMandates";
import type { RegimeAssessment } from "../lib/regimeEngine";

const assessment: RegimeAssessment = {
  regime: "VOLATILE",
  scores: { tightness: 65, riskAppetite: 44, baseRateUsed: "1M", baseRate: 4.8, curveSlope: -0.2 },
  diagnostics: { tightnessDelta: 0, riskAppetiteDelta: 0, nearestThresholdDelta: 0, confidence: "LOW", transitionWatch: false, intensity: "MILD" },
  description: "",
  constraints: [],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
};

describe("personalized mandates", () => {
  it("returns tailored actions for the selected profile", () => {
    const output = buildPersonalizedMandate(assessment, {
      stage: "growth",
      sector: "infrastructure",
      teamSize: "large",
    });

    assert.match(output.headline, /VOLATILE mandate/);
    assert.equal(output.tailoredActions.length, 3);
  });
});
