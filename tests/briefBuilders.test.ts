import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
  regime: "EXPANSION",
  scores: {
    tightness: 12,
    riskAppetite: 68,
    baseRateUsed: "1M",
    baseRate: 3.75,
    curveSlope: 0.55,
  },
  diagnostics: {
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
    nearestThresholdDelta: 0,
    confidence: "MEDIUM",
    transitionWatch: false,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Constraint one", "Constraint two", "Constraint three"],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "RISK_ON",
    band: "NEUTRAL",
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      maxNetNewSpendPct: 0,
      hiringCapPct: 0,
      pilotBudgetPct: 0,
      reserveFloorMonths: 0,
      approvalMode: "NORMAL",
      requiredApprovers: [],
      freezeNonCriticalBackfills: false,
      defaultInstrument: "FEATURE_FLAG",
      allowIrreversibleMigrations: false,
      requireKillSwitch: false,
      requireWeeklyReview: true,
      triggerEscalationOnBreach: false,
      notes: [],
    },
  },
};

const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-04",
  fetched_at: "2026-03-04T00:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 3.75, threeMonth: 3.8, twoYear: 4.1, tenYear: 4.65 },
};

const sensors: SensorReading[] = [
  {
    id: "BASE_RATE",
    label: "Base rate",
    value: 3.75,
    unit: "%",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
  {
    id: "CURVE_SLOPE",
    label: "Curve slope",
    value: 0.55,
    unit: "%",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
];

const macros: MacroSeriesReading[] = [
  {
    id: "CHICAGO_FCI",
    label: "Chicago Fed National Financial Conditions Index",
    value: -0.52,
    unit: "index",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
    formulaUrl: "",
    record_date: "2026-02-27",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
  {
    id: "BBB_CREDIT_SPREAD",
    label: "BBB credit spread (OAS)",
    value: 174,
    unit: "bps",
    explanation: "",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/BAA10Y",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
];

describe("buildSlackBrief", () => {
  it("formats index values without the literal unit suffix", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /Chicago Fed National Financial Conditions Index: -0\.52 · refreshed 2026-02-27/);
    assert.doesNotMatch(brief, /-0\.52index/);
  });

  it("formats bps values with readable spacing", () => {
    const brief = buildSlackBrief(assessment, treasury, sensors, macros);

    assert.match(brief, /BBB credit spread \(OAS\): 174\.00 bps · refreshed 2026-03-04/);
  });
});
