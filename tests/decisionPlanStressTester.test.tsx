import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionPlanStressTester } from "../app/components/DecisionPlanStressTester";
import { StagePersonaSelector } from "../app/components/StagePersonaSelector";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { PolicyAssessment } from "../lib/regimeEngineCore";

const mockAny: any = mock;

mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    prefetch: () => {},
  }),
}));

const mockPolicyAssessment: PolicyAssessment = {
  version: "test",
  normalizations: [],
  composites: { cts: 0, ras: 0 },
  posture: "SAFETY_MODE",
  band: "ELEVATED",
  confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
  refusal: { refused: false, reasons: [] },
  governanceParameters: {
    hiringThreshold: "VERY_HIGH",
    paybackWindowTolerance: "SHORTER",
    rollbackRequirement: "REVERSIBLE_ONLY",
    approvalVelocity: "SLOWER_STRUCTURED",
    expansionScope: "CONSTRAINED",
    experimentationTolerance: "LOW",
  },
};

const mockAssessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: {
    baseRate: 5.25,
    baseRateUsed: "FED",
    curveSlope: -0.30,
    tightness: 72,
    riskAppetite: 38,
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
  policyAssessment: mockPolicyAssessment,
};

describe("DecisionPlanStressTester & StagePersonaSelector", () => {
  it("renders the interactive plan red-team section", () => {
    const html = renderToStaticMarkup(
      <DecisionPlanStressTester
        assessment={mockAssessment}
        recordDate="2026-08-31"
      />
    );

    assert.ok(html.includes("Plan stress test"));
    assert.ok(html.includes("Stress-Test Plan"));
    assert.ok(html.includes("72/100"));
    // Stage is the hero's control, not a second select here; without one the
    // panel grades for the brief's default stage and says so.
    assert.ok(html.includes("graded for a"));
    assert.ok(!html.includes('name="stage"'));
    assert.ok(html.includes("Runway (months)"));
    assert.ok(html.includes("Monthly burn"));
  });

  it("grades for the stage the hero settled on", () => {
    const html = renderToStaticMarkup(
      <DecisionPlanStressTester
        assessment={mockAssessment}
        recordDate="2026-08-31"
        activeStage="bootstrapped"
      />
    );
    assert.ok(html.includes("Bootstrapped team"));
  });

  it("renders the stage persona selector with all 4 primary options", () => {
    const html = renderToStaticMarkup(
      <StagePersonaSelector
        activeStage="seed"
      />
    );

    assert.ok(html.includes("Calibrate Stage:"));
    assert.ok(html.includes("Seed"));
    assert.ok(html.includes("Series A"));
    assert.ok(html.includes("Series B+"));
    assert.ok(html.includes("Bootstrapped"));
    assert.ok(html.includes("Runway &amp; Proof"));
  });
});
