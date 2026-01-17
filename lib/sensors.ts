/**
 * Sensor builders that translate Treasury data into operator-facing readings.
 * Ensures every numeric output carries explicit source and freshness metadata.
 */
import type { SensorReading, TreasuryData } from "./types";
import { computeCurveSlope, getBaseRate } from "./regimeEngine";

const BASE_RATE_EXPLANATION =
  "Base rate uses the 1-month Treasury yield (fallback to 3-month if missing).";
const CURVE_SLOPE_EXPLANATION =
  "Curve slope is the 10-year yield minus the 2-year yield, a proxy for risk appetite.";

export const buildSensorReadings = (treasury: TreasuryData): SensorReading[] => {
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);

  return [
    {
      id: "BASE_RATE",
      label: `Base rate (${baseRate.used})`,
      value: baseRate.used === "MISSING" ? null : baseRate.value,
      unit: "%",
      explanation: BASE_RATE_EXPLANATION,
      sourceLabel: "US Treasury Fiscal Data API",
      sourceUrl: treasury.source,
      formulaUrl: "/formulas#base-rate",
      record_date: treasury.record_date,
      fetched_at: treasury.fetched_at,
      isLive: treasury.isLive,
    },
    {
      id: "CURVE_SLOPE",
      label: "Curve slope (10Y - 2Y)",
      value: curveSlope,
      unit: "%",
      explanation: CURVE_SLOPE_EXPLANATION,
      sourceLabel: "US Treasury Fiscal Data API",
      sourceUrl: treasury.source,
      formulaUrl: "/formulas#curve-slope",
      record_date: treasury.record_date,
      fetched_at: treasury.fetched_at,
      isLive: treasury.isLive,
    },
  ];
};
