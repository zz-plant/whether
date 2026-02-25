import type { MacroSeriesReading, SensorReading, TreasuryData } from "../../../lib/types";
import type { RegimeAssessment, RegimeKey } from "../../../lib/regimeEngine";
import type { TimeMachineRegimeEntry } from "../../../lib/timeMachine/timeMachineCache";
import {
  RISK_APPETITE_REGIME_THRESHOLD,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_INVERSION_POINTS,
} from "../../../lib/regimeEngine";
import { sensorTimeWindows } from "../../../lib/sensors";

type SignalVisualizationSuiteProps = {
  assessment: RegimeAssessment;
  treasury: TreasuryData;
  macroSeries: MacroSeriesReading[];
  sensors: SensorReading[];
  regimeSeries: TimeMachineRegimeEntry[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

const formatNumber = (value: number | null, decimals = 2) => {
  if (value === null) {
    return "N/A";
  }
  return value.toFixed(decimals);
};

const regimeTone: Record<RegimeKey, string> = {
  SCARCITY: "bg-rose-400/80",
  DEFENSIVE: "bg-amber-400/80",
  VOLATILE: "bg-indigo-400/80",
  EXPANSION: "bg-emerald-400/80",
};

const regimeLabel: Record<RegimeKey, string> = {
  SCARCITY: "Scarcity",
  DEFENSIVE: "Defensive",
  VOLATILE: "Volatile",
  EXPANSION: "Expansion",
};

const slopeTone = (value: number | null) => {
  if (value === null) {
    return "bg-slate-500";
  }
  if (value < 0) {
    return "bg-rose-400";
  }
  if (value < 0.5) {
    return "bg-amber-400";
  }
  return "bg-emerald-400";
};

export const SignalVisualizationSuite = ({
  assessment,
  treasury,
  macroSeries,
  sensors,
  regimeSeries,
}: SignalVisualizationSuiteProps) => {
  const quadrantX = clamp(assessment.scores.riskAppetite, 0, 100);
  const quadrantY = clamp(assessment.scores.tightness, 0, 100);
  const riskThreshold = clamp(assessment.thresholds.riskAppetiteRegime, 0, 100);
  const tightThreshold = clamp(assessment.thresholds.tightnessRegime, 0, 100);

  const baseRatePoints = clamp(
    Math.round((assessment.scores.baseRate - assessment.thresholds.baseRateTightness) * 180),
    0,
    TIGHTNESS_BASE_RATE_POINTS,
  );
  const inversionPoints =
    assessment.scores.curveSlope !== null && assessment.scores.curveSlope < 0
      ? clamp(Math.round(Math.abs(assessment.scores.curveSlope) * 50), 0, TIGHTNESS_INVERSION_POINTS)
      : 0;

  const yieldPoints = [
    { label: "1M", value: treasury.yields.oneMonth },
    { label: "3M", value: treasury.yields.threeMonth ?? null },
    { label: "2Y", value: treasury.yields.twoYear },
    { label: "10Y", value: treasury.yields.tenYear },
  ];
  const numericYieldValues = yieldPoints
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number");
  const yieldMin = numericYieldValues.length ? Math.min(...numericYieldValues) : 0;
  const yieldMax = numericYieldValues.length ? Math.max(...numericYieldValues) : 1;
  const yieldRange = yieldMax - yieldMin || 1;

  const timelineSeries = regimeSeries.slice(-12);

  return (
    <section id="visual-diagnostics" className="weather-panel space-y-5 px-6 py-5" aria-labelledby="visual-diagnostics-title">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Visual diagnostics</p>
        <h2 id="visual-diagnostics-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
          Six visualizations for rapid signal interpretation.
        </h2>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">1) Regime quadrant</p>
          <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
            <svg viewBox="0 0 100 100" className="h-56 w-full" role="img" aria-label="Regime quadrant by risk appetite and tightness">
              <rect x="0" y="0" width="100" height="100" fill="rgb(2 6 23)" />
              <line x1={riskThreshold} y1="0" x2={riskThreshold} y2="100" stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
              <line x1="0" y1={100 - tightThreshold} x2="100" y2={100 - tightThreshold} stroke="rgb(148 163 184 / 0.6)" strokeDasharray="2 2" />
              <circle cx={quadrantX} cy={100 - quadrantY} r="3" fill="rgb(125 211 252)" />
              <text x="2" y="8" fontSize="5" fill="rgb(226 232 240)">SCARCITY</text>
              <text x="62" y="8" fontSize="5" fill="rgb(226 232 240)">DEFENSIVE</text>
              <text x="2" y="98" fontSize="5" fill="rgb(226 232 240)">VOLATILE</text>
              <text x="64" y="98" fontSize="5" fill="rgb(226 232 240)">EXPANSION</text>
            </svg>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Current point: Tightness {assessment.scores.tightness}/100 · Risk appetite {assessment.scores.riskAppetite}/100.
          </p>
        </article>

        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">2) Yield curve + slope indicator</p>
          <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
            <div className="h-36 w-full">
              <svg viewBox="0 0 100 40" className="h-full w-full" role="img" aria-label="Yield curve snapshot">
                {yieldPoints.map((point, index) => {
                  if (point.value === null) {
                    return null;
                  }
                  const x = (index / Math.max(yieldPoints.length - 1, 1)) * 100;
                  const y = 35 - ((point.value - yieldMin) / yieldRange) * 30;
                  const next = yieldPoints[index + 1];
                  const nextValue = next?.value ?? null;
                  const nextX = ((index + 1) / Math.max(yieldPoints.length - 1, 1)) * 100;
                  const nextY =
                    typeof nextValue === "number" ? 35 - ((nextValue - yieldMin) / yieldRange) * 30 : null;
                  return (
                    <g key={point.label}>
                      {nextY !== null ? <line x1={x} y1={y} x2={nextX} y2={nextY} stroke="rgb(56 189 248)" strokeWidth="1.5" /> : null}
                      <circle cx={x} cy={y} r="1.7" fill="rgb(125 211 252)" />
                      <text x={x} y="39" textAnchor="middle" fontSize="3.8" fill="rgb(148 163 184)">{point.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Curve slope (10Y−2Y):</span>
              <span className="mono text-sm text-slate-100">{formatNumber(assessment.scores.curveSlope)}%</span>
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${slopeTone(assessment.scores.curveSlope)}`} aria-hidden="true" />
            </div>
          </div>
        </article>

        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">3) Tightness decomposition</p>
          <div className="mt-3 space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-900">
              <div className="flex h-full">
                <div
                  className="bg-indigo-400"
                  style={{ width: `${(baseRatePoints / 100) * 100}%` }}
                  aria-label="Base rate contribution"
                />
                <div
                  className="bg-rose-400"
                  style={{ width: `${(inversionPoints / 100) * 100}%` }}
                  aria-label="Inversion contribution"
                />
              </div>
            </div>
            <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">Base rate points</dt>
                <dd className="mono text-slate-100">{baseRatePoints}/90</dd>
              </div>
              <div>
                <dt className="text-slate-500">Inversion points</dt>
                <dd className="mono text-slate-100">{inversionPoints}/25</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total tightness</dt>
                <dd className="mono text-slate-100">{assessment.scores.tightness}/100</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">4) Macro signal sparklines</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {macroSeries.map((series) => {
              const values = (series.history ?? []).map((point) => point.value);
              const path = buildSparklinePath(values, 100, 28);
              const latest = series.history?.at(-1)?.value ?? series.value;
              return (
                <div key={series.id} className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-300">{series.label}</p>
                  <p className="mono mt-1 text-sm text-slate-100">{formatNumber(latest)}{series.unit}</p>
                  <svg viewBox="0 0 100 28" className="mt-2 h-12 w-full" role="img" aria-label={`${series.label} trend`}>
                    {path ? <path d={path} fill="none" stroke="rgb(56 189 248)" strokeWidth="1.8" /> : null}
                  </svg>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">5) Sensor delta heatmap</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-2 pr-3">Sensor</th>
                  {sensorTimeWindows.map((window) => (
                    <th key={window.id} className="pb-2 pr-3">{window.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.id} className="border-t border-slate-800/80">
                    <th className="py-2 pr-3 text-left font-medium text-slate-200">{sensor.label}</th>
                    {sensorTimeWindows.map((window) => {
                      const value = sensor.timeWindows?.find((entry) => entry.window === window.id)?.change ?? null;
                      const tone =
                        value === null
                          ? "bg-slate-800/80 text-slate-400"
                          : value > 0
                            ? "bg-rose-500/25 text-rose-200"
                            : value < 0
                              ? "bg-emerald-500/25 text-emerald-200"
                              : "bg-slate-700/70 text-slate-100";
                      return (
                        <td key={window.id} className="py-2 pr-3">
                          <span className={`inline-flex min-h-[32px] min-w-[56px] items-center justify-center rounded-md px-2 ${tone}`}>
                            {value === null ? "n/a" : `${value > 0 ? "+" : ""}${value.toFixed(2)}`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400">6) Time Machine regime timeline</p>
          <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
            <div className="flex min-h-[44px] items-stretch overflow-hidden rounded-lg border border-slate-800/80">
              {timelineSeries.length ? (
                timelineSeries.map((entry) => (
                  <div
                    key={`${entry.year}-${entry.month}`}
                    className={`group relative flex-1 ${regimeTone[entry.regime]}`}
                    title={`${entry.month}/${entry.year}: ${regimeLabel[entry.regime]}`}
                    aria-label={`${entry.month}/${entry.year}: ${regimeLabel[entry.regime]}`}
                  >
                    <span className="sr-only">{entry.month}/{entry.year} {regimeLabel[entry.regime]}</span>
                  </div>
                ))
              ) : (
                <div className="flex-1 bg-slate-800/80" />
              )}
            </div>
            <p className="mt-2 text-xs text-slate-300">
              Last {timelineSeries.length || 0} cached months with monthly regime color encoding.
            </p>
          </div>
        </article>
      </div>

      <p className="text-xs text-slate-400">
        Risk threshold default: {RISK_APPETITE_REGIME_THRESHOLD}/100. Active threshold: {assessment.thresholds.riskAppetiteRegime}/100.
      </p>
    </section>
  );
};
