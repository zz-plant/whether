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
  deriveRegimeTrend,
  evaluateRegime,
} from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

describe("regime engine scoring", () => {
  it("ramps tightness as rates move above threshold and curve inverts", () => {
    const threshold = DEFAULT_THRESHOLDS.baseRateTightness;
    assert.equal(computeTightnessScore(5.2, -0.3, threshold), 51);
    assert.equal(computeTightnessScore(5.2, 0.2, threshold), 36);
    assert.equal(computeTightnessScore(4.2, -0.2, threshold), 10);
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

  it("treats threshold equality as volatile", () => {
    assert.equal(
      classifyRegime(
        DEFAULT_THRESHOLDS.tightnessRegime,
        DEFAULT_THRESHOLDS.riskAppetiteRegime,
        DEFAULT_THRESHOLDS
      ),
      "VOLATILE"
    );
  });
});

describe("regime assessment", () => {
  it("returns explainable outputs", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.2,
        twoYear: 4.8,
        tenYear: 4.5,
      },
    };

    const assessment = evaluateRegime(treasury);
    assert.equal(assessment.regime, "VOLATILE");
    assert.ok(assessment.tightnessExplanation.length > 0);
    assert.equal(assessment.inputs.length, 4);

    const baseRateInput = assessment.inputs.find((input) => input.id === "base-rate");
    assert.equal(baseRateInput?.recordDate, treasury.record_date);
    assert.equal(baseRateInput?.fetchedAt, treasury.fetched_at);
    assert.equal(baseRateInput?.sourceUrl, treasury.source);
    assert.equal(assessment.diagnostics.confidence, "MEDIUM");
    assert.equal(assessment.diagnostics.intensity, "STANDARD");
    assert.equal(assessment.diagnostics.transitionWatch, false);
  });



  it("returns policy assessment composites and refusal state", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.2,
        twoYear: 4.8,
        tenYear: 4.5,
      },
    };

    const assessment = evaluateRegime(treasury, undefined, [
      {
        id: "BBB_CREDIT_SPREAD",
        label: "BBB",
        value: 1.8,
        unit: "%",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
        history: [
          { date: "2024-09-01", value: 1.7 },
          { date: "2024-08-01", value: 1.6 },
        ],
      },
      {
        id: "CPI_YOY",
        label: "CPI",
        value: 3.1,
        unit: "%",
        explanation: "",
        sourceLabel: "BLS",
        sourceUrl: "https://bls.gov/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
      },
      {
        id: "UNEMPLOYMENT_RATE",
        label: "Unemployment",
        value: 4.2,
        unit: "%",
        explanation: "",
        sourceLabel: "BLS",
        sourceUrl: "https://bls.gov/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
      },
    ]);

    assert.equal(assessment.policyAssessment.version, "policy-v1");
    assert.equal(assessment.policyAssessment.normalizations.length, 5);
    assert.equal(typeof assessment.policyAssessment.composites.cts, "number");
    assert.equal(typeof assessment.policyAssessment.composites.ras, "number");
    assert.equal(assessment.policyAssessment.refusal.refused, false);
    assert.equal(assessment.policyAssessment.band === "NEUTRAL" || assessment.policyAssessment.band === "ELEVATED" || assessment.policyAssessment.band === "EXTREME", true);
    assert.equal(typeof assessment.policyAssessment.governanceParameters.hiringThreshold, "string");
  });


  it("maps aligned policy signals to risk-on and safety postures", () => {
    const riskOnTreasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 3.2,
        twoYear: 3.5,
        tenYear: 4.5,
      },
    };

    const riskOnAssessment = evaluateRegime(riskOnTreasury, undefined, [
      {
        id: "BBB_CREDIT_SPREAD",
        label: "BBB",
        value: 1.2,
        unit: "%",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
        history: [
          { date: "2024-09-01", value: 2.5 },
          { date: "2024-08-01", value: 2.6 },
        ],
      },
    ]);

    assert.equal(riskOnAssessment.policyAssessment.posture, "RISK_ON");

    const safetyTreasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.8,
        twoYear: 5.0,
        tenYear: 4.0,
      },
    };

    const safetyAssessment = evaluateRegime(safetyTreasury, undefined, [
      {
        id: "BBB_CREDIT_SPREAD",
        label: "BBB",
        value: 3.0,
        unit: "%",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
        history: [
          { date: "2024-09-01", value: 2.0 },
          { date: "2024-08-01", value: 2.1 },
        ],
      },
    ]);

    assert.equal(safetyAssessment.policyAssessment.posture, "SAFETY_MODE");
  });

  it("refuses posture change when policy signal gaps are too large", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: false,
      yields: {
        oneMonth: null,
        threeMonth: null,
        twoYear: null,
        tenYear: null,
      },
    };

    const assessment = evaluateRegime(treasury);
    assert.equal(assessment.policyAssessment.refusal.refused, true);
    assert.equal(assessment.policyAssessment.refusal.fallbackMessage, "NO_POSTURE_CHANGE_RECOMMENDED");
    assert.equal(assessment.policyAssessment.refusal.executionMode, "REVERSIBLE_BETS_ONLY");
    assert.equal(assessment.policyAssessment.governanceParameters.rollbackRequirement, "REVERSIBLE_ONLY");
  });
  it("flags missing inputs with warnings", () => {
    const treasury: TreasuryData = {
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
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
    assert.equal(assessment.scores.riskAppetite, 0);
  });
});


describe("regime trend", () => {
  it("derives improving trend when tightness eases across the threshold", () => {
    const previous = evaluateRegime({
      source: "US Treasury",
      record_date: "2026-02-01",
      fetched_at: "2026-02-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 5.8,
        twoYear: 5.1,
        tenYear: 4.0,
      },
    });
    const current = evaluateRegime({
      source: "US Treasury",
      record_date: "2024-11-01",
      fetched_at: "2024-11-02T00:00:00Z",
      isLive: true,
      yields: {
        oneMonth: 4.2,
        twoYear: 4.0,
        tenYear: 4.4,
      },
    });

    assert.equal(deriveRegimeTrend(previous, current), "IMPROVING");
  });
});


describe("regime macro overlays", () => {
  const treasury: TreasuryData = {
    source: "US Treasury",
    record_date: "2026-02-01",
    fetched_at: "2026-02-02T00:00:00Z",
    isLive: true,
    yields: {
      oneMonth: 4.3,
      twoYear: 4.0,
      tenYear: 4.2,
    },
  };

  it("tightens and lowers risk appetite when stress overlays are weak", () => {
    const baseline = evaluateRegime(treasury);
    const stressed = evaluateRegime(treasury, undefined, [
      {
        id: "HY_CREDIT_SPREAD",
        label: "HY",
        value: 6.2,
        unit: "%",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
      },
      {
        id: "VIX_INDEX",
        label: "VIX",
        value: 28,
        unit: "index",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
      },
      {
        id: "CHICAGO_FCI",
        label: "NFCI",
        value: 0.35,
        unit: "index",
        explanation: "",
        sourceLabel: "FRED",
        sourceUrl: "https://fred.stlouisfed.org/",
        formulaUrl: "/methodology",
        record_date: "2026-02-01",
        fetched_at: "2026-02-02T00:00:00Z",
        isLive: true,
      },
    ]);

    assert.ok(stressed.scores.tightness > baseline.scores.tightness);
    assert.ok(stressed.scores.riskAppetite < baseline.scores.riskAppetite);
    assert.equal(stressed.diagnostics.twoWeakReadsWarning, true);
    assert.ok(stressed.diagnostics.boundaryContributors.length >= 2);
  });
});
