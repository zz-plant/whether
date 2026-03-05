"use client";

import { useMemo, useState } from "react";
import type { TreasuryData } from "../../../lib/types";
import { ChevronDownIcon } from "../../components/uiIcons";

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

const formatPercent = (value: number | null) => (typeof value === "number" ? `${value.toFixed(2)}%` : "n/a");
const formatBp = (value: number | null) => (typeof value === "number" ? `${value >= 0 ? "+" : ""}${value.toFixed(1)} bp` : "n/a");
const toBp = (value: number | null) => (typeof value === "number" ? value * 100 : null);

const getLabel = (recordDate: string, cadence: Cadence) => {
  const date = new Date(recordDate);
  if (Number.isNaN(date.valueOf())) return recordDate;
  if (cadence === "yearly") return `${date.getUTCFullYear()}`;

  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (cadence === "monthly") return `${month} ${date.getUTCFullYear()}`;
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
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
    const key = cadence === "yearly" ? `${date.getUTCFullYear()}` : `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
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

const linePath = (values: Array<number | null>, width: number, height: number, min: number, max: number) => {
  const valid = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => typeof point.value === "number");
  if (valid.length < 2) return "";

  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  return valid
    .map((point, i) => {
      const x = point.index * step;
      const y = height - ((point.value - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
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
    <p className="text-[11px] text-slate-500">{subtitle}</p>
  </header>
);

const FlatPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <article className={`space-y-2 border border-slate-800/70 bg-slate-950/40 p-3 ${className}`}>{children}</article>
);

export const SignalVisualizationSuite = ({ treasury, yieldCurveSeries }: SignalVisualizationSuiteProps) => {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const points = useMemo(() => byCadence(yieldCurveSeries, cadence), [yieldCurveSeries, cadence]);
  const latest = points.at(-1) ?? null;

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

      <details className="group rounded-xl border border-slate-800/80 bg-slate-950/30 p-4" open>
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-100">
          <span>Open one-screen terminal</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-open:rotate-180"><ChevronDownIcon className="h-3.5 w-3.5" /></span>
        </summary>

        <div className="mt-3 border-b border-slate-800/80 pb-3 text-xs text-slate-300">
          YCURVE | Last: {treasury.record_date} | Live/Cache: {treasury.isLive ? "Live" : "Cache"}
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-12">
          <FlatPanel className="lg:col-span-12">
            <PanelTitle title="1) Curve signal ribbon" subtitle="Green = steep/normal, Amber = flat, Red = inversion." />
            <div className="flex min-h-[44px] overflow-hidden rounded-sm bg-slate-900/60">
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
                    className={`min-h-[44px] rounded px-3 text-xs font-semibold uppercase tracking-[0.12em] ${cadence === option ? "bg-sky-500/30 text-sky-100" : "text-slate-300"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 100 36" className="h-48 w-full" role="img" aria-label="1M, 3M, 2Y and 10Y rate stack">
              <path d={linePath(points.map((point) => point.oneMonth), 100, 36, rateMin, rateMax)} fill="none" stroke="rgb(148 163 184)" strokeWidth="1.4" />
              <path d={linePath(points.map((point) => point.threeMonth), 100, 36, rateMin, rateMax)} fill="none" stroke="rgb(125 211 252)" strokeWidth="1.4" />
              <path d={linePath(points.map((point) => point.twoYear), 100, 36, rateMin, rateMax)} fill="none" stroke="rgb(45 212 191)" strokeWidth="1.4" />
              <path d={linePath(points.map((point) => point.tenYear), 100, 36, rateMin, rateMax)} fill="none" stroke="rgb(165 180 252)" strokeWidth="1.4" />
            </svg>
            <p className="text-xs text-slate-300">1M {formatPercent(latest?.oneMonth ?? null)} · 3M {formatPercent(latest?.threeMonth ?? null)} · 2Y {formatPercent(latest?.twoYear ?? null)} · 10Y {formatPercent(latest?.tenYear ?? null)}</p>
          </FlatPanel>

          <FlatPanel className="lg:col-span-4">
            <PanelTitle title="4) Steepness vs level" subtitle="X = 2Y level, Y = 10Y−2Y spread (monthly)." />
            <svg viewBox="0 0 100 72" className="h-48 w-full" role="img" aria-label="Monthly steepness vs level scatter">
              <rect x="0" y="0" width="100" height="72" fill="rgb(2 6 23)" />
              {inDomain(0, rateMin, rateMax) ? <line x1={toChartX(0, rateMin, rateMax, 100)} y1="0" x2={toChartX(0, rateMin, rateMax, 100)} y2="72" stroke="rgb(100 116 139 / 0.6)" strokeDasharray="2 2" /> : null}
              {inDomain(0, spreadMin, spreadMax) ? <line x1="0" y1={toChartY(0, spreadMin, spreadMax, 72)} x2="100" y2={toChartY(0, spreadMin, spreadMax, 72)} stroke="rgb(100 116 139 / 0.6)" strokeDasharray="2 2" /> : null}
              {monthlyScatter.map((point) => {
                const x = toChartX(point.x, rateMin, rateMax, 100);
                const y = toChartY(point.y, spreadMin, spreadMax, 72);
                return <circle key={point.key} cx={x} cy={y} r="1.8" fill="rgb(56 189 248 / 0.75)" />;
              })}
            </svg>
          </FlatPanel>

          <FlatPanel className="lg:col-span-8">
            <PanelTitle title="3) Inversion timeline" subtitle="Spreads vs zero-line; below zero means inversion." />
            <svg viewBox="0 0 100 36" className="h-40 w-full" role="img" aria-label="10Y-2Y and 2Y-3M inversion timeline">
              <line x1="0" y1={36 - ((0 - spreadMin) / (spreadMax - spreadMin || 1)) * 36} x2="100" y2={36 - ((0 - spreadMin) / (spreadMax - spreadMin || 1)) * 36} stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
              <path d={linePath(points.map((point) => point.spread10Y2Y), 100, 36, spreadMin, spreadMax)} fill="none" stroke="rgb(74 222 128)" strokeWidth="1.4" />
              <path d={linePath(points.map((point) => point.spread2Y3M), 100, 36, spreadMin, spreadMax)} fill="none" stroke="rgb(250 204 21)" strokeWidth="1.4" />
            </svg>
            <p className="text-xs text-slate-300">10Y−2Y {formatBp(toBp(latest?.spread10Y2Y ?? null))} · 2Y−3M {formatBp(toBp(latest?.spread2Y3M ?? null))}</p>
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
      </details>
    </section>
  );
};
