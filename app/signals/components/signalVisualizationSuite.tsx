"use client";

import { useMemo, useState } from "react";
import type { TreasuryData } from "../../../lib/types";
import { SegmentedControl } from "../../components/ui/segmentedControl";
import { formatMonthLabel, formatMonthShortLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";
import { buildSegmentedLineSeries } from "./segmentedLineSeries";
import { CurveTermsKey } from "./curveTermsKey";

type Cadence = "weekly" | "monthly" | "yearly";

const CADENCE_OPTIONS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
] as const satisfies ReadonlyArray<{ key: Cadence; label: string }>;

type YieldCurvePoint = {
  year: number;
  month: number;
  recordDate: string;
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
  curveSignal: number | null;
};

type SignalVisualizationSuiteProps = {
  treasury: TreasuryData;
  yieldCurveSeries: YieldCurvePoint[];
};

type ChartPoint = {
  label: string;
  oneMonth: number | null;
  threeMonth: number | null;
  twoYear: number | null;
  tenYear: number | null;
  spread10Y2Y: number | null;
  spread2Y3M: number | null;
  curveSignal: number | null;
};

const formatPercent = (value: number | null) => (typeof value === "number" ? `${value.toFixed(2)}%` : "n/a");
const formatBp = (value: number | null) => (typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(1)} bp` : "n/a");
const toBp = (value: number | null) => (typeof value === "number" ? value * 100 : null);

const getLabel = (recordDate: string, cadence: Cadence) => {
  const date = new Date(recordDate);
  if (Number.isNaN(date.valueOf())) return recordDate;

  const year = date.getUTCFullYear();
  if (cadence === "yearly") return `${year}`;

  const month = date.getUTCMonth() + 1;
  if (cadence === "monthly") return formatMonthLabel(year, month);

  return `${formatMonthShortLabel(year, month)} ${date.getUTCDate()}, ${year}`;
};

const mean = (values: Array<number | null>) => {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
};

const byCadence = (series: YieldCurvePoint[], cadence: Cadence): ChartPoint[] => {
  if (cadence === "weekly") {
    return series.map((point) => ({
      label: getLabel(point.recordDate, cadence),
      oneMonth: point.oneMonth,
      threeMonth: point.threeMonth,
      twoYear: point.twoYear,
      tenYear: point.tenYear,
      spread10Y2Y: point.spread10Y2Y,
      spread2Y3M: point.spread2Y3M,
      curveSignal: point.curveSignal,
    }));
  }

  const grouped = new Map<string, YieldCurvePoint[]>();
  series.forEach((point) => {
    const date = new Date(point.recordDate);
    if (Number.isNaN(date.valueOf())) return;
    const key = cadence === "yearly" ? `${date.getUTCFullYear()}` : toMonthInput(date.getUTCFullYear(), date.getUTCMonth() + 1);
    grouped.set(key, [...(grouped.get(key) ?? []), point]);
  });

  return Array.from(grouped.entries()).map(([key, points]) => ({
    label: cadence === "yearly" ? key : getLabel(points[0].recordDate, cadence),
    oneMonth: mean(points.map((point) => point.oneMonth)),
    threeMonth: mean(points.map((point) => point.threeMonth)),
    twoYear: mean(points.map((point) => point.twoYear)),
    tenYear: mean(points.map((point) => point.tenYear)),
    spread10Y2Y: mean(points.map((point) => point.spread10Y2Y)),
    spread2Y3M: mean(points.map((point) => point.spread2Y3M)),
    curveSignal: mean(points.map((point) => point.curveSignal)),
  }));
};

/**
 * Positional shim over the shared builder. The local copy this replaces tracked
 * `lastPoint` on every numeric value, including points in runs too short to be
 * drawn — so a series label could point at a spot with no line under it.
 */
const linePath = (
  values: Array<number | null>,
  width: number,
  height: number,
  min: number,
  max: number,
) => buildSegmentedLineSeries({ values, width, height, min, max });

const toChartX = (value: number, min: number, max: number, width: number) => ((value - min) / (max - min || 1)) * width;

const toChartY = (value: number, min: number, max: number, height: number) => height - ((value - min) / (max - min || 1)) * height;

const inDomain = (value: number, min: number, max: number) => value >= min && value <= max;

/**
 * Series colors as tokens. These were hardcoded `rgb(...)` literals picked
 * against the dark ground, and the scatter's backdrop was `rgb(2 6 23)` — a
 * black box once the light theme is on.
 */
const SERIES = {
  oneMonth: "var(--color-semantic-unchanged-border)",
  threeMonth: "var(--accent-action)",
  twoYear: "var(--accent-success)",
  tenYear: "var(--accent-info)",
  spread10Y2Y: "var(--color-semantic-easing-border)",
  spread2Y3M: "var(--color-semantic-caution-border)",
} as const;

/** Vertical extent as text. A chart with no stated scale cannot be read off. */
const formatRange = (min: number, max: number, unit: string) =>
  `${min.toFixed(2)} to ${max.toFixed(2)}${unit}`;

const ribbonTone = (value: number | null) => {
  if (value === null) return "bg-slate-700/70";
  if (value < -0.25) return "bg-rose-500/75";
  if (value <= 0.25) return "bg-amber-500/75";
  return "bg-emerald-500/75";
};

const PanelTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="space-y-1">
    <p className="type-eyebrow text-slate-300">{title}</p>
    <p className="text-fluid-xs text-slate-400">{subtitle}</p>
  </header>
);

const FlatPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <article className={`min-w-0 space-y-2 border border-slate-800/70 bg-slate-950/40 p-2 sm:p-3 ${className}`}>{children}</article>
);

export const SignalVisualizationSuite = ({ treasury, yieldCurveSeries }: SignalVisualizationSuiteProps) => {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const points = useMemo(() => byCadence(yieldCurveSeries, cadence), [yieldCurveSeries, cadence]);
  const latest = points.at(-1) ?? null;
  const midPoint = points[Math.floor((points.length - 1) / 2)] ?? latest;

  const rateValues = points.flatMap((point) => [point.oneMonth, point.threeMonth, point.twoYear, point.tenYear]);
  const numericRates = rateValues.filter((value): value is number => typeof value === "number");
  const rateMin = numericRates.length ? Math.min(...numericRates) - 0.2 : 0;
  const rateMax = numericRates.length ? Math.max(...numericRates) + 0.2 : 1;

  const spreadValues = points.flatMap((point) => [point.spread10Y2Y, point.spread2Y3M]);
  const numericSpreads = spreadValues.filter((value): value is number => typeof value === "number");
  const spreadMin = numericSpreads.length ? Math.min(...numericSpreads, 0) - 0.1 : -0.5;
  const spreadMax = numericSpreads.length ? Math.max(...numericSpreads, 0) + 0.1 : 0.5;

  const monthlyScatter = byCadence(yieldCurveSeries, "monthly")
    .map((point) => ({ x: point.twoYear, y: point.spread10Y2Y, key: point.label }))
    .filter((point): point is { x: number; y: number; key: string } => typeof point.x === "number" && typeof point.y === "number");
  // This panel always plots monthly data, but it used to borrow rateMin/rateMax
  // and spreadMin/spreadMax from `points` — which follow the cadence toggle. So
  // switching the rates chart to weekly or yearly silently rescaled this chart
  // from a different aggregation, sliding every dot and pushing some outside the
  // viewBox entirely. Its domain now comes from its own data.
  const scatterXs = monthlyScatter.map((point) => point.x);
  const scatterYs = monthlyScatter.map((point) => point.y);
  const scatterXMin = scatterXs.length ? Math.min(...scatterXs) - 0.2 : 0;
  const scatterXMax = scatterXs.length ? Math.max(...scatterXs) + 0.2 : 1;
  const scatterYMin = scatterYs.length ? Math.min(...scatterYs, 0) - 0.1 : -0.5;
  const scatterYMax = scatterYs.length ? Math.max(...scatterYs, 0) + 0.1 : 0.5;

  const scatterPath = monthlyScatter.length >= 2
    ? monthlyScatter
      .map((point, index) => {
        const x = toChartX(point.x, scatterXMin, scatterXMax, 100);
        const y = toChartY(point.y, scatterYMin, scatterYMax, 72);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ")
    : "";

  const oneMonthSeries = linePath(points.map((point) => point.oneMonth), 100, 36, rateMin, rateMax);
  const threeMonthSeries = linePath(points.map((point) => point.threeMonth), 100, 36, rateMin, rateMax);
  const twoYearSeries = linePath(points.map((point) => point.twoYear), 100, 36, rateMin, rateMax);
  const tenYearSeries = linePath(points.map((point) => point.tenYear), 100, 36, rateMin, rateMax);
  const spread10Y2YSeries = linePath(points.map((point) => point.spread10Y2Y), 100, 36, spreadMin, spreadMax);
  const spread2Y3MSeries = linePath(points.map((point) => point.spread2Y3M), 100, 36, spreadMin, spreadMax);
  const hasRateGaps =
    oneMonthSeries.missingColumns.length > 0
    || threeMonthSeries.missingColumns.length > 0
    || twoYearSeries.missingColumns.length > 0
    || tenYearSeries.missingColumns.length > 0;
  const hasSpreadGaps =
    spread10Y2YSeries.missingColumns.length > 0
    || spread2Y3MSeries.missingColumns.length > 0;
  const zeroLineY = 36 - ((0 - spreadMin) / (spreadMax - spreadMin || 1)) * 36;

  /* The in-plot series labels that sat here are gone. They were anchored to each
     series' last point at the right edge — exactly where the lines terminate — so
     they overlapped the data, and when the two spreads converged they overlapped
     each other too. Holding them apart fixed only the second half of that.
     Both series are already named directly below the chart, twice: once in the
     colour-matched inversion chips and once in the definitions row. A third
     labelling on top of the data was the one that had to go. */

  const topShocks = yieldCurveSeries
    .map((point, index) => {
      if (index === 0) return null;
      const previous = yieldCurveSeries[index - 1];
      const delta2Y = typeof point.twoYear === "number" && typeof previous.twoYear === "number" ? (point.twoYear - previous.twoYear) * 100 : null;
      const delta10Y = typeof point.tenYear === "number" && typeof previous.tenYear === "number" ? (point.tenYear - previous.tenYear) * 100 : null;
      return {
        label: getLabel(point.recordDate, "weekly"),
        delta2Y,
        delta10Y,
        rank: Math.max(Math.abs(delta2Y ?? 0), Math.abs(delta10Y ?? 0)),
      };
    })
    .filter((point): point is { label: string; delta2Y: number | null; delta10Y: number | null; rank: number } => Boolean(point))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 10);

  /* No header and no disclosure of its own. This renders inside the charts
     disclosure of the evidence page's "Deeper evidence" section, which carries
     the summary; a second `<details>` here was a disclosure inside a
     disclosure. */
  return (
    <div id="visual-diagnostics" className="min-w-0 space-y-4">
      <div className="rounded-md border border-slate-800/80 bg-slate-950/30 p-2 sm:p-4">

        <div className="mt-3 border-b border-slate-800/80 pb-3 text-xs text-slate-300">
          Latest: {treasury.record_date} · {treasury.isLive ? "Live reading" : "Last saved reading"}
        </div>

        {/* Five panels labelled entirely in maturities and spreads. The key goes
            above them, not below, so the shorthand is defined before it is used. */}
        <CurveTermsKey
          terms={["maturities", "spread10Y2Y", "spread2Y3M", "bp"]}
          className="mt-3 border-b border-slate-800/80 pb-3"
        />

        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-12">
          <FlatPanel className="lg:col-span-12">
            <PanelTitle title="Recession warning gauge over time" subtitle="One block per period: green is normal, amber is flattening, red is inverted." />
            <div className="flex min-h-[44px] overflow-hidden rounded-md bg-slate-900/60">
              {points.length ? points.map((point) => <div key={point.label} className={`flex-1 ${ribbonTone(point.curveSignal)}`} title={`${point.label}: ${formatPercent(point.curveSignal)}`} />) : <div className="flex-1 bg-slate-700/70" />}
            </div>
            <p className="mono text-xs text-slate-300">Latest: {formatPercent(latest?.curveSignal ?? null)}</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8 lg:row-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PanelTitle title="Rates by term" subtitle="What the government pays to borrow, by how long it is borrowing for." />
              <SegmentedControl
                options={CADENCE_OPTIONS}
                value={cadence}
                onSelect={setCadence}
                ariaLabel="Chart cadence"
              />
            </div>
            <svg viewBox="-2 -2 104 40" className="weather-data-plot h-auto w-full" aria-label="One-month, three-month, two-year and ten-year Treasury rates">
              {[...oneMonthSeries.missingColumns, ...threeMonthSeries.missingColumns, ...twoYearSeries.missingColumns, ...tenYearSeries.missingColumns].map((column, index) => (
                <rect key={`rate-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="var(--border-subtle)" />
              ))}
              {oneMonthSeries.paths.map((path, index) => (
                <path key={`1m-${index}`} d={path} fill="none" stroke={SERIES.oneMonth} strokeWidth="2" />
              ))}
              {threeMonthSeries.paths.map((path, index) => (
                <path key={`3m-${index}`} d={path} fill="none" stroke={SERIES.threeMonth} strokeWidth="2" />
              ))}
              {twoYearSeries.paths.map((path, index) => (
                <path key={`2y-${index}`} d={path} fill="none" stroke={SERIES.twoYear} strokeWidth="2" />
              ))}
              {tenYearSeries.paths.map((path, index) => (
                <path key={`10y-${index}`} d={path} fill="none" stroke={SERIES.tenYear} strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
              {([
                ["1M", latest?.oneMonth, SERIES.oneMonth],
                ["3M", latest?.threeMonth, SERIES.threeMonth],
                ["2Y", latest?.twoYear, SERIES.twoYear],
                ["10Y", latest?.tenYear, SERIES.tenYear],
              ] as const).map(([label, value, color]) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="h-0.5 w-3 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                  {label} {formatPercent(value ?? null)}
                </span>
              ))}
            </div>
            {/* Autoscaled to the visible window, so the extent has to be stated. */}
            <p className="text-fluid-xs tabular-nums text-slate-400">Vertical scale {formatRange(rateMin, rateMax, "%")}</p>
            {hasRateGaps ? <p className="text-fluid-xs text-slate-400">Breaks indicate missing readings.</p> : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            {/* Unnumbered. The titles were "1)" to "5)" to match DOM order, but a
                numbered list of charts reads as a report template, and nothing
                on the page refers to a chart by its number. */}
            <PanelTitle title="Steepness against level" subtitle="Each dot is one month: across is the two-year rate, up is the gap between the ten-year and two-year rates. Monthly whichever period you pick above." />
            <svg
              viewBox="-3 -3 106 78"
              className="weather-data-plot mx-auto h-auto w-full max-w-[24rem]"
              aria-label={
                monthlyScatter.length >= 2
                  ? `Monthly steepness vs level, ${monthlyScatter.length} months tracing from ${monthlyScatter[0].key} to ${monthlyScatter[monthlyScatter.length - 1].key}. Arrows follow the direction of travel.`
                  : "Monthly steepness vs level scatter"
              }
            >
              <rect x="0" y="0" width="100" height="72" fill="var(--bg-nested)" />
              {inDomain(0, scatterXMin, scatterXMax) ? <line x1={toChartX(0, scatterXMin, scatterXMax, 100)} y1="0" x2={toChartX(0, scatterXMin, scatterXMax, 100)} y2="72" stroke="var(--border-strong)" strokeDasharray="2 2" /> : null}
              {inDomain(0, scatterYMin, scatterYMax) ? <line x1="0" y1={toChartY(0, scatterYMin, scatterYMax, 72)} x2="100" y2={toChartY(0, scatterYMin, scatterYMax, 72)} stroke="var(--border-strong)" strokeDasharray="2 2" /> : null}
              {/* Arrowheads along the path. Opacity fade plus a "latest" label
                  told you which end was now, but nothing showed the direction of
                  travel through the middle of the trail. */}
              <defs>
                <marker
                  id="scatter-direction-arrow"
                  viewBox="0 0 8 8"
                  refX="4"
                  refY="4"
                  markerWidth="4"
                  markerHeight="4"
                  orient="auto-start-reverse"
                >
                  <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--accent-action)" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>
              {scatterPath ? (
                <path
                  d={scatterPath}
                  fill="none"
                  stroke="var(--accent-action)"
                  strokeOpacity="0.28"
                  strokeWidth="0.8"
                  markerMid="url(#scatter-direction-arrow)"
                  markerEnd="url(#scatter-direction-arrow)"
                />
              ) : null}
              {monthlyScatter.map((point, index) => {
                const x = toChartX(point.x, scatterXMin, scatterXMax, 100);
                const y = toChartY(point.y, scatterYMin, scatterYMax, 72);
                const opacity = 0.25 + ((index + 1) / Math.max(monthlyScatter.length, 1)) * 0.65;
                const isLatestPoint = point.key === monthlyScatter[monthlyScatter.length - 1]?.key;
                return (
                  <circle
                    key={point.key}
                    cx={x}
                    cy={y}
                    r={isLatestPoint ? "2.3" : "1.8"}
                    fill="var(--accent-action)"
                    fillOpacity={opacity.toFixed(2)}
                    stroke={isLatestPoint ? "var(--app-text)" : undefined}
                    strokeWidth={isLatestPoint ? "0.5" : undefined}
                  />
                );
              })}
              {monthlyScatter.length ? (
                <text
                  x={Math.min(98, toChartX(monthlyScatter[monthlyScatter.length - 1].x, scatterXMin, scatterXMax, 100) + 4)}
                  y={Math.max(8, toChartY(monthlyScatter[monthlyScatter.length - 1].y, scatterYMin, scatterYMax, 72) - 4)}
                  textAnchor="end"
                  fontSize="5"
                  fontFamily="Inter, system-ui, sans-serif"
                  fill="var(--app-text-secondary)"
                  className="uppercase tracking-[0.04em]"
                >
                  latest
                </text>
              ) : null}
            </svg>
            {monthlyScatter.length ? (
              <p className="text-fluid-xs tabular-nums text-slate-400">
                X {formatRange(scatterXMin, scatterXMax, "%")} · Y {formatRange(scatterYMin, scatterYMax, "%")}
              </p>
            ) : null}
            <p className="text-fluid-xs text-slate-400">Older months fade back and arrowheads follow the direction of travel, so the path shows direction, not just position.</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8">
            <PanelTitle title="Inversion timeline" subtitle="How far each spread sits above or below zero. Below zero is an inversion." />
            <svg viewBox="-2 -2 104 40" className="weather-data-plot h-auto w-full" aria-label="Inversion timeline: ten-year minus two-year spread and two-year minus three-month spread; dashed line marks zero">
              {[...spread10Y2YSeries.missingColumns, ...spread2Y3MSeries.missingColumns].map((column, index) => (
                <rect key={`spread-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="var(--border-subtle)" />
              ))}
              <line x1="0" y1={zeroLineY} x2="100" y2={zeroLineY} stroke="var(--border-strong)" strokeDasharray="2 2" />
              {spread10Y2YSeries.paths.map((path, index) => (
                <path key={`spread-10-2-${index}`} d={path} fill="none" stroke={SERIES.spread10Y2Y} strokeWidth="2" />
              ))}
              {spread2Y3MSeries.paths.map((path, index) => (
                <path key={`spread-2-3-${index}`} d={path} fill="none" stroke={SERIES.spread2Y3M} strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <p className="text-xs text-slate-300">10Y−2Y {formatBp(toBp(latest?.spread10Y2Y ?? null))} · 2Y−3M {formatBp(toBp(latest?.spread2Y3M ?? null))}</p>
            <p className="text-fluid-xs tabular-nums text-slate-400">Vertical scale {formatRange(spreadMin, spreadMax, "%")}</p>
            {hasSpreadGaps ? <p className="text-fluid-xs text-slate-400">Breaks indicate missing spread reads.</p> : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            <PanelTitle title="Biggest weekly rate moves" subtitle="The weeks the two-year and ten-year rates moved most, largest first." />
            <ul className="space-y-1 text-xs text-slate-200">
              {topShocks.length ? (
                topShocks.map((shock) => (
                  <li key={shock.label} className="px-1 py-0.5">
                    <span className="mono text-slate-400">{shock.label}</span> · 2Y {formatBp(shock.delta2Y)} · 10Y {formatBp(shock.delta10Y)}
                  </li>
                ))
              ) : (
                <li className="text-slate-400">No past weeks to compare.</li>
              )}
            </ul>
          </FlatPanel>
        </div>
      </div>
    </div>
  );
};
