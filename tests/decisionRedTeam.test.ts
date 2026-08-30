import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { compareDecisionPlans, stressTestDecisionPlan } from "../lib/decisionShield";
import type { RegimeAssessment } from "../lib/regimeEngine";

const createMockAssessment = (overrides: Partial<RegimeAssessment> = {}): RegimeAssessment =>
  ({
    regime: "DEFENSIVE",
    scores: {
      baseRate: 5.25,
      baseRateUsed: "FED",
      curveSlope: -0.30,
      tightness: 72,
      riskAppetite: 42,
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
    ...overrides,
  } as RegimeAssessment);

describe("decisionRedTeam", () => {
  it("detects hiring plans and returns bounded guardrails under defensive regime", () => {
    const result = stressTestDecisionPlan(createMockAssessment(), {
      planText: "We want to hire 4 senior engineers and expand our outbound sales team.",
    });

    assert.equal(result.detectedCategory, "HIRING");
    assert.equal(result.detectedAction, "HIRE");
    assert.ok(result.verdict === "RISKY" || result.verdict === "DANGEROUS");
    assert.ok(result.fragileAssumptions.length >= 2, "identifies high tightness and inverted curve");
    assert.ok(result.boundedGuardrail.length > 0);
    assert.ok(result.reversalTrigger.includes("Revisit once"));
    assert.ok(result.reversibleAlternative.includes("contract-to-hire"));
  });

  it("detects infrastructure and cloud commitments and returns cash-preservation alternatives", () => {
    const result = stressTestDecisionPlan(createMockAssessment(), {
      planText: "We want to sign a 3-year upfront GPU cluster lease with AWS.",
    });

    assert.equal(result.detectedCategory, "INFRASTRUCTURE");
    assert.equal(result.detectedAction, "INFRA_SPEND");
    assert.ok(result.reversibleAlternative.includes("convertible") || result.reversibleAlternative.includes("rolling"));
  });

  it("evaluates plans more favorably under expansion conditions", () => {
    const result = stressTestDecisionPlan(
      createMockAssessment({
        regime: "EXPANSION",
        scores: {
          baseRate: 3.25,
          baseRateUsed: "FED",
          curveSlope: 0.85,
          tightness: 35,
          riskAppetite: 75,
        },
      }),
      {
        planText: "We want to hire 3 engineers for product acceleration.",
      }
    );

    assert.equal(result.detectedCategory, "HIRING");
    assert.equal(result.verdict, "SAFE");
  });

  it("escalates verdict to DANGEROUS when runway is under 12 months in defensive regime", () => {
    const result = stressTestDecisionPlan(createMockAssessment(), {
      planText: "We want to hire 4 engineers.",
      companyProfile: {
        runwayMonths: 8,
        businessModel: "VC_BACKED",
      },
    });

    assert.equal(result.verdict, "DANGEROUS");
    assert.ok(result.fragileAssumptions.some((a) => a.includes("Critical runway constraint")));
    assert.ok(result.financialImpactSummary?.includes("below the 15-month safe threshold"));
  });

  it("compares Plan A vs Plan B side-by-side and recommends the safer option", () => {
    const comparison = compareDecisionPlans(
      createMockAssessment(),
      "We want to hire 2 engineers on 6-month contract-to-hire with 100% revenue milestones.",
      "We want to sign a 3-year upfront GPU cluster lease with AWS for $250k upfront."
    );

    assert.ok(comparison.planA);
    assert.ok(comparison.planB);
    assert.equal(comparison.preferredPlan, "A");
    assert.ok(comparison.comparativeRecommendation.includes("Plan A"));
  });
});
