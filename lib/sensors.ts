/**
 * Sensor builders that translate Treasury data into operator-facing readings.
 * Ensures every numeric output carries explicit source and freshness metadata.
 */
import type {
  SensorCategory,
  SensorReading,
  SensorGroupMeta,
  SensorTimeWindow,
  SensorWindowAggregation,
  SeriesHistoryPoint,
  TreasuryData,
} from "./types";
import { computeCurveSlope, getBaseRate } from "./regimeEngine";
import { getTimeMachineRollingYieldSeries } from "./timeMachine/timeMachineCache";

const BASE_RATE_EXPLANATION =
  "Base rate uses the 1-month Treasury yield (fallback to 3-month if missing).";
const CURVE_SLOPE_EXPLANATION =
  "Curve slope is the 10-year yield minus the 2-year yield, a proxy for risk appetite.";

export const sensorGroups = [
  {
    id: "Rates",
    label: "Rates",
    description: "Policy stance, curve health, and funding rates.",
  },
  {
    id: "Labor",
    label: "Labor",
    description: "Employment resilience, wage pressure, and hiring breadth.",
  },
  {
    id: "Inflation",
    label: "Inflation",
    description: "Price stability, demand pressure, and purchasing power.",
  },
  {
    id: "Credit",
    label: "Credit",
    description: "Funding spreads, liquidity stress, and risk appetite.",
  },
] as const satisfies SensorGroupMeta[];

export const sensorCategories: SensorCategory[] = sensorGroups.map((group) => group.id);

const sensorGroupLookup = sensorGroups.reduce<Record<SensorCategory, SensorGroupMeta>>(
  (accumulator, group) => {
    accumulator[group.id] = group;
    return accumulator;
  },
  {} as Record<SensorCategory, SensorGroupMeta>
);

export const sensorTimeWindows = [
  { id: "1M", label: "1M", months: 1, description: "Past month" },
  { id: "3M", label: "3M", months: 3, description: "Past quarter" },
  { id: "6M", label: "6M", months: 6, description: "Past half year" },
  { id: "12M", label: "12M", months: 12, description: "Past year" },
] as const satisfies {
  id: SensorTimeWindow;
  label: string;
  months: number;
  description: string;
}[];

export type SensorCategoryGroup = {
  category: SensorCategory;
  label: string;
  description: string;
  sensors: SensorReading[];
};

const findLatestNumericPoint = (series: SeriesHistoryPoint[]) => {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index]?.value ?? null;
    if (typeof value === "number") {
      return { index, value };
    }
  }
  return null;
};

const findPreviousNumericValue = (series: SeriesHistoryPoint[], fromIndex: number) => {
  for (let index = fromIndex; index >= 0; index -= 1) {
    const value = series[index]?.value ?? null;
    if (typeof value === "number") {
      return value;
    }
  }
  return null;
};

const buildSensorWindowAggregations = (
  series: SeriesHistoryPoint[]
): SensorWindowAggregation[] => {
  if (!series.length) {
    return [];
  }
  const latest = findLatestNumericPoint(series);
  if (!latest) {
    return [];
  }

  return sensorTimeWindows.map((window) => {
    const targetIndex = latest.index - window.months;
    if (targetIndex < 0) {
      return {
        window: window.id,
        change: null,
        previousValue: null,
      };
    }
    const previousValue = findPreviousNumericValue(series, targetIndex);
    return {
      window: window.id,
      change: typeof previousValue === "number" ? latest.value - previousValue : null,
      previousValue,
    };
  });
};

export const filterSensorsByCategory = (
  sensors: SensorReading[],
  categories: SensorCategory[]
) => {
  if (categories.length === 0) {
    return [];
  }
  const categorySet = new Set(categories);
  return sensors.filter((sensor) => categorySet.has(sensor.category));
};

export const groupSensorsByCategory = (
  sensors: SensorReading[],
  categories: SensorCategory[] = sensorCategories
): SensorCategoryGroup[] =>
  categories.map((category) => {
    const metadata = sensorGroupLookup[category];
    return {
      category,
      label: metadata.label,
      description: metadata.description,
      sensors: sensors.filter((sensor) => sensor.category === category),
    };
  });

export const getSensorWindowAggregation = (
  sensor: SensorReading,
  window: SensorTimeWindow
) => sensor.timeWindows?.find((entry) => entry.window === window);

export const buildSensorReadings = (treasury: TreasuryData): SensorReading[] => {
  const baseRate = getBaseRate(treasury.yields);
  const curveSlope = computeCurveSlope(treasury.yields);
  const baseRateValue = baseRate.used === "MISSING" ? null : baseRate.value;
  const rollingSeries = getTimeMachineRollingYieldSeries();
  const availableTimeWindows = sensorTimeWindows.map((window) => window.id);
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
  const baseRateSeries =
    baseRateTrend.length > 0
      ? baseRateTrend
      : baseRateValue === null
        ? []
        : [{ date: treasury.record_date, value: baseRateValue }];
  const curveSlopeSeries =
    curveSlopeTrend.length > 0
      ? curveSlopeTrend
      : curveSlope === null
        ? []
        : [{ date: treasury.record_date, value: curveSlope }];

  return [
    {
      id: "BASE_RATE",
      label: `Base rate (${baseRate.used})`,
      value: baseRateValue,
      unit: "%",
      explanation: BASE_RATE_EXPLANATION,
      category: "Rates",
      group: sensorGroupLookup.Rates,
      availableTimeWindows,
      sourceLabel: "US Treasury Fiscal Data API",
      sourceUrl: treasury.source,
      formulaUrl: "/formulas#base-rate",
      record_date: treasury.record_date,
      fetched_at: treasury.fetched_at,
      isLive: treasury.isLive,
      history: baseRateValue === null ? [] : [{ date: treasury.record_date, value: baseRateValue }],
      trend: baseRateTrend,
      timeWindows: buildSensorWindowAggregations(baseRateSeries),
    },
    {
      id: "CURVE_SLOPE",
      label: "Curve slope (10Y - 2Y)",
      value: curveSlope,
      unit: "%",
      explanation: CURVE_SLOPE_EXPLANATION,
      category: "Rates",
      group: sensorGroupLookup.Rates,
      availableTimeWindows,
      sourceLabel: "US Treasury Fiscal Data API",
      sourceUrl: treasury.source,
      formulaUrl: "/formulas#curve-slope",
      record_date: treasury.record_date,
      fetched_at: treasury.fetched_at,
      isLive: treasury.isLive,
      history: curveSlope === null ? [] : [{ date: treasury.record_date, value: curveSlope }],
      trend: curveSlopeTrend,
      timeWindows: buildSensorWindowAggregations(curveSlopeSeries),
    },
  ];
};
