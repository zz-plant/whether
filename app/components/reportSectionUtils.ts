import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { SeriesHistoryPoint } from "../../lib/types";
import { formatNumberWithUnit, formatSignedDeltaWithUnit } from "../../lib/formatters";
import { REGIME_LABELS, REGIME_ORDER, REGIME_STYLE_TOKENS } from "../../lib/regimePresentation";

export const formatNumber = formatNumberWithUnit;

export const formatDelta = formatSignedDeltaWithUnit;

export const CLIMATE_ORDER = REGIME_ORDER;

export const sortClimateKeys = (first: string, second: string) => {
  const climateOrder = CLIMATE_ORDER as readonly string[];
  const firstIndex = climateOrder.indexOf(first);
  const secondIndex = climateOrder.indexOf(second);
  const normalizedFirst = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
  const normalizedSecond = secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;

  if (normalizedFirst === normalizedSecond) {
    return first.localeCompare(second);
  }

  return normalizedFirst - normalizedSecond;
};

export const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const mapToPercent = (value: number, min: number, max: number) => {
  const clamped = clampToRange(value, min, max);
  return ((clamped - min) / (max - min)) * 100;
};

export const SPARKLINE_WIDTH = 160;
export const SPARKLINE_HEIGHT = 40;
const SPARKLINE_PADDING = 4;

const buildSegmentedPathSeries = ({
  values,
  toX,
  toY,
}: {
  values: Array<number | null>;
  toX: (index: number) => number;
  toY: (value: number) => number;
}) => {
  const paths: string[] = [];
  const points: Array<{ x: number; y: number; value: number; index: number }> = [];
  const missingIndices: number[] = [];
  let currentSegment: string[] = [];
  let currentPoints: Array<{ x: number; y: number; value: number; index: number }> = [];

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      if (currentSegment.length >= 2) {
        paths.push(currentSegment.join(" "));
        points.push(...currentPoints);
      } else if (currentPoints.length === 1) {
        points.push(...currentPoints);
      }
      currentSegment = [];
      currentPoints = [];
      missingIndices.push(index);
      return;
    }

    const x = toX(index);
    const y = toY(value);
    currentSegment.push(`${currentSegment.length === 0 ? "M" : "L"} ${x} ${y}`);
    currentPoints.push({ x, y, value, index });
  });

  if (currentSegment.length >= 2) {
    paths.push(currentSegment.join(" "));
    points.push(...currentPoints);
  } else if (currentPoints.length === 1) {
    points.push(...currentPoints);
  }

  return { paths, points, missingIndices };
};

export const buildSparkline = (history?: SeriesHistoryPoint[]) => {
  const values = (history ?? []).map((point) => (typeof point.value === "number" ? point.value : null));
  const numericValues = values.filter((value): value is number => typeof value === "number");

  if (numericValues.length === 0) {
    return null;
  }

  const normalizedValues =
    numericValues.length === 1
      ? [numericValues[0], numericValues[0]]
      : values;
  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const range = maxValue - minValue || 1;
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2;
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
  const pointCount = normalizedValues.length;
  const toX = (index: number) =>
    SPARKLINE_PADDING + (index / Math.max(pointCount - 1, 1)) * innerWidth;
  const toY = (value: number) =>
    SPARKLINE_HEIGHT - SPARKLINE_PADDING - ((value - minValue) / range) * innerHeight;
  const segmented = buildSegmentedPathSeries({
    values: normalizedValues,
    toX,
    toY,
  });
  const areas = segmented.paths.map((path) => {
    const segmentPoints = path
      .split("L")
      .map((command) => command.replace("M", "").trim())
      .filter(Boolean)
      .map((point) => {
        const [x, y] = point.split(" ").map(Number);
        return { x, y };
      });
    const first = segmentPoints[0];
    const last = segmentPoints[segmentPoints.length - 1];
    const baseY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;
    return `${path} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  });
  const latest = segmented.points[segmented.points.length - 1];
  const previous = segmented.points[segmented.points.length - 2] ?? latest;
  const baseY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;
  const delta = latest.value - previous.value;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const medianValue =
    [...numericValues].sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]
    ?? numericValues[0];
  const medianY = toY(medianValue);

  return {
    path: segmented.paths[0] ?? "",
    area: areas[0] ?? "",
    paths: segmented.paths,
    areas,
    latest,
    previous,
    delta,
    direction,
    medianY,
    minValue,
    maxValue,
    missingIndices: segmented.missingIndices,
    hasGaps: segmented.missingIndices.length > 0,
    baselineY: baseY,
  };
};

export const getRegimeLabel = (regime: RegimeAssessment["regime"]) => REGIME_LABELS[regime];

export const regimeBadges = [
  {
    key: "SCARCITY",
    label: "Scarcity",
    icon: "shield",
    description: "Cash is scarce; protect runway and defer bets.",
    classes: REGIME_STYLE_TOKENS.SCARCITY.badge,
  },
  {
    key: "DEFENSIVE",
    label: "Defensive",
    icon: "lock",
    description: "Capital is cautious; prioritize durability and retention.",
    classes: REGIME_STYLE_TOKENS.DEFENSIVE.badge,
  },
  {
    key: "VOLATILE",
    label: "Volatile",
    icon: "balance",
    description: "Evidence is mixed; balance experimentation with controls.",
    classes: REGIME_STYLE_TOKENS.VOLATILE.badge,
  },
  {
    key: "EXPANSION",
    label: "Expansion",
    icon: "rocket",
    description: "Risk appetite is open; scale initiatives responsibly.",
    classes: REGIME_STYLE_TOKENS.EXPANSION.badge,
  },
] as const;

export const getRegimeBadge = (regime: RegimeAssessment["regime"]) =>
  regimeBadges.find((badge) => badge.key === regime);

export const getRegimeAccent = (regime: RegimeAssessment["regime"]) => {
  return REGIME_STYLE_TOKENS[regime].accent;
};
