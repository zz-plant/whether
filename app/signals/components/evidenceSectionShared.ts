import type { ThresholdPressureDirection } from "../../../lib/report/homeBriefModel";

/**
 * Helpers shared by the evidence sections.
 *
 * `evidenceSections.tsx` held seven exported sections plus this geometry in one
 * 747-line file, fifty lines under the budget `app/**` enforces. The sections
 * are independent; only these two helpers were actually common to them.
 */
const SIGNAL_LABEL_COPY: Record<string, string> = {
  Tightness: "Funding pressure",
  "Curve slope": "Recession warning gauge",
  "Base rate": "Base rate",
  "Regime timeline": "Past changes",
  "Macro source series": "Raw source data",
  "Threshold logic": "Watch lines",
  "Time machine": "Past months",
};

export const displaySignalLabel = (label: string) => SIGNAL_LABEL_COPY[label] ?? label;
const clampPercent = (value: number) => Math.min(96, Math.max(4, value));

const normalizeBulletPosition = (
  value: number,
  domain: { min: number; max: number },
) =>
  clampPercent(((value - domain.min) / (domain.max - domain.min || 1)) * 100);

export const buildThresholdMeterState = ({
  currentValue,
  thresholdValue,
  chartDomain,
  watchBuffer,
  pressureDirection,
  leftLabel,
  rightLabel,
}: {
  currentValue: number | null;
  thresholdValue: number | null;
  chartDomain: { min: number; max: number } | null;
  watchBuffer: number;
  pressureDirection: ThresholdPressureDirection;
  leftLabel: string;
  rightLabel: string;
}) => {
  if (
    currentValue === null ||
    thresholdValue === null ||
    chartDomain === null
  ) {
    return null;
  }

  const buildSegment = (startValue: number, endValue: number) => {
    const start = normalizeBulletPosition(startValue, chartDomain);
    const end = normalizeBulletPosition(endValue, chartDomain);
    return {
      left: `${Math.min(start, end)}%`,
      width: `${Math.max(end - start, 2)}%`,
    };
  };

  if (pressureDirection === "higher-is-worse") {
    return {
      currentPercent: normalizeBulletPosition(currentValue, chartDomain),
      thresholdPercent: normalizeBulletPosition(thresholdValue, chartDomain),
      leftLabel,
      rightLabel,
      safe: buildSegment(
        chartDomain.min,
        Math.min(thresholdValue - watchBuffer, chartDomain.max),
      ),
      caution: buildSegment(
        Math.max(chartDomain.min, thresholdValue - watchBuffer),
        Math.min(thresholdValue, chartDomain.max),
      ),
      risk: buildSegment(thresholdValue, chartDomain.max),
    };
  }

  return {
    currentPercent: normalizeBulletPosition(currentValue, chartDomain),
    thresholdPercent: normalizeBulletPosition(thresholdValue, chartDomain),
    leftLabel,
    rightLabel,
    risk: buildSegment(chartDomain.min, thresholdValue),
    caution: buildSegment(
      Math.max(chartDomain.min, thresholdValue),
      Math.min(thresholdValue + watchBuffer, chartDomain.max),
    ),
    safe: buildSegment(
      Math.min(thresholdValue + watchBuffer, chartDomain.max),
      chartDomain.max,
    ),
  };
};

