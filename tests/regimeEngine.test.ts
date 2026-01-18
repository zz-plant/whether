/**
 * Regime Engine unit tests for scoring and classification boundaries.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyRegime,
  computeRiskAppetiteScore,
  computeTightnessScore,
  DEFAULT_THRESHOLDS,
  evaluateRegime,
} from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

describe("regime engine scoring", () => {
  it("adds tightness points for high base rate and inverted curve", () => {
    const threshold = DEFAULT_THRESHOLDS.baseRateTightness;
    assert.equal(computeTightnessScore(5.2, -0.3, threshold), 100);
    assert.equal(computeTightnessScore(5.2, 0.2, threshold), 90);
    assert.equal(computeTightnessScore(4.2, -0.2, threshold), 25);
  });

  it("maps risk appetite to 0-100", () => {
    assert.equal(computeRiskAppetiteScore(-1.0), 0);
    assert.equal(computeRiskAppetiteScore(1.5), 100);
  });

  it("clamps risk appetite when curve slope exceeds the range", () => {
    assert.equal(computeRiskAppetiteScore(2.5), 100);
    assert.equal(computeRiskAppetiteScore(-2.5), 0);
  });
});

describe("regime classification", () => {
  it("classifies scarcity with high tightness and low appetite", () => {
    assert.equal(classifyRegime(90, 20, DEFAULT_THRESHOLDS), "SCARCITY");
  });

  it("classifies expansion with low tightness and high appetite", () => {
    assert.equal(classifyRegime(10, 80, DEFAULT_THRESHOLDS), "EXPANSION");
  });

  it("treats threshold equality as expansion", () => {
    assert.equal(
      classifyRegime(
        DEFAULT_THRESHOLDS.tightnessRegime,
        DEFAULT_THRESHOLDS.riskAppetiteRegime,
        DEFAULT_THRESHOLDS
      ),
      "EXPANSION"
    );
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
    assert.equal(assessment.inputs.length, 4);

    const baseRateInput = assessment.inputs.find((input) => input.id === "base-rate");
    assert.equal(baseRateInput?.recordDate, treasury.record_date);
    assert.equal(baseRateInput?.fetchedAt, treasury.fetched_at);
    assert.equal(baseRateInput?.sourceUrl, treasury.source);
  });

  it("flags missing inputs with warnings", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2024-10-01",
      fetched_at: "2024-10-02T00:00:00Z",
      isLive: false,
      yields: {
        oneMonth: null,
        threeMonth: null,
        twoYear: null,
        tenYear: null,
      },
    };

    const assessment = evaluateRegime(treasury);
    assert.ok(assessment.dataWarnings.some((warning) => warning.includes("Base rate missing")));
    assert.ok(assessment.dataWarnings.some((warning) => warning.includes("Curve slope missing")));
  });
});
