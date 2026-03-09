import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPersonalizedMandate, normalizeCompanyProfile } from "../lib/personalizedMandates";
import type { RegimeAssessment } from "../lib/regimeEngine";

const assessment: RegimeAssessment = {
  regime: "VOLATILE",
  scores: { tightness: 65, riskAppetite: 44, baseRateUsed: "1M", baseRate: 4.8, curveSlope: -0.2 },
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 0,
    confidence: "LOW",
    transitionWatch: false,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "Risk remains uneven across financing and demand channels.",
  constraints: [],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "policy-v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "TRANSITION",
    band: "NEUTRAL",
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "HIGH",
      paybackWindowTolerance: "STANDARD",
      rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
      approvalVelocity: "BALANCED",
      expansionScope: "BALANCED",
      experimentationTolerance: "MEDIUM",
    },
  },
};

describe("personalized mandates", () => {
  it("returns tailored actions for the selected profile", () => {
    const output = buildPersonalizedMandate(assessment, {
      stage: "growth",
      sector: "infrastructure",
      teamSize: "large",
      revenueBand: "$10m-$50m",
      cashRunway: "12-18m",
      growthRate: "10-30%",
      businessModel: "usage-based",
    });

    assert.match(output.headline, /VOLATILE mandate/);
    assert.equal(output.tailoredActions.length, 4);
    assert.match(output.sectorOverlay.adjustedPostureLabel, /Mixed-|Mixed|Mixed\+/);
    assert.match(output.recommendation, /Sector overlay:/);
    assert.match(output.output.Instruction, /Runway constraint:/);
    assert.equal(output.output.Confidence, "LOW");
    assert.ok(output.profileInterpretation.rules.posture_rules.length >= 4);
  });

  it("keeps base posture output available even with incomplete inputs", () => {
    const output = buildPersonalizedMandate(assessment, {
      stage: "seed",
      sector: "consumer",
    });

    assert.equal(output.profileInterpretation.profileCompleteness, "partial");
    assert.ok(output.profileInterpretation.fallbackFields.includes("cashRunway"));
    assert.ok(output.output.Posture.length > 0);
    assert.ok(output.output.Instruction.length > 0);
  });

  it("produces materially different advice for same posture with different profiles", () => {
    const seed = buildPersonalizedMandate(assessment, {
      stage: "seed",
      sector: "b2b-saas",
      cashRunway: "<6m",
      businessModel: "product-led",
      growthRate: "declining",
      teamSize: "small",
      revenueBand: "pre-revenue",
    });

    const publicCompany = buildPersonalizedMandate(assessment, {
      stage: "public",
      sector: "b2b-saas",
      cashRunway: "18m+",
      businessModel: "sales-led",
      growthRate: "30%+",
      teamSize: "large",
      revenueBand: "$50m+",
    });

    assert.equal(seed.output.Posture, publicCompany.output.Posture);
    assert.notEqual(seed.output.Instruction, publicCompany.output.Instruction);
    assert.notEqual(seed.tailoredActions[0], publicCompany.tailoredActions[0]);
    assert.notEqual(seed.profileInterpretation.rules.runway_constraint, publicCompany.profileInterpretation.rules.runway_constraint);
  });

  it("normalizes invalid values to safe defaults", () => {
    const normalized = normalizeCompanyProfile({
      stage: "invalid",
      revenueBand: "weird",
    });

    assert.equal(normalized.profile.stage, "growth");
    assert.equal(normalized.profile.revenueBand, "$1m-$10m");
  });
});
