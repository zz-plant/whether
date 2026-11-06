import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { compareDecisionPlans, stressTestDecisionPlan as runStressTest, type GradedPlan } from "../lib/decisionShield";
import { buildLateCycleAssessmentFixture } from "./fixtures/reportFixtures";

const stressTestDecisionPlan = (...args: Parameters<typeof runStressTest>): GradedPlan => {
  const plan = runStressTest(...args);
  if (plan.verdict === null) throw new Error(`Expected a verdict: ${plan.headline}`);
  return plan;
};

describe("decisionRedTeam", () => {
  it("detects hiring plans and returns bounded guardrails under defensive regime", () => {
    const result = stressTestDecisionPlan(buildLateCycleAssessmentFixture(), {
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
    const result = stressTestDecisionPlan(buildLateCycleAssessmentFixture(), {
      planText: "We want to sign a 3-year upfront GPU cluster lease with AWS.",
    });

    assert.equal(result.detectedCategory, "INFRASTRUCTURE");
    assert.equal(result.detectedAction, "INFRA_SPEND");
    assert.ok(result.reversibleAlternative.includes("convertible") || result.reversibleAlternative.includes("rolling"));
  });

  it("evaluates plans more favorably under expansion conditions", () => {
    const result = stressTestDecisionPlan(
      buildLateCycleAssessmentFixture({
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
    const result = stressTestDecisionPlan(buildLateCycleAssessmentFixture(), {
      planText: "We want to hire 4 engineers.",
      companyProfile: {
        runwayMonths: 8,
        businessModel: "VC_BACKED",
      },
    });

    assert.equal(result.verdict, "DANGEROUS");
    assert.ok(result.fragileAssumptions.some((a) => a.includes("under 12 months of cash")));
    // The summary now quotes the month count the check actually uses. This line
    // asserted "15-month" while the rule was `< 12` and this test's own title
    // said 12 — the prose was pinned to a threshold that never existed.
    assert.ok(result.financialImpactSummary?.includes("under the 12-month line"));
  });

  it("compares Plan A vs Plan B side-by-side and recommends the safer option", () => {
    const comparison = compareDecisionPlans(
      buildLateCycleAssessmentFixture(),
      "We want to hire 2 engineers on 6-month contract-to-hire with 100% revenue milestones.",
      "We want to sign a 3-year upfront GPU cluster lease with AWS for $250k upfront."
    );

    assert.ok(comparison.planA);
    assert.ok(comparison.planB);
    assert.equal(comparison.preferredPlan, "A");
    assert.ok(comparison.comparativeRecommendation.includes("Plan A"));
  });
});
