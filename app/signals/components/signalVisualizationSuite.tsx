"use client";

import { useMemo, useState } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import type { TreasuryData } from "../../../lib/types";
import { ChevronDownIcon } from "../../components/uiIcons";
import { formatMonthLabel, formatMonthShortLabel, toMonthInput } from "../../../lib/timeMachine/monthFormatting";

type Cadence = "weekly" | "monthly" | "yearly";

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

type SegmentedLineSeries = {
  paths: string[];
  missingColumns: Array<{ x: number; width: number }>;
  lastPoint: { x: number; y: number; value: number; index: number } | null;
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

const linePath = (
  values: Array<number | null>,
  width: number,
  height: number,
  min: number,
  max: number,
): SegmentedLineSeries => {
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const paths: string[] = [];
  const missingColumns: Array<{ x: number; width: number }> = [];
  let currentPath: string[] = [];
  let lastPoint: SegmentedLineSeries["lastPoint"] = null;

  values.forEach((value, index) => {
    if (typeof value !== "number") {
      if (currentPath.length >= 2) {
        paths.push(currentPath.join(" "));
      }
      currentPath = [];
      missingColumns.push({
        x: Math.max(0, index * step - step / 2),
        width: Math.max(step, 4),
      });
      return;
    }

    const x = index * step;
    const y = height - ((value - min) / range) * height;
    currentPath.push(`${currentPath.length === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
    lastPoint = { x, y, value, index };
  });

  if (currentPath.length >= 2) {
    paths.push(currentPath.join(" "));
  }

  return { paths, missingColumns, lastPoint };
};

const toChartX = (value: number, min: number, max: number, width: number) => ((value - min) / (max - min || 1)) * width;

const toChartY = (value: number, min: number, max: number, height: number) => height - ((value - min) / (max - min || 1)) * height;

const inDomain = (value: number, min: number, max: number) => value >= min && value <= max;

const ribbonTone = (value: number | null) => {
  if (value === null) return "bg-slate-700/70";
  if (value < -0.25) return "bg-rose-500/75";
  if (value <= 0.25) return "bg-amber-500/75";
  return "bg-emerald-500/75";
};

const PanelTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <header className="space-y-1">
    <p className="text-xs font-semibold tracking-[0.14em] text-slate-300">{title}</p>
    <p className="text-fluid-xs text-slate-400">{subtitle}</p>
  </header>
);

const FlatPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <article className={`space-y-2 border border-slate-800/70 bg-slate-950/40 p-3 ${className}`}>{children}</article>
);

export const SignalVisualizationSuite = ({ treasury, yieldCurveSeries }: SignalVisualizationSuiteProps) => {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [terminalOpen, setTerminalOpen] = useState(true);
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
  const scatterPath = monthlyScatter.length >= 2
    ? monthlyScatter
      .map((point, index) => {
        const x = toChartX(point.x, rateMin, rateMax, 100);
        const y = toChartY(point.y, spreadMin, spreadMax, 72);
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

  return (
    <section id="visual-diagnostics" className="weather-panel space-y-4 px-6 py-5" aria-labelledby="visual-diagnostics-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.22em] text-slate-300">Visual diagnostics</p>
        <h2 id="visual-diagnostics-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">Yield-curve terminal</h2>
        <p className="text-sm text-slate-300">Cleaner one-screen view: 5 panels, minimal framing.</p>
      </header>

      <Collapsible.Root open={terminalOpen} onOpenChange={setTerminalOpen} className="group rounded-md border border-slate-800/80 bg-slate-950/30 p-4">
        <Collapsible.Trigger className="flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-100">
          <span>Open one-screen terminal</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-slate-700/70 text-slate-400 transition-transform data-[panel-open]:rotate-180"><ChevronDownIcon className="h-3.5 w-3.5" /></span>
        </Collapsible.Trigger>

        <Collapsible.Panel>

        <div className="mt-3 border-b border-slate-800/80 pb-3 text-xs text-slate-300">
          YCURVE | Last: {treasury.record_date} | Live/Cache: {treasury.isLive ? "Live" : "Cache"}
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-12">
          <FlatPanel className="lg:col-span-12">
            <PanelTitle title="1) Curve signal ribbon" subtitle="Green = steep/normal, Amber = flat, Red = inversion." />
            <div className="flex min-h-[44px] overflow-hidden rounded-md bg-slate-900/60">
              {points.length ? points.map((point) => <div key={point.label} className={`flex-1 ${ribbonTone(point.curveSignal)}`} title={`${point.label}: ${formatPercent(point.curveSignal)}`} />) : <div className="flex-1 bg-slate-700/70" />}
            </div>
            <p className="mono text-xs text-slate-300">Latest curve signal: {formatPercent(latest?.curveSignal ?? null)}</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8 lg:row-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PanelTitle title="2) Rate stack" subtitle="1M, 3M, 2Y, 10Y in one panel." />
              <div className="inline-flex rounded-md bg-slate-900/70 p-1">
                {(["weekly", "monthly", "yearly"] as Cadence[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCadence(option)}
                    className={`min-h-[44px] rounded px-3 type-badge ${cadence === option ? "bg-sky-500/30 text-sky-100" : "text-slate-300"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 100 36" className="h-48 w-full" role="img" aria-label="1M, 3M, 2Y and 10Y rate stack">
              {[...oneMonthSeries.missingColumns, ...threeMonthSeries.missingColumns, ...twoYearSeries.missingColumns, ...tenYearSeries.missingColumns].map((column, index) => (
                <rect key={`rate-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="rgb(148 163 184 / 0.08)" />
              ))}
              {oneMonthSeries.paths.map((path, index) => (
                <path key={`1m-${index}`} d={path} fill="none" stroke="rgb(148 163 184)" strokeWidth="1.4" />
              ))}
              {threeMonthSeries.paths.map((path, index) => (
                <path key={`3m-${index}`} d={path} fill="none" stroke="rgb(125 211 252)" strokeWidth="1.4" />
              ))}
              {twoYearSeries.paths.map((path, index) => (
                <path key={`2y-${index}`} d={path} fill="none" stroke="rgb(45 212 191)" strokeWidth="1.4" />
              ))}
              {tenYearSeries.paths.map((path, index) => (
                <path key={`10y-${index}`} d={path} fill="none" stroke="rgb(165 180 252)" strokeWidth="1.4" />
              ))}
              {oneMonthSeries.lastPoint ? <text x="98" y={Math.max(5, oneMonthSeries.lastPoint.y - 6)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-slate-300 uppercase tracking-[0.12em]">1M</text> : null}
              {threeMonthSeries.lastPoint ? <text x="98" y={Math.max(5, threeMonthSeries.lastPoint.y - 2)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-sky-200 uppercase tracking-[0.12em]">3M</text> : null}
              {twoYearSeries.lastPoint ? <text x="98" y={Math.min(34, twoYearSeries.lastPoint.y + 2)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-teal-200 uppercase tracking-[0.12em]">2Y</text> : null}
              {tenYearSeries.lastPoint ? <text x="98" y={Math.min(34, tenYearSeries.lastPoint.y + 6)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-indigo-200 uppercase tracking-[0.12em]">10Y</text> : null}
            </svg>
            <div className="mt-2 flex items-center justify-between type-eyebrow">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <p className="text-xs text-slate-300">1M {formatPercent(latest?.oneMonth ?? null)} · 3M {formatPercent(latest?.threeMonth ?? null)} · 2Y {formatPercent(latest?.twoYear ?? null)} · 10Y {formatPercent(latest?.tenYear ?? null)}</p>
            {hasRateGaps ? <p className="text-fluid-xs text-slate-400">Breaks indicate missing readings.</p> : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            <PanelTitle title="4) Steepness vs level" subtitle="X = 2Y level, Y = 10Y−2Y spread (monthly)." />
            <svg viewBox="0 0 100 72" className="h-48 w-full" role="img" aria-label="Monthly steepness vs level scatter">
              <rect x="0" y="0" width="100" height="72" fill="rgb(2 6 23)" />
              {inDomain(0, rateMin, rateMax) ? <line x1={toChartX(0, rateMin, rateMax, 100)} y1="0" x2={toChartX(0, rateMin, rateMax, 100)} y2="72" stroke="rgb(100 116 139 / 0.6)" strokeDasharray="2 2" /> : null}
              {inDomain(0, spreadMin, spreadMax) ? <line x1="0" y1={toChartY(0, spreadMin, spreadMax, 72)} x2="100" y2={toChartY(0, spreadMin, spreadMax, 72)} stroke="rgb(100 116 139 / 0.6)" strokeDasharray="2 2" /> : null}
              {scatterPath ? <path d={scatterPath} fill="none" stroke="rgb(56 189 248 / 0.28)" strokeWidth="0.8" /> : null}
              {monthlyScatter.map((point, index) => {
                const x = toChartX(point.x, rateMin, rateMax, 100);
                const y = toChartY(point.y, spreadMin, spreadMax, 72);
                const opacity = 0.25 + ((index + 1) / Math.max(monthlyScatter.length, 1)) * 0.65;
                const isLatestPoint = point.key === monthlyScatter[monthlyScatter.length - 1]?.key;
                return (
                  <circle
                    key={point.key}
                    cx={x}
                    cy={y}
                    r={isLatestPoint ? "2.3" : "1.8"}
                    fill={`rgb(56 189 248 / ${opacity.toFixed(2)})`}
                    stroke={isLatestPoint ? "rgb(224 242 254 / 0.9)" : undefined}
                    strokeWidth={isLatestPoint ? "0.5" : undefined}
                  />
                );
              })}
              {monthlyScatter.length ? (
                <text
                  x={Math.min(98, toChartX(monthlyScatter[monthlyScatter.length - 1].x, rateMin, rateMax, 100) + 4)}
                  y={Math.max(8, toChartY(monthlyScatter[monthlyScatter.length - 1].y, spreadMin, spreadMax, 72) - 4)}
                  textAnchor="end"
                  fontSize="5"
                  fontFamily="Inter, system-ui, sans-serif"
                  className="fill-sky-200 type-eyebrow"
                >
                  latest
                </text>
              ) : null}
            </svg>
            <p className="text-fluid-xs text-slate-400">Older months fade back; the path shows direction, not just position.</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8">
            <PanelTitle title="3) Inversion timeline" subtitle="Spreads vs zero-line; below zero means inversion." />
            <svg viewBox="0 0 100 36" className="h-40 w-full" role="img" aria-label="10Y-2Y and 2Y-3M inversion timeline">
              {[...spread10Y2YSeries.missingColumns, ...spread2Y3MSeries.missingColumns].map((column, index) => (
                <rect key={`spread-gap-${index}`} x={column.x} y="0" width={column.width} height="36" fill="rgb(148 163 184 / 0.08)" />
              ))}
              <line x1="0" y1={zeroLineY} x2="100" y2={zeroLineY} stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
              <text x="2" y={Math.max(6, zeroLineY - 2)} fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-slate-400 uppercase tracking-[0.12em]">zero</text>
              {spread10Y2YSeries.paths.map((path, index) => (
                <path key={`spread-10-2-${index}`} d={path} fill="none" stroke="rgb(74 222 128)" strokeWidth="1.4" />
              ))}
              {spread2Y3MSeries.paths.map((path, index) => (
                <path key={`spread-2-3-${index}`} d={path} fill="none" stroke="rgb(250 204 21)" strokeWidth="1.4" />
              ))}
              {spread10Y2YSeries.lastPoint ? <text x="98" y={Math.max(5, spread10Y2YSeries.lastPoint.y - 2)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-emerald-200 uppercase tracking-[0.12em]">10Y-2Y</text> : null}
              {spread2Y3MSeries.lastPoint ? <text x="98" y={Math.min(34, spread2Y3MSeries.lastPoint.y + 5)} textAnchor="end" fontSize="5" fontFamily="Inter, system-ui, sans-serif" className="fill-amber-200 uppercase tracking-[0.12em]">2Y-3M</text> : null}
            </svg>
            <div className="mt-2 flex items-center justify-between type-eyebrow">
              <span>{points[0]?.label ?? "Start"}</span>
              <span>{midPoint?.label ?? "Mid"}</span>
              <span>{latest?.label ?? "Latest"}</span>
            </div>
            <p className="text-xs text-slate-300">10Y−2Y {formatBp(toBp(latest?.spread10Y2Y ?? null))} · 2Y−3M {formatBp(toBp(latest?.spread2Y3M ?? null))}</p>
            {hasSpreadGaps ? <p className="text-fluid-xs text-slate-400">Breaks indicate missing spread reads.</p> : null}
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            <PanelTitle title="5) Shock ladder" subtitle="Largest weekly moves in 2Y and 10Y." />
            <ul className="space-y-1 text-xs text-slate-200">
              {topShocks.length ? (
                topShocks.map((shock) => (
                  <li key={shock.label} className="px-1 py-0.5">
                    <span className="mono text-slate-400">{shock.label}</span> · 2Y {formatBp(shock.delta2Y)} · 10Y {formatBp(shock.delta10Y)}
                  </li>
                ))
              ) : (
                <li className="text-slate-400">No historical deltas available.</li>
              )}
            </ul>
          </FlatPanel>
        </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </section>
  );
};
