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
    };

    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });

    assert.equal(output.verdict, "DANGEROUS");
    assert.ok(output.guardrail.length > 0);
  });
});
