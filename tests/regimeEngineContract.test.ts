import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateRegime } from "../lib/regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";
import goldenFixture from "./fixtures/regimeAssessment.golden.json";

const BASE_TREASURY: Omit<TreasuryData, "yields"> = {
  source: "US Treasury",
  record_date: "2026-02-01",
  fetched_at: "2026-02-02T00:00:00Z",
  isLive: true,
};

const BASELINE_MACRO: MacroSeriesReading[] = [
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
];

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

const projectAssessment = (assessment: ReturnType<typeof evaluateRegime>) => ({
  regime: assessment.regime,
  scores: assessment.scores,
  diagnostics: assessment.diagnostics,
  constraints: assessment.constraints,
  dataWarnings: assessment.dataWarnings,
  thresholds: assessment.thresholds,
  inputs: assessment.inputs.map((input) => ({
    id: input.id,
    value: input.value,
    sourceUrl: input.sourceUrl,
    derivedFrom: input.derivedFrom ?? null,
    notes: input.notes ?? null,
  })),
  policyAssessment: {
    version: assessment.policyAssessment.version,
    posture: assessment.policyAssessment.posture,
    band: assessment.policyAssessment.band,
    composites: assessment.policyAssessment.composites,
    confidenceIndex: assessment.policyAssessment.confidenceIndex,
    refusal: assessment.policyAssessment.refusal,
    governanceParameters: assessment.policyAssessment.governanceParameters,
    normalizations: assessment.policyAssessment.normalizations.map((normalization) => ({
      id: normalization.id,
      clippedZ: normalization.clippedZ,
    })),
  },
});

describe("evaluateRegime golden contracts", () => {
  it("keeps baseline projection stable", () => {
    const assessment = evaluateRegime(
      {
        ...BASE_TREASURY,
        yields: { oneMonth: 5.2, twoYear: 4.8, tenYear: 4.5 },
      },
      undefined,
      BASELINE_MACRO,
    );
    assert.deepEqual(projectAssessment(assessment), goldenFixture.baseline);
  });

  it("keeps stress-overlay projection stable", () => {
    const assessment = evaluateRegime(
      {
        ...BASE_TREASURY,
        yields: { oneMonth: 4.3, twoYear: 4.0, tenYear: 4.2 },
      },
      undefined,
      STRESS_MACRO,
    );
    assert.deepEqual(projectAssessment(assessment), goldenFixture.stressOverlay);
  });

  it("keeps missing-input projection stable", () => {
    const assessment = evaluateRegime({
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
    });
    assert.deepEqual(projectAssessment(assessment), goldenFixture.missingInputs);
  });
});
