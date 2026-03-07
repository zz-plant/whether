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

export const buildSparkline = (history?: SeriesHistoryPoint[]) => {
  const points = (history ?? [])
    .filter((point): point is { date: string; value: number } => typeof point.value === "number")
    .map((point) => ({ value: point.value }));

  if (points.length === 0) {
    return null;
  }

  const normalizedPoints = points.length === 1 ? [points[0], points[0]] : points;
  const values = normalizedPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING * 2;
  const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2;
  const coords = normalizedPoints.map((point, index) => {
    const x = SPARKLINE_PADDING + (index / (normalizedPoints.length - 1)) * innerWidth;
    const y =
      SPARKLINE_HEIGHT -
      SPARKLINE_PADDING -
      ((point.value - minValue) / range) * innerHeight;
    return { x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const baseY = SPARKLINE_HEIGHT - SPARKLINE_PADDING;
  const area = `${path} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;

  return { path, area };
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
    description: "Signals are mixed; balance experimentation with controls.",
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
