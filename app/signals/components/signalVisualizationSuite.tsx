"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import type { TreasuryData } from "../../../lib/types";
import { SegmentedControl } from "../../components/ui/segmentedControl";
import { formatMonthLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";
import { formatDateUTC } from "../../../lib/formatters";
import { buildSegmentedLineSeries } from "./segmentedLineSeries";
import { CurveTermsKey, formatSpread } from "./curveTermsKey";

/* No "Weekly". The series is the month-end archive, one reading a month, so the
   weekly option drew the same month-end points under day labels and called
   them weekly. */
type Cadence = "monthly" | "yearly";

const CADENCE_OPTIONS = [
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
};

const formatPercent = (value: number | null) => (typeof value === "number" ? `${value.toFixed(2)}%` : "n/a");
/* Whole basis points. Rates are published to two decimals of a percent, so a
   move between two of them is a whole number of bp, and "+84.0 bp" printed a
   tenth nobody measured. */
const SIGNED_WHOLE_BP = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const formatBpMove = (value: number | null) => (typeof value === "number" ? `${SIGNED_WHOLE_BP.format(value)} bp` : "n/a");

const getLabel = (recordDate: string, cadence: Cadence) => {
  const date = new Date(recordDate);
  if (Number.isNaN(date.valueOf())) return recordDate;

  const year = date.getUTCFullYear();
  if (cadence === "yearly") return `${year}`;

  return formatMonthLabel(year, date.getUTCMonth() + 1);
};

const mean = (values: Array<number | null>) => {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
};

const byCadence = (series: YieldCurvePoint[], cadence: Cadence): ChartPoint[] => {
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
  baselineY?: number,
) => buildSegmentedLineSeries({ values, width, height, min, max, curve: "monotone", baselineY });

const toChartX = (value: number, min: number, max: number, width: number) =>
  scaleLinear().domain([min, max]).range([0, width])(value);

const toChartY = (value: number, min: number, max: number, height: number) =>
  scaleLinear().domain([min, max]).range([height, 0])(value);

const inDomain = (value: number, min: number, max: number) => value >= min && value <= max;

/**
 * Series colors as tokens. These were hardcoded `rgb(...)` literals picked
 * against the dark ground, and the scatter's backdrop was `rgb(2 6 23)` — a
 * black box once the light theme is on.
 */
const SERIES = {
  spread10Y2Y: "var(--color-semantic-easing-border)",
  /* Muted and dashed, not the crossed red: a spread is a series, not a line
     that has been crossed (2026-10-14). */
  spread2Y3M: "var(--app-text-muted)",
} as const;

/**
 * The four terms, told apart by ink and dash rather than by hue: the short end
 * in the muted ink, the long end in the full one, and within each a dotted or
 * dashed line against a solid one. They were sky, green and blue until
 * 2026-10-09, when the action, success and info accents all became the ink
 * (Synoptic: colour is for conditions and line states only), and a term is
 * neither. Ink and dash also survive greyscale, which three hues did not.
 */
const RATE_SERIES = {
  oneMonth: { stroke: "var(--app-text-muted)", dash: "1 4" },
  threeMonth: { stroke: "var(--app-text-muted)", dash: undefined },
  twoYear: { stroke: "var(--app-text)", dash: "6 4" },
  tenYear: { stroke: "var(--app-text)", dash: undefined },
} as const;

/** Vertical extent as text. A chart with no stated scale cannot be read off. */
const formatRange = (min: number, max: number, unit: string) =>
  `${min.toFixed(2)} to ${max.toFixed(2)}${unit}`;

/** What the ribbon's last block is: one month-end, or a year's month-ends averaged. */
const RIBBON_PERIOD: Record<Cadence, string> = {
  monthly: "month-end",
  yearly: "month-end average",
};

const ribbonTone = (value: number | null) => {
  if (value === null) return "bg-transparent";
  if (value < -0.25) return "bg-rose-500/75";
  if (value <= 0.25) return "bg-amber-500/75";
  return "bg-slate-500/40";
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
  const zeroLineY = scaleLinear().domain([spreadMin, spreadMax]).range([36, 0])(0);
  const spread10Y2YSeries = linePath(points.map((point) => point.spread10Y2Y), 100, 36, spreadMin, spreadMax, zeroLineY);
  const spread2Y3MSeries = linePath(points.map((point) => point.spread2Y3M), 100, 36, spreadMin, spreadMax);
  const hasRateGaps =
    oneMonthSeries.missingColumns.length > 0
    || threeMonthSeries.missingColumns.length > 0
    || twoYearSeries.missingColumns.length > 0
    || tenYearSeries.missingColumns.length > 0;
  const hasSpreadGaps =
    spread10Y2YSeries.missingColumns.length > 0
    || spread2Y3MSeries.missingColumns.length > 0;

  /* The in-plot series labels that sat here are gone. They were anchored to each
     series' last point at the right edge — exactly where the lines terminate — so
     they overlapped the data, and when the two spreads converged they overlapped
     each other too. Holding them apart fixed only the second half of that.
     Both series are already named directly below the chart, twice: once in the
     colour-matched inversion chips and once in the definitions row. A third
     labelling on top of the data was the one that had to go. */

  /* Month-end to month-end. The series is the monthly archive, and this panel
     was titled "Biggest weekly rate moves" over rows reading "Mar 31, 2022 ·
     2Y +84.0 bp" — a month's move, dated like a week. */
  const topShocks = yieldCurveSeries
    .map((point, index) => {
      if (index === 0) return null;
      const previous = yieldCurveSeries[index - 1];
      const delta2Y = typeof point.twoYear === "number" && typeof previous.twoYear === "number" ? (point.twoYear - previous.twoYear) * 100 : null;
      const delta10Y = typeof point.tenYear === "number" && typeof previous.tenYear === "number" ? (point.tenYear - previous.tenYear) * 100 : null;
      return {
        label: getLabel(point.recordDate, "monthly"),
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
    // One frame per chart and none around the set (2026-10-09): the five panels
    // sat inside a bordered, filled box inside the disclosure, a frame around
    // frames that grouped nothing the disclosure did not.
    <div id="visual-diagnostics" className="min-w-0 space-y-4">
      <div>

        {/* This week's four rates, then what the charts are. The line said
            "Latest: Oct 5" over charts whose last point was the Aug 31
            month-end, and printed no rate; the closed summary quotes this
            week's 1-month rate, so the panel it opens prints it too. The date
            was the raw record field ("Latest: 2026-10-05") where every other
            line on the page reads "Oct 5, 2026"; it is formatted in UTC, as
            the server formats it, so the client renders the same string. */}
        <div className="space-y-1 border-b border-slate-800/80 pb-3 text-xs">
          <p className="tabular-nums text-slate-300">
            Latest: {formatDateUTC(treasury.record_date)} · {treasury.isLive ? "Live reading" : "Last saved reading"} · 1M{" "}
            {formatPercent(treasury.yields.oneMonth)} · 3M {formatPercent(treasury.yields.threeMonth ?? null)} · 2Y{" "}
            {formatPercent(treasury.yields.twoYear)} · 10Y {formatPercent(treasury.yields.tenYear)}
          </p>
          <p className="text-slate-400">The charts plot month-end readings.</p>
        </div>

        {/* Five panels labelled entirely in maturities and spreads. The key goes
            above them, not below, so the shorthand is defined before it is used. */}
        <CurveTermsKey
          terms={["maturities", "spread10Y2Y", "spread2Y3M", "pp", "bp"]}
          className="mt-3 border-b border-slate-800/80 pb-3"
        />

        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-12">
          {/* The gauge the title names: 10Y−2Y, in pp, the unit its row higher
              up prints it in. This drew an unnamed blend (0.7 of 10Y−2Y plus 0.3 of
              2Y−3M) and printed "Latest: 0.42%" for Aug 31, beside a row giving
              the same gauge as 0.41pp on Aug 31 and 0.47pp this week. The last
              block is a month-end, and the line under it says so. */}
          <FlatPanel className="lg:col-span-12">
            <PanelTitle title="Recession warning gauge over time" subtitle="Ten-year minus two-year rate, one block per period: grey is normal, faint red is flattening, red is inverted." />
            <div className="flex min-h-[44px] overflow-hidden rounded-md bg-slate-900/60">
              {points.length ? points.map((point) => <div key={point.label} className={`flex-1 ${ribbonTone(point.spread10Y2Y)}`} title={`${point.label}: ${formatSpread(point.spread10Y2Y)}`} />) : <div className="flex-1 bg-slate-700/70" />}
            </div>
            {latest ? (
              <p className="text-xs tabular-nums text-slate-300">
                {latest.label} {RIBBON_PERIOD[cadence]}: {formatSpread(latest.spread10Y2Y)}
              </p>
            ) : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-8 lg:row-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PanelTitle title="Rates by term" subtitle="What the government pays to borrow, by how long it is borrowing for." />
              <SegmentedControl
                options={CADENCE_OPTIONS}
                value={cadence}
                onSelect={setCadence}
                ariaLabel="View by month or year"
              />
            </div>
            <svg viewBox="-2 -2 104 40" className="weather-data-plot h-auto w-full" aria-label="One-month, three-month, two-year and ten-year Treasury rates">
              {[...oneMonthSeries.missingColumns, ...threeMonthSeries.missingColumns, ...twoYearSeries.missingColumns, ...tenYearSeries.missingColumns].map((column, index) => (
                <rect key={`rate-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="var(--border-subtle)" />
              ))}
              {oneMonthSeries.paths.map((path, index) => (
                <path key={`1m-${index}`} d={path} fill="none" stroke={RATE_SERIES.oneMonth.stroke} strokeDasharray={RATE_SERIES.oneMonth.dash} strokeWidth="2" />
              ))}
              {threeMonthSeries.paths.map((path, index) => (
                <path key={`3m-${index}`} d={path} fill="none" stroke={RATE_SERIES.threeMonth.stroke} strokeDasharray={RATE_SERIES.threeMonth.dash} strokeWidth="2" />
              ))}
              {twoYearSeries.paths.map((path, index) => (
                <path key={`2y-${index}`} d={path} fill="none" stroke={RATE_SERIES.twoYear.stroke} strokeDasharray={RATE_SERIES.twoYear.dash} strokeWidth="2" />
              ))}
              {tenYearSeries.paths.map((path, index) => (
                <path key={`10y-${index}`} d={path} fill="none" stroke={RATE_SERIES.tenYear.stroke} strokeDasharray={RATE_SERIES.tenYear.dash} strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
              {([
                ["1M", latest?.oneMonth, RATE_SERIES.oneMonth],
                ["3M", latest?.threeMonth, RATE_SERIES.threeMonth],
                ["2Y", latest?.twoYear, RATE_SERIES.twoYear],
                ["10Y", latest?.tenYear, RATE_SERIES.tenYear],
              ] as const).map(([label, value, series]) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-slate-300">
                  {/* The key draws the line itself, dash and all, so it matches the chart. */}
                  <svg width="16" height="4" viewBox="0 0 16 4" className="shrink-0" aria-hidden="true">
                    <line x1="1" y1="2" x2="15" y2="2" stroke={series.stroke} strokeDasharray={series.dash} strokeWidth="2" strokeLinecap="round" />
                  </svg>
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
            <PanelTitle title="Steepness against level" subtitle="Each dot is one month: across is the two-year rate, up is the gap between the ten-year and two-year rates. The dots stay monthly whichever period you pick above." />
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
                  <path d="M1,1 L7,4 L1,7" fill="none" stroke="var(--app-text)" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>
              {scatterPath ? (
                <path
                  d={scatterPath}
                  fill="none"
                  stroke="var(--app-text)"
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
                    fill="var(--app-text)"
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
                X {formatRange(scatterXMin, scatterXMax, "%")} · Y {formatRange(scatterYMin, scatterYMax, "pp")}
              </p>
            ) : null}
            <p className="text-fluid-xs text-slate-400">Older months fade back and arrowheads follow the direction of travel, so the path shows direction as well as position.</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8">
            <PanelTitle title="Inversion timeline" subtitle="How far each spread sits above or below zero. Below zero is an inversion." />
            <svg viewBox="-2 -2 104 40" className="weather-data-plot h-auto w-full" aria-label="Inversion timeline: ten-year minus two-year spread and two-year minus three-month spread; dashed line marks zero">
              {[...spread10Y2YSeries.missingColumns, ...spread2Y3MSeries.missingColumns].map((column, index) => (
                <rect key={`spread-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="var(--border-subtle)" />
              ))}
              <line x1="0" y1={zeroLineY} x2="100" y2={zeroLineY} stroke="var(--border-strong)" strokeDasharray="2 2" />
              {spread10Y2YSeries.areaPaths.map((areaPath, index) => (
                <path key={`spread-10-2-area-${index}`} d={areaPath} fill={SERIES.spread10Y2Y} fillOpacity="0.08" />
              ))}
              {spread10Y2YSeries.paths.map((path, index) => (
                <path key={`spread-10-2-${index}`} d={path} fill="none" stroke={SERIES.spread10Y2Y} strokeWidth="2" />
              ))}
              {spread2Y3MSeries.paths.map((path, index) => (
                <path key={`spread-2-3-${index}`} d={path} fill="none" stroke={SERIES.spread2Y3M} strokeDasharray="4 3" strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <p className="text-xs tabular-nums text-slate-300">10Y−2Y {formatSpread(latest?.spread10Y2Y ?? null)} · 2Y−3M {formatSpread(latest?.spread2Y3M ?? null)}</p>
            <p className="text-fluid-xs tabular-nums text-slate-400">Vertical scale {formatRange(spreadMin, spreadMax, "pp")}</p>
            {hasSpreadGaps ? <p className="text-fluid-xs text-slate-400">Breaks indicate missing spread reads.</p> : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            <PanelTitle title="Biggest monthly rate moves" subtitle="The months the two-year and ten-year rates moved most, month-end to month-end, largest first." />
            <ul className="space-y-1 text-xs text-slate-200">
              {topShocks.length ? (
                topShocks.map((shock) => (
                  <li key={shock.label} className="px-1 py-0.5 tabular-nums">
                    <span className="mono text-slate-400">{shock.label}</span> · 2Y {formatBpMove(shock.delta2Y)} · 10Y {formatBpMove(shock.delta10Y)}
                  </li>
                ))
              ) : (
                <li className="text-slate-400">No earlier month to compare.</li>
              )}
            </ul>
          </FlatPanel>
        </div>
      </div>
    </div>
  );
};
