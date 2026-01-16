/**
 * Regime Engine unit tests for scoring and classification boundaries.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRegime, computeRiskAppetiteScore, computeTightnessScore, evaluateRegime } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

describe("regime engine scoring", () => {
  it("adds tightness points for high base rate and inverted curve", () => {
    assert.equal(computeTightnessScore(5.2, -0.3), 100);
    assert.equal(computeTightnessScore(5.2, 0.2), 90);
    assert.equal(computeTightnessScore(4.2, -0.2), 25);
  });

  it("maps risk appetite to 0-100", () => {
    assert.equal(computeRiskAppetiteScore(-1.0), 0);
    assert.equal(computeRiskAppetiteScore(1.5), 100);
  });
});

describe("regime classification", () => {
  it("classifies scarcity with high tightness and low appetite", () => {
    assert.equal(classifyRegime(90, 20), "SCARCITY");
  });

  it("classifies expansion with low tightness and high appetite", () => {
    assert.equal(classifyRegime(10, 80), "EXPANSION");
  });
});

describe("regime assessment", () => {
  it("returns explainable outputs", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2024-10-01",
      fetched_at: "2024-10-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.2,
        twoYear: 4.8,
        tenYear: 4.5,
      },
    };

    const assessment = evaluateRegime(treasury);
    assert.equal(assessment.regime, "SCARCITY");
    assert.ok(assessment.tightnessExplanation.length > 0);
  });
});
