import type { MacroSeriesReading, TreasuryData } from "../../../lib/types";
import type { RegimeAssessment, RegimeKey } from "../../../lib/regimeEngine";
import type { SummaryArchiveEntry } from "../../../lib/summary/summaryArchive";
import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import { RISK_APPETITE_REGIME_THRESHOLD } from "../../../lib/regimeEngine";
import { ChevronDownIcon } from "../../components/uiIcons";
import { RegimePlaybackScrubber } from "./regimePlaybackScrubber";

export type SignalMetricFocus = "tightness" | "risk" | "curve";

type SignalVisualizationSuiteProps = {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  regimeSeries: TimeMachineRegimeEntry[];
  summaryArchive: SummaryArchiveEntry[];
  activeMetric: SignalMetricFocus;
  playbackIndex: number;
};

type MonthlySeriesPoint = {
  asOf: string;
  regime: RegimeKey;
  baseRate: number | null;
  twoYear: number | null;
  tenYear: number | null;
  curveSlope: number | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  transitionWatch: boolean;
};

type RegimeRun = {
  regime: RegimeKey;
  start: string;
  end: string;
  count: number;
};

type FiveNumberSummary = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

const regimeLabel: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

const regimeTone: Record<RegimeKey, string> = {
  SCARCITY: "bg-rose-400",
  DEFENSIVE: "bg-amber-400",
  VOLATILE: "bg-indigo-400",
  EXPANSION: "bg-emerald-400",
};

const confidenceTone: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-rose-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-emerald-400",
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseDateUTC = (value: string) => {
  const datePart = value.split("T")[0];
  const segments = datePart.split("-").map((segment) => Number(segment));

  if (segments.length === 3 && segments.every((segment) => Number.isFinite(segment))) {
    const [year, month, day] = segments;
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
};

const formatMonthLabel = (value: string) => monthFormatter.format(parseDateUTC(value));

const formatMonthShort = (value: string) => shortMonthFormatter.format(parseDateUTC(value));

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null) {
    return "N/A";
  }
  return value.toFixed(decimals);
};

const getInputValue = (entry: SummaryArchiveEntry, inputId: "base-rate" | "two-year" | "ten-year" | "curve-slope") => {
  const matched = entry.summary.inputs.find((input) => input.id === inputId);
  if (!matched) {
    return null;
  }
  return typeof matched.value === "number" && Number.isFinite(matched.value) ? matched.value : null;
};

const buildSparklinePath = (values: Array<number | null>, width: number, height: number) => {
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => typeof point.value === "number");

  if (points.length < 2) {
    return "";
  }

  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  return points
    .map((point, pointIndex) => {
      const x = point.index * step;
      const y = height - ((point.value - min) / range) * height;
      return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const buildScaledPath = (
  values: Array<number | null>,
  width: number,
  height: number,
  min: number,
  max: number,
) => {
  const points = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => typeof point.value === "number");

  if (points.length < 2) {
    return "";
  }

  const safeRange = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  return points
    .map((point, pointIndex) => {
      const x = point.index * step;
      const y = height - ((point.value - min) / safeRange) * height;
      return `${pointIndex === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const getScaledY = (value: number, min: number, max: number, height: number) => {
  const safeRange = max - min || 1;
  return height - ((value - min) / safeRange) * height;
};

const buildRegimeRuns = (points: MonthlySeriesPoint[]): RegimeRun[] => {
  return points.reduce<RegimeRun[]>((runs, point) => {
    const lastRun = runs.at(-1);

    if (!lastRun || lastRun.regime !== point.regime) {
      runs.push({
        regime: point.regime,
        count: 1,
        start: point.asOf,
        end: point.asOf,
      });
      return runs;
    }

    lastRun.count += 1;
    lastRun.end = point.asOf;
    return runs;
  }, []);
};

const quantile = (sortedValues: number[], percentile: number) => {
  if (sortedValues.length === 0) {
    return null;
  }

  const position = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(lowerIndex + 1, sortedValues.length - 1);
  const weight = position - lowerIndex;

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
};

const buildFiveNumberSummary = (values: number[]): FiveNumberSummary | null => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);

  if (q1 === null || median === null || q3 === null) {
    return null;
  }

  return {
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1],
  };
};

const intensityStyle = (value: number, max: number, rgb: [number, number, number]) => {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  return {
    backgroundColor: `rgba(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${0.12 + ratio * 0.68})`,
  };
};

export const SignalVisualizationSuite = ({
  assessment,
  treasury,
  macroSeries,
  regimeSeries,
  summaryArchive,
  activeMetric,
  playbackIndex,
}: SignalVisualizationSuiteProps) => {
  const sortedArchive = [...summaryArchive].sort(
    (left, right) => parseDateUTC(left.asOf).getTime() - parseDateUTC(right.asOf).getTime(),
  );

  const weeklyArchive = sortedArchive.filter(
    (entry): entry is Extract<SummaryArchiveEntry, { cadence: "weekly" }> => entry.cadence === "weekly",
  );

  const monthlyArchive = sortedArchive.filter(
    (entry): entry is Extract<SummaryArchiveEntry, { cadence: "monthly" }> => entry.cadence === "monthly",
  );

  const monthlySeries: MonthlySeriesPoint[] = monthlyArchive.map((entry) => ({
    asOf: entry.asOf,
    regime: entry.summary.regime,
    baseRate: getInputValue(entry, "base-rate"),
    twoYear: getInputValue(entry, "two-year"),
    tenYear: getInputValue(entry, "ten-year"),
    curveSlope: getInputValue(entry, "curve-slope"),
    confidence: entry.summary.confidence,
    transitionWatch: entry.summary.transitionWatch,
  }));

  const playbackSeries = regimeSeries.slice(-24);
  const safePlaybackIndex = playbackSeries.length
    ? clamp(playbackIndex, 0, playbackSeries.length - 1)
    : 0;
  const selectedPlayback = playbackSeries[safePlaybackIndex] ?? null;
  const selectedPlaybackLabel = selectedPlayback
    ? `${String(selectedPlayback.month).padStart(2, "0")}/${selectedPlayback.year}`
    : "latest month";

  const playbackEntries = playbackSeries.map((entry) => ({
    label: `${String(entry.month).padStart(2, "0")}/${entry.year}`,
    regime: regimeLabel[entry.regime],
  }));

  const activeMetricValue =
    activeMetric === "tightness"
      ? assessment.scores.tightness
      : activeMetric === "risk"
        ? assessment.scores.riskAppetite
        : assessment.scores.curveSlope;

  const activeMetricThreshold =
    activeMetric === "tightness"
      ? assessment.thresholds.tightnessRegime
      : activeMetric === "risk"
        ? assessment.thresholds.riskAppetiteRegime
        : 0;

  const activeMetricUnit = activeMetric === "curve" ? "%" : "/100";
  const activeMetricLabel =
    activeMetric === "tightness"
      ? "Tightness"
      : activeMetric === "risk"
        ? "Risk appetite"
        : "Curve slope";

  const thresholdDistance =
    activeMetricValue === null ? null : Math.abs(activeMetricValue - activeMetricThreshold);
  const uncertaintyBand = activeMetric === "curve" ? 0.5 : 8;
  const uncertaintyScore =
    thresholdDistance === null
      ? 50
      : clamp(Math.round((1 - Math.min(thresholdDistance / uncertaintyBand, 1)) * 100), 0, 100);
  const uncertaintyLabel =
    uncertaintyScore >= 70 ? "High" : uncertaintyScore >= 40 ? "Medium" : "Low";

  const weeklyYears = Array.from(new Set(weeklyArchive.map((entry) => entry.year))).sort(
    (left, right) => left - right,
  );

  const weeklyRegimeMap = new Map(
    weeklyArchive.map((entry) => [`${entry.year}-${entry.week}`, entry.summary.regime] as const),
  );

  const monthlyRuns = buildRegimeRuns(monthlySeries);
  const longestRun = monthlyRuns.reduce<RegimeRun | null>((longest, run) => {
    if (!longest || run.count > longest.count) {
      return run;
    }
    return longest;
  }, null);
  const maxRunLength = Math.max(...monthlyRuns.map((run) => run.count), 1);
  const runWindow = monthlyRuns.slice(-12);

  const transitionMatrix: Record<RegimeKey, Record<RegimeKey, number>> = {
    SCARCITY: { SCARCITY: 0, DEFENSIVE: 0, VOLATILE: 0, EXPANSION: 0 },
    DEFENSIVE: { SCARCITY: 0, DEFENSIVE: 0, VOLATILE: 0, EXPANSION: 0 },
    VOLATILE: { SCARCITY: 0, DEFENSIVE: 0, VOLATILE: 0, EXPANSION: 0 },
    EXPANSION: { SCARCITY: 0, DEFENSIVE: 0, VOLATILE: 0, EXPANSION: 0 },
  };

  for (let index = 1; index < monthlySeries.length; index += 1) {
    const previous = monthlySeries[index - 1];
    const current = monthlySeries[index];
    transitionMatrix[previous.regime][current.regime] += 1;
  }

  const transitionValues = Object.values(transitionMatrix).flatMap((row) => Object.values(row));
  const maxTransitionCount = Math.max(...transitionValues, 1);
  const changedTransitions = Object.entries(transitionMatrix).reduce((total, [from, row]) => {
    return (
      total +
      Object.entries(row).reduce((rowTotal, [to, value]) => {
        return rowTotal + (from === to ? 0 : value);
      }, 0)
    );
  }, 0);

  const phasePoints = monthlySeries.filter(
    (point): point is MonthlySeriesPoint & { baseRate: number; curveSlope: number } =>
      typeof point.baseRate === "number" && typeof point.curveSlope === "number",
  );

  const phaseXMin = Math.min(...phasePoints.map((point) => point.baseRate), assessment.thresholds.baseRateTightness);
  const phaseXMax = Math.max(...phasePoints.map((point) => point.baseRate), assessment.thresholds.baseRateTightness);
  const phaseYMin = Math.min(...phasePoints.map((point) => point.curveSlope), 0);
  const phaseYMax = Math.max(...phasePoints.map((point) => point.curveSlope), 0);
  const phaseWidth = 100;
  const phaseHeight = 70;
  const phasePadding = 8;
  const phaseScaleX = (value: number) => {
    const range = phaseXMax - phaseXMin || 1;
    return phasePadding + ((value - phaseXMin) / range) * (phaseWidth - phasePadding * 2);
  };
  const phaseScaleY = (value: number) => {
    const range = phaseYMax - phaseYMin || 1;
    return phaseHeight - phasePadding - ((value - phaseYMin) / range) * (phaseHeight - phasePadding * 2);
  };
  const phasePath = phasePoints
    .map((point, index) => {
      const x = phaseScaleX(point.baseRate);
      const y = phaseScaleY(point.curveSlope);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const thresholdWindow = monthlySeries.slice(-36);
  const baseValues = thresholdWindow.map((point) => point.baseRate);
  const curveValues = thresholdWindow.map((point) => point.curveSlope);
  const numericBase = baseValues.filter((value): value is number => typeof value === "number");
  const numericCurve = curveValues.filter((value): value is number => typeof value === "number");

  const baseMin = Math.min(...numericBase, assessment.thresholds.baseRateTightness) - 0.2;
  const baseMax = Math.max(...numericBase, assessment.thresholds.baseRateTightness) + 0.2;
  const curveMin = Math.min(...numericCurve, 0) - 0.1;
  const curveMax = Math.max(...numericCurve, 0) + 0.1;

  const baseThresholdY = getScaledY(assessment.thresholds.baseRateTightness, baseMin, baseMax, 28);
  const curveThresholdY = getScaledY(0, curveMin, curveMax, 28);

  const distributionMetrics = [
    { key: "baseRate", label: "Base rate", unit: "%" },
    { key: "curveSlope", label: "Curve slope", unit: "%" },
  ] as const;

  const distributionRows = distributionMetrics.map((metric) => {
    const metricValues = monthlySeries
      .map((point) => point[metric.key])
      .filter((value): value is number => typeof value === "number");

    const min = Math.min(...metricValues);
    const max = Math.max(...metricValues);

    return {
      ...metric,
      min,
      max,
      regimes: (["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as RegimeKey[]).map((regime) => {
        const values = monthlySeries
          .filter((point) => point.regime === regime)
          .map((point) => point[metric.key])
          .filter((value): value is number => typeof value === "number");

        return {
          regime,
          summary: buildFiveNumberSummary(values),
        };
      }),
    };
  });

  const confidenceWindow = monthlySeries.slice(-52);
  const transitionWatchCount = confidenceWindow.filter((point) => point.transitionWatch).length;

  return (
    <section id="visual-diagnostics" className="weather-panel space-y-5 px-6 py-5" aria-labelledby="visual-diagnostics-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.22em] text-slate-300">Visual diagnostics</p>
        <h2 id="visual-diagnostics-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
          Eight visualization candidates for signal interpretation.
        </h2>
      </header>

      <details className="weather-surface group p-4">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-100">
          <span>Open all visualization candidates</span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-open:rotate-180">
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </span>
        </summary>

        <p className="mt-2 text-xs text-slate-300">
          Use this board to compare chart utility side-by-side before we trim low-value visualizations.
        </p>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">Playback scrubber</p>
            <p className="text-sm text-slate-300">
              Scrub historical snapshots to replay regime posture changes. Selected replay: {selectedPlaybackLabel}.
            </p>
            <RegimePlaybackScrubber entries={playbackEntries} activeIndex={safePlaybackIndex} />
          </article>

          <article className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">Threshold uncertainty band</p>
            <p className="text-sm text-slate-300">
              Focus metric: {activeMetricLabel} ({activeMetricValue === null ? "N/A" : formatNumber(activeMetricValue)}{activeMetricUnit})
              against threshold {formatNumber(activeMetricThreshold)}{activeMetricUnit}.
            </p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400"
                style={{ width: `${uncertaintyScore}%` }}
                aria-label={`Uncertainty score ${uncertaintyScore}%`}
              />
            </div>
            <p className="text-xs text-slate-300">Uncertainty: {uncertaintyLabel}</p>
          </article>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article id="viz-regime-calendar-heatmap" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">1) Regime calendar heatmap</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <div className="min-w-[860px] space-y-2">
                {weeklyYears.map((year) => (
                  <div key={year} className="grid items-center gap-1" style={{ gridTemplateColumns: "46px repeat(53, minmax(10px, 1fr))" }}>
                    <p className="mono text-[11px] text-slate-300">{year}</p>
                    {Array.from({ length: 53 }, (_, weekOffset) => {
                      const week = weekOffset + 1;
                      const regime = weeklyRegimeMap.get(`${year}-${week}`);
                      return (
                        <span
                          key={`${year}-${week}`}
                          className={`h-4 rounded-sm ${regime ? regimeTone[regime] : "bg-slate-800/80"}`}
                          title={regime ? `${year} week ${week}: ${regimeLabel[regime]}` : `${year} week ${week}: no record`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Weekly archive coverage: {weeklyArchive.length} points across {weeklyYears.length} years.
            </p>
          </article>

          <article id="viz-regime-run-length" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">2) Regime run-length chart</p>
            <div className="mt-3 space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              {runWindow.map((run) => (
                <div key={`${run.start}-${run.regime}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{regimeLabel[run.regime]}</span>
                    <span className="mono">{run.count}m</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                    <div className={`h-full ${regimeTone[run.regime]}`} style={{ width: `${(run.count / maxRunLength) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {formatMonthShort(run.start)}-{formatMonthLabel(run.end)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-300">
              {monthlyRuns.length - 1} monthly regime changes; longest run: {longestRun ? `${regimeLabel[longestRun.regime]} (${longestRun.count} months)` : "n/a"}.
            </p>
          </article>

          <article id="viz-transition-matrix" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">3) Transition matrix</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2 pr-3">From / To</th>
                    {(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as RegimeKey[]).map((regime) => (
                      <th key={`head-${regime}`} className="pb-2 pr-2 text-center">{regimeLabel[regime]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as RegimeKey[]).map((from) => (
                    <tr key={from} className="border-t border-slate-800/80">
                      <th className="py-2 pr-3 text-left text-slate-200">{regimeLabel[from]}</th>
                      {(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as RegimeKey[]).map((to) => {
                        const value = transitionMatrix[from][to];
                        return (
                          <td key={`${from}-${to}`} className="px-1 py-1">
                            <span
                              className="inline-flex min-h-[32px] min-w-[56px] items-center justify-center rounded-md text-slate-100"
                              style={intensityStyle(value, maxTransitionCount, [56, 189, 248])}
                            >
                              {value}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-300">Monthly transitions captured: {changedTransitions} non-diagonal moves.</p>
          </article>

          <article id="viz-phase-space-scatter" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">4) Phase-space scatter (curve slope vs base rate)</p>
            <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <svg viewBox="0 0 100 70" className="h-56 w-full" role="img" aria-label="Monthly phase-space scatter">
                <rect x="0" y="0" width="100" height="70" fill="rgb(2 6 23)" />
                <line
                  x1={phaseScaleX(assessment.thresholds.baseRateTightness)}
                  y1="0"
                  x2={phaseScaleX(assessment.thresholds.baseRateTightness)}
                  y2="70"
                  stroke="rgb(148 163 184 / 0.5)"
                  strokeDasharray="2 2"
                />
                <line x1="0" y1={phaseScaleY(0)} x2="100" y2={phaseScaleY(0)} stroke="rgb(148 163 184 / 0.5)" strokeDasharray="2 2" />
                {phasePath ? <path d={phasePath} fill="none" stroke="rgb(148 163 184 / 0.4)" strokeWidth="0.9" /> : null}
                {phasePoints.map((point) => (
                  <circle
                    key={point.asOf}
                    cx={phaseScaleX(point.baseRate)}
                    cy={phaseScaleY(point.curveSlope)}
                    r="1.5"
                    fill={
                      point.regime === "SCARCITY"
                        ? "rgb(251 113 133)"
                        : point.regime === "DEFENSIVE"
                          ? "rgb(251 191 36)"
                          : point.regime === "VOLATILE"
                            ? "rgb(129 140 248)"
                            : "rgb(74 222 128)"
                    }
                  />
                ))}
                {phasePoints.length ? (
                  <circle
                    cx={phaseScaleX(phasePoints[phasePoints.length - 1].baseRate)}
                    cy={phaseScaleY(phasePoints[phasePoints.length - 1].curveSlope)}
                    r="2.4"
                    fill="none"
                    stroke="rgb(186 230 253)"
                    strokeWidth="1"
                  />
                ) : null}
              </svg>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              X axis: base rate (%). Y axis: curve slope (10Y-2Y). Path shows monthly progression.
            </p>
          </article>

          <article id="viz-threshold-band-timeline" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">5) Threshold band timeline</p>
            <div className="mt-3 space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <div>
                <p className="text-[11px] text-slate-300">Base rate vs tightness threshold ({assessment.thresholds.baseRateTightness.toFixed(2)}%)</p>
                <svg viewBox="0 0 100 28" className="mt-1 h-12 w-full" role="img" aria-label="Base rate threshold timeline">
                  <line x1="0" y1={baseThresholdY} x2="100" y2={baseThresholdY} stroke="rgb(251 191 36 / 0.8)" strokeDasharray="2 2" />
                  <path d={buildScaledPath(baseValues, 100, 28, baseMin, baseMax)} fill="none" stroke="rgb(56 189 248)" strokeWidth="1.7" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] text-slate-300">Curve slope vs inversion line (0.00%)</p>
                <svg viewBox="0 0 100 28" className="mt-1 h-12 w-full" role="img" aria-label="Curve slope threshold timeline">
                  <line x1="0" y1={curveThresholdY} x2="100" y2={curveThresholdY} stroke="rgb(251 191 36 / 0.8)" strokeDasharray="2 2" />
                  <path d={buildScaledPath(curveValues, 100, 28, curveMin, curveMax)} fill="none" stroke="rgb(129 140 248)" strokeWidth="1.7" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-300">Timeline window: latest {thresholdWindow.length} monthly points.</p>
          </article>

          <article id="viz-regime-distributions" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">6) Regime-conditioned distribution bands</p>
            <div className="mt-3 space-y-4 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              {distributionRows.map((metric) => {
                const range = metric.max - metric.min || 1;
                const scale = (value: number) => ((value - metric.min) / range) * 100;
                return (
                  <div key={metric.key} className="space-y-2">
                    <p className="text-[11px] text-slate-300">{metric.label} ({metric.unit})</p>
                    {metric.regimes.map((row) => {
                      if (!row.summary) {
                        return (
                          <div key={`${metric.key}-${row.regime}`} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-20">{regimeLabel[row.regime]}</span>
                            <span>No data</span>
                          </div>
                        );
                      }

                      return (
                        <div key={`${metric.key}-${row.regime}`} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-slate-300">{regimeLabel[row.regime]}</span>
                          <div className="relative h-4 flex-1 rounded bg-slate-900">
                            <span
                              className="absolute top-1/2 h-px -translate-y-1/2 bg-slate-400"
                              style={{ left: `${scale(row.summary.min)}%`, width: `${Math.max(scale(row.summary.max) - scale(row.summary.min), 1)}%` }}
                            />
                            <span
                              className={`absolute top-0 h-4 rounded ${regimeTone[row.regime]}`}
                              style={{
                                left: `${scale(row.summary.q1)}%`,
                                width: `${Math.max(scale(row.summary.q3) - scale(row.summary.q1), 2)}%`,
                              }}
                            />
                            <span
                              className="absolute top-0 h-4 w-px bg-slate-100"
                              style={{ left: `${scale(row.summary.median)}%` }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-300">Each band shows min/q1/median/q3/max for monthly points within a regime.</p>
          </article>

          <article id="viz-confidence-transition-watch" className="weather-surface p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">7) Confidence + transition-watch timeline</p>
            <div className="mt-3 space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
              <div>
                <p className="text-[11px] text-slate-300">Confidence</p>
                <div className="mt-1 flex min-h-[16px] overflow-hidden rounded-md border border-slate-800/80">
                  {confidenceWindow.map((point) => (
                    <span
                      key={`confidence-${point.asOf}`}
                      className={`min-w-[8px] flex-1 ${confidenceTone[point.confidence]}`}
                      title={`${formatMonthLabel(point.asOf)}: ${point.confidence}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-slate-300">Transition watch flags</p>
                <div className="mt-1 flex min-h-[16px] overflow-hidden rounded-md border border-slate-800/80">
                  {confidenceWindow.map((point) => (
                    <span
                      key={`watch-${point.asOf}`}
                      className={`min-w-[8px] flex-1 ${point.transitionWatch ? "bg-rose-400" : "bg-slate-800/80"}`}
                      title={`${formatMonthLabel(point.asOf)}: ${point.transitionWatch ? "watch" : "steady"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Window: {confidenceWindow.length} months; transition-watch hits: {transitionWatchCount}.
            </p>
          </article>

          <article id="viz-macro-small-multiples" className="weather-surface p-4 xl:col-span-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">8) Macro small-multiples dashboard</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {macroSeries.map((series) => {
                const values = (series.history ?? []).map((point) => point.value);
                const path = buildSparklinePath(values, 100, 30);
                const latest = series.history?.at(-1)?.value ?? series.value;
                const first = series.history?.[0]?.value ?? null;
                const delta =
                  typeof first === "number" && typeof latest === "number" ? latest - first : null;
                return (
                  <div key={series.id} className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-300">{series.label}</p>
                    <p className="mono mt-1 text-sm text-slate-100">{formatNumber(latest)}{series.unit}</p>
                    <p className={`text-[11px] ${delta === null ? "text-slate-500" : delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {delta === null ? "Delta n/a" : `Delta ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}${series.unit}`}
                    </p>
                    <svg viewBox="0 0 100 30" className="mt-2 h-12 w-full" role="img" aria-label={`${series.label} sparkline`}>
                      {path ? <path d={path} fill="none" stroke="rgb(56 189 248)" strokeWidth="1.8" /> : null}
                    </svg>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <p className="mt-4 text-xs text-slate-300">
          Risk threshold default: {RISK_APPETITE_REGIME_THRESHOLD}/100. Active threshold: {assessment.thresholds.riskAppetiteRegime}/100. Treasury 1M: {formatNumber(treasury.yields.oneMonth)}%.
        </p>
      </details>
    </section>
  );
};
