/**
 * Shared export-builder fixtures.
 *
 * These were defined inline in `tests/briefBuilders.test.ts`. Extracted so a
 * second suite can exercise the same inputs without a 90-line copy drifting out
 * of step with the first.
 */
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../lib/types";

export const assessment: RegimeAssessment = {
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
  description: "Capital is available and risk appetite is healthy. The weekly call sets the tempo inside that window.",
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
    confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "MODERATE",
      paybackWindowTolerance: "LONGER",
      rollbackRequirement: "STANDARD",
      approvalVelocity: "FASTER",
      expansionScope: "BROAD",
      experimentationTolerance: "HIGH",
    },
  },
};

export const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-04",
  fetched_at: "2026-03-04T00:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 3.75, threeMonth: 3.8, twoYear: 4.1, tenYear: 4.65 },
};

export const sensors: SensorReading[] = [
  {
    id: "BASE_RATE",
    label: "Base rate",
    value: 3.75,
    unit: "%",
    explanation: "",
    category: "Rates",
    group: { id: "Rates", label: "Financial conditions", description: "Core funding conditions" },
    availableTimeWindows: ["1M", "3M", "6M", "12M"],
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
    category: "Rates",
    group: { id: "Rates", label: "Financial conditions", description: "Core funding conditions" },
    availableTimeWindows: ["1M", "3M", "6M", "12M"],
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org",
    formulaUrl: "",
    record_date: "2026-03-04",
    fetched_at: "2026-03-04T00:00:00.000Z",
    isLive: true,
  },
];

export const macros: MacroSeriesReading[] = [
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
