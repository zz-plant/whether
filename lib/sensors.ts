/**
 * Sensor builders that translate Treasury data into operator-facing readings.
 * Ensures every numeric output carries explicit source and freshness metadata.
 */
import type { SensorReading, TreasuryData } from "./types";
import { computeCurveSlope, getBaseRate } from "./regimeEngine";
import { getTimeMachineRollingYieldSeries } from "./timeMachineCache";

const BASE_RATE_EXPLANATION =
  "Base rate uses the 1-month Treasury yield (fallback to 3-month if missing).";
const CURVE_SLOPE_EXPLANATION =
  "Curve slope is the 10-year yield minus the 2-year yield, a proxy for risk appetite.";

export const buildSensorReadings = (treasury: TreasuryData): SensorReading[] => {
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const baseRateValue = baseRate.used === "MISSING" ? null : baseRate.value;
  const rollingSeries = getTimeMachineRollingYieldSeries();
  const baseRateTrend =
    baseRate.used === "3M"
      ? rollingSeries.threeMonth
      : baseRate.used === "1M"
        ? rollingSeries.oneMonth
        : [];
  const curveSlopeTrend = rollingSeries.tenYear.map((point, index) => {
    const twoYearPoint = rollingSeries.twoYear[index];
    const tenYearValue = point.value;
    const twoYearValue = twoYearPoint?.value ?? null;

    return {
      date: point.date,
      value:
        typeof tenYearValue === "number" && typeof twoYearValue === "number"
          ? tenYearValue - twoYearValue
          : null,
    };
  });

  return [
    {
      id: "BASE_RATE",
      label: `Base rate (${baseRate.used})`,
      value: baseRateValue,
      unit: "%",
      explanation: BASE_RATE_EXPLANATION,
      sourceLabel: "US Treasury Fiscal Data API",
      sourceUrl: treasury.source,
      formulaUrl: "/formulas#base-rate",
      record_date: treasury.record_date,
      fetched_at: treasury.fetched_at,
      isLive: treasury.isLive,
      history: baseRateValue === null ? [] : [{ date: treasury.record_date, value: baseRateValue }],
      trend: baseRateTrend,
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
      history: curveSlope === null ? [] : [{ date: treasury.record_date, value: curveSlope }],
      trend: curveSlopeTrend,
    },
  ];
};
