import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { SeriesHistoryPoint } from "../../lib/types";
import { formatNumberValue } from "../../lib/formatters";

export const formatNumber = (value: number | null, unit: string) => {
  const formatted = formatNumberValue(value);
  return formatted === "—" ? formatted : `${formatted}${unit}`;
};

export const formatDelta = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumberValue(value)}${unit}`;
};

export const CLIMATE_ORDER = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const;

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

export const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return "Survival Mode";
    case "DEFENSIVE":
      return "Safety Mode";
    case "VOLATILE":
      return "Stability Mode";
    case "EXPANSION":
      return "Growth Mode";
    default:
      return regime;
  }
};

export const regimeBadges = [
  {
    key: "SCARCITY",
    label: "Scarcity",
    icon: "shield",
    description: "Cash is scarce; protect runway and defer bets.",
    classes: "border-rose-500/60 bg-rose-500/15 text-rose-100",
  },
  {
    key: "DEFENSIVE",
    label: "Safety",
    icon: "lock",
    description: "Capital is cautious; prioritize durability and retention.",
    classes: "border-amber-400/60 bg-amber-400/15 text-amber-100",
  },
  {
    key: "VOLATILE",
    label: "Stability",
    icon: "balance",
    description: "Signals are mixed; balance experimentation with controls.",
    classes: "border-sky-400/60 bg-sky-400/15 text-sky-100",
  },
  {
    key: "EXPANSION",
    label: "Growth",
    icon: "rocket",
    description: "Risk appetite is open; scale initiatives responsibly.",
    classes: "border-emerald-400/60 bg-emerald-400/15 text-emerald-100",
  },
] as const;

export const getRegimeBadge = (regime: RegimeAssessment["regime"]) =>
  regimeBadges.find((badge) => badge.key === regime);

export const getRegimeAccent = (regime: RegimeAssessment["regime"]) => {
  switch (regime) {
    case "SCARCITY":
      return {
        panel: "from-rose-600/20 via-rose-500/10 to-transparent border-rose-500/40",
        dot: "bg-rose-500",
        text: "text-rose-200",
      };
    case "DEFENSIVE":
      return {
        panel: "from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/40",
        dot: "bg-amber-400",
        text: "text-amber-200",
      };
    case "VOLATILE":
      return {
        panel: "from-sky-500/20 via-sky-400/10 to-transparent border-sky-400/40",
        dot: "bg-sky-400",
        text: "text-sky-200",
      };
    case "EXPANSION":
      return {
        panel: "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-400/40",
        dot: "bg-emerald-400",
        text: "text-emerald-200",
      };
    default:
      return {
        panel: "from-slate-700/20 via-slate-600/10 to-transparent border-slate-600/40",
        dot: "bg-slate-500",
        text: "text-slate-200",
      };
  }
};
