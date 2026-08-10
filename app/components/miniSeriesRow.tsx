"use client";

import type { SeriesHistoryPoint } from "../../lib/types";
import { formatNumberValue } from "../../lib/formatters";

type RowThreshold = {
  label: string;
  value: number;
};

export type MiniSeriesRowProps = {
  name: string;
  latestValue: string;
  zScore: number | null;
  series: SeriesHistoryPoint[];
  thresholds: readonly RowThreshold[];
  updatedAt: string;
  insight: string;
  sharedDomain?: { min: number; max: number };
};

const SPARK_WIDTH = 280;
const SPARK_HEIGHT = 64;
const PADDING = 8;

const parseSeries = (series: SeriesHistoryPoint[], sharedDomain?: { min: number; max: number }) => {
  const valid = series.filter((point): point is SeriesHistoryPoint & { value: number } =>
    typeof point.value === "number",
  );

  if (valid.length === 0) {
    return null;
  }

  const values = valid.map((point) => point.value);
  const localMin = Math.min(...values);
  const localMax = Math.max(...values);
  const min = sharedDomain ? Math.min(sharedDomain.min, localMin) : localMin;
  const max = sharedDomain ? Math.max(sharedDomain.max, localMax) : localMax;
  const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? values[0];
  const range = max - min || 1;
  const innerW = SPARK_WIDTH - PADDING * 2;
  const innerH = SPARK_HEIGHT - PADDING * 2;

  const coords = valid.map((point, index) => ({
    x: PADDING + (index / Math.max(valid.length - 1, 1)) * innerW,
    y: SPARK_HEIGHT - PADDING - ((point.value - min) / range) * innerH,
    value: point.value,
  }));

  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  const toY = (value: number) => SPARK_HEIGHT - PADDING - ((value - min) / range) * innerH;

  return {
    coords,
    path,
    toY,
    median,
    min,
    max,
    latest: coords[coords.length - 1],
    previous: coords[coords.length - 2] ?? coords[coords.length - 1],
  };
};

export const MiniSeriesRow = ({
  name,
  latestValue,
  zScore,
  series,
  thresholds,
  updatedAt,
  insight,
  sharedDomain,
}: MiniSeriesRowProps) => {
  const parsed = parseSeries(series, sharedDomain);
  const isOutlier = zScore !== null && Math.abs(zScore) >= 1.5;
  const lineColor = isOutlier ? "var(--color-semantic-tightening-border)" : "var(--app-text-muted)";
  const sparkDelta = parsed ? parsed.latest.value - parsed.previous.value : 0;
  const directionLabel = sparkDelta > 0 ? "up" : sparkDelta < 0 ? "down" : "flat";
  const rowSummary = `${name}. Latest ${latestValue}. Trend ${directionLabel}. Updated ${updatedAt}. ${insight}`;

  return (
    <article
      aria-label={rowSummary}
      className="weather-surface grid gap-4 rounded-md border border-slate-800/80 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 lg:grid-cols-[1.2fr_2fr_1.4fr]"
    >
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-100">{name}</h3>
        <p className="mono text-xl text-slate-100">{latestValue}</p>
        <p className="text-xs text-slate-400">Updated {updatedAt}</p>
      </div>

      <div>
        <p className="mb-2 text-fluid-xs font-semibold uppercase tracking-[0.16em] text-slate-400">5Y trend</p>
        {parsed ? (
          <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} className="h-16 w-full" aria-hidden="true" preserveAspectRatio="none">
            <path d={parsed.path} fill="none" stroke={lineColor} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
            <line x1={PADDING} x2={SPARK_WIDTH - PADDING} y1={parsed.toY(parsed.median)} y2={parsed.toY(parsed.median)} stroke="var(--app-text-muted)" strokeDasharray="3 3" strokeWidth="1" />
            <text x={SPARK_WIDTH - PADDING} y={parsed.toY(parsed.median) - 2} textAnchor="end" className="fill-slate-500 text-fluid-nano">Median</text>
            <circle cx={parsed.latest.x} cy={parsed.latest.y} r="2" fill="var(--app-text-secondary)" />
            {thresholds.map((threshold) => {
              if (threshold.value < parsed.min || threshold.value > parsed.max) {
                return null;
              }
              const y = parsed.toY(threshold.value);
              return (
                <g key={threshold.label}>
                   <line x1={PADDING} x2={SPARK_WIDTH - PADDING} y1={y} y2={y} stroke="var(--app-text-muted)" strokeDasharray="2 2" strokeWidth="1" />
                  <text x={SPARK_WIDTH - PADDING} y={y - 2} textAnchor="end" className="fill-slate-400 text-fluid-nano">{threshold.label}</text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="h-16 rounded-md border border-slate-800 bg-slate-950/70" aria-hidden="true" />
        )}
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        <p>{insight}</p>
        <p className="text-xs text-slate-400">Trend {directionLabel} · Δ {formatNumberValue(sparkDelta)}</p>
        <p className="text-xs text-slate-400">
          z-score:{" "}
          <span className={isOutlier ? "font-semibold text-rose-300" : "text-slate-300"}>
            {zScore === null ? "N/A" : formatNumberValue(zScore)}
          </span>
        </p>
      </div>
      <p className="sr-only">{rowSummary}</p>
    </article>
  );
};
