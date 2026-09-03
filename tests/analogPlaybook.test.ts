import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { getHistoricalAnalogPlaybook } from "../lib/analogPlaybook";
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

describe("analogPlaybook", () => {
  it("matches defensive late-cycle macro conditions to Q3 2007 analog", () => {
    const playbook = getHistoricalAnalogPlaybook(createMockAssessment());

    assert.equal(playbook.analogPeriod, "Q3 2007");
    assert.ok(playbook.correlationScore >= 80);
    assert.equal(playbook.referenceCycleCount, 4);
    assert.deepEqual(
      playbook.matchBasis.map((item) => item.key),
      ["baseRate", "curveSlope", "tightness", "riskAppetite"],
    );
    assert.equal(playbook.matchBasis[0]?.now, 5.25);
    assert.doesNotMatch(playbook.consensusTrap, /^What peer startups got wrong/);
    assert.match(playbook.consensusTrap, /Expanded enterprise direct sales headcount/);
    assert.ok(playbook.reversalMarker.includes("Yield curve"));
  });
});
