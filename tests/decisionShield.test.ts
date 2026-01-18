/**
 * Decision Shield unit tests for verdicts and guardrails.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateDecision } from "../lib/decisionShield";
import type { RegimeAssessment } from "../lib/regimeEngine";

describe("decision shield verdicts", () => {
  it("flags hiring as dangerous in scarcity", () => {
    const assessment: RegimeAssessment = {
      regime: "SCARCITY",
      scores: {
        tightness: 100,
        riskAppetite: 20,
        baseRateUsed: "1M",
        baseRate: 5.5,
        curveSlope: -0.4,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
      inputs: [],
    };

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "DANGEROUS");
    assert.ok(output.guardrail.length > 0);
  });

  it("marks expansion hiring as safe with a guardrail", () => {
    const assessment: RegimeAssessment = {
      regime: "EXPANSION",
      scores: {
        tightness: 20,
        riskAppetite: 80,
        baseRateUsed: "1M",
        baseRate: 3.1,
        curveSlope: 1.1,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
      inputs: [],
    };

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "SAFE");
    assert.ok(output.guardrail.length > 0);
  });

  it("returns reversal triggers tied to thresholds", () => {
    const assessment: RegimeAssessment = {
      regime: "DEFENSIVE",
      scores: {
        tightness: 75,
        riskAppetite: 60,
        baseRateUsed: "1M",
        baseRate: 5.4,
        curveSlope: 0.3,
      },
      description: "",
      constraints: [],
      tightnessExplanation: "",
      riskAppetiteExplanation: "",
      dataWarnings: [],
      thresholds: {
        baseRateTightness: 5,
        tightnessRegime: 70,
        riskAppetiteRegime: 50,
      },
      inputs: [],
    };

    const output = evaluateDecision(assessment, {
      lifecycle: "SCALE",
      category: "PRICING",
      action: "DISCOUNT",
    });

    assert.match(output.reversalTrigger, /tightness drops below 70/);
    assert.match(output.reversalTrigger, /risk appetite rises above 50/);
  });
});
