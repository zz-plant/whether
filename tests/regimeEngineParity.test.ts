import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime, type RegimeKey } from "../lib/regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

type ParityExpectation = {
  regime: RegimeKey;
  tightness: number;
  riskAppetite: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  intensity: "MILD" | "STANDARD" | "STRONG";
  weakReadCount: number;
  boundaryContributors: string[];
  policyPosture: "RISK_ON" | "SAFETY_MODE" | "TRANSITION";
  policyBand: "NEUTRAL" | "ELEVATED" | "EXTREME";
  policyRefused: boolean;
};

const BASE_TREASURY: Omit<TreasuryData, "yields"> = {
  source: "US Treasury",
  record_date: "2026-02-01",
  fetched_at: "2026-02-02T00:00:00Z",
  isLive: true,
};

const STRESS_MACRO: MacroSeriesReading[] = [
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
];

describe("regime engine extracted-module parity", () => {
  const cases: Array<{
    name: string;
    treasury: TreasuryData;
    macroSeries?: MacroSeriesReading[];
    expected: ParityExpectation;
  }> = [
    {
      name: "volatile baseline posture",
      treasury: {
        ...BASE_TREASURY,
        yields: { oneMonth: 5.2, twoYear: 4.8, tenYear: 4.5 },
      },
      expected: {
        regime: "VOLATILE",
        tightness: 51,
        riskAppetite: 28,
        confidence: "MEDIUM",
        intensity: "STANDARD",
        weakReadCount: 0,
        boundaryContributors: [],
        policyPosture: "SAFETY_MODE",
        policyBand: "ELEVATED",
        policyRefused: true,
      },
    },
    {
      name: "expansion baseline posture",
      treasury: {
        ...BASE_TREASURY,
        yields: { oneMonth: 3.2, twoYear: 3.5, tenYear: 4.5 },
      },
      expected: {
        regime: "EXPANSION",
        tightness: 0,
        riskAppetite: 80,
        confidence: "HIGH",
        intensity: "STRONG",
        weakReadCount: 0,
        boundaryContributors: [],
        policyPosture: "TRANSITION",
        policyBand: "ELEVATED",
        policyRefused: true,
      },
    },
    {
      name: "stress overlays preserve contributor and warning behavior",
      treasury: {
        ...BASE_TREASURY,
        yields: { oneMonth: 4.3, twoYear: 4.0, tenYear: 4.2 },
      },
      macroSeries: STRESS_MACRO,
      expected: {
        regime: "VOLATILE",
        tightness: 14,
        riskAppetite: 36,
        confidence: "MEDIUM",
        intensity: "STANDARD",
        weakReadCount: 3,
        boundaryContributors: [
          "HY OAS stress",
          "Financial conditions tightening",
          "Equity volatility shock",
        ],
        policyPosture: "RISK_ON",
        policyBand: "ELEVATED",
        policyRefused: true,
      },
    },
  ];

  cases.forEach(({ name, treasury, macroSeries, expected }) => {
    it(name, () => {
      const assessment = evaluateRegime(treasury, undefined, macroSeries ?? []);
      assert.equal(assessment.regime, expected.regime);
      assert.equal(assessment.scores.tightness, expected.tightness);
      assert.equal(assessment.scores.riskAppetite, expected.riskAppetite);
      assert.equal(assessment.diagnostics.confidence, expected.confidence);
      assert.equal(assessment.diagnostics.intensity, expected.intensity);
      assert.equal(assessment.diagnostics.weakReadCount, expected.weakReadCount);
      assert.deepEqual(assessment.diagnostics.boundaryContributors, expected.boundaryContributors);
      assert.equal(assessment.policyAssessment.posture, expected.policyPosture);
      assert.equal(assessment.policyAssessment.band, expected.policyBand);
      assert.equal(assessment.policyAssessment.refusal.refused, expected.policyRefused);
    });
  });
});
