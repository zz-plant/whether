/**
 * Report section components for the Whether Report dashboard.
 * Keeps layout blocks focused and reusable across the Regime Station UI.
 */
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type { SensorReading, TreasuryData } from "../../lib/types";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : timestampFormatter.format(date);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : dateFormatter.format(date);
};

const formatNumber = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${numberFormatter.format(value)}${unit}`;
};

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const getRegimeLabel = (regime: RegimeAssessment["regime"]) => {
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

const getRegimeAccent = (regime: RegimeAssessment["regime"]) => {
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

export const RegimeAssessmentCard = ({ assessment }: { assessment: RegimeAssessment }) => {
  const regimeLabel = getRegimeLabel(assessment.regime);
  const regimeAccent = getRegimeAccent(assessment.regime);
  const hasWarnings = assessment.dataWarnings.length > 0;

  return (
    <section
      id="regime-assessment"
      aria-labelledby="regime-assessment-title"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 blur-2xl" />
      <div className={`absolute inset-0 bg-gradient-to-br ${regimeAccent.panel} opacity-40`} />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Regime</p>
          <h2 id="regime-assessment-title" className="text-3xl font-semibold text-slate-100">
            {regimeLabel}
          </h2>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Classified as {assessment.regime}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
          <span className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1">
            <span className={`h-2 w-2 rounded-full ${regimeAccent.dot}`} />
            Regime status
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1">
            Tightness{" "}
            <span className="tabular-nums">{assessment.scores.tightness}</span> · Risk{" "}
            <span className="tabular-nums">{assessment.scores.riskAppetite}</span>
          </span>
        </div>
      </div>
      <p className="relative mt-4 text-slate-200 break-words">{assessment.description}</p>
      <ul className="relative mt-4 space-y-2 text-sm text-slate-300">
        {assessment.constraints.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-500">•</span>
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
      {hasWarnings ? (
        <div className="relative mt-6 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Data quality flags</p>
          <ul className="mt-3 space-y-2">
            {assessment.dataWarnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span className="text-amber-200/80">•</span>
                <span className="break-words">{warning}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-amber-200/80">
            Scores may be less reliable when source fields are missing.
          </p>
        </div>
      ) : null}
      <div className="relative mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <p>{assessment.tightnessExplanation}</p>
        <p>{assessment.riskAppetiteExplanation}</p>
      </div>
    </section>
  );
};

export const LiveTickerPanel = ({
  treasury,
  assessment,
  modeLabel,
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
  modeLabel?: string;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";
  const statusLabel = modeLabel ?? (treasury.isLive ? "Live" : "Offline");

  return (
    <section
      id="live-ticker"
      aria-labelledby="live-ticker-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <div className="flex items-center justify-between">
        <h3 id="live-ticker-title" className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Live Ticker
        </h3>
        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">US 10Y Yield</span>
          <span className="mono text-slate-100">{formatNumber(treasury.yields.tenYear, "%")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">US 2Y Yield</span>
          <span className="mono text-slate-100">{formatNumber(treasury.yields.twoYear, "%")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Curve Slope</span>
          <span className="mono text-slate-100">
            {curveSlope === null ? "—" : formatNumber(curveSlope, "%")}
            <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-500">{curveLabel}</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Base Rate</span>
          <span className="mono text-slate-100">
            {formatNumber(assessment.scores.baseRate, "%")}
            <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              {assessment.scores.baseRateUsed}
            </span>
          </span>
        </div>
      </div>
      <div className="mt-4 text-xs text-slate-500">
        Source:{" "}
        <a
          href={treasury.source}
          target="_blank"
          rel="noreferrer"
          className="touch-target text-slate-300 underline decoration-slate-700 underline-offset-4 hover:text-slate-100"
          title={treasury.source}
        >
          Open source
        </a>
      </div>
    </section>
  );
};

export const ScoreReadoutPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  return (
    <section
      id="sensor-readout"
      aria-labelledby="sensor-readout-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <h3 id="sensor-readout-title" className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Sensor Readout
      </h3>
      <div className="mt-4 space-y-5">
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Capital Tightness</span>
            <span className="text-slate-200 tabular-nums">{assessment.scores.tightness}/100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-rose-500"
              style={{ width: `${assessment.scores.tightness}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Market Bravery</span>
            <span className="text-slate-200 tabular-nums">{assessment.scores.riskAppetite}/100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-amber-400"
              style={{ width: `${assessment.scores.riskAppetite}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export const SignalMatrixPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  const x = assessment.scores.riskAppetite;
  const y = assessment.scores.tightness;
  const top = `${100 - y}%`;
  const left = `${x}%`;

  return (
    <section
      id="signal-matrix"
      aria-labelledby="signal-matrix-title"
      aria-describedby="signal-matrix-description"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <div className="flex items-center justify-between">
        <h3
          id="signal-matrix-title"
          className="text-sm uppercase tracking-[0.2em] text-slate-400"
        >
          Signal Matrix
        </h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Tightness vs. Bravery</span>
      </div>
      <div className="relative mt-6 h-56 rounded-xl border border-slate-800 bg-slate-950/60">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-b border-r border-slate-800/80" />
          <div className="border-b border-slate-800/80" />
          <div className="border-r border-slate-800/80" />
          <div />
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-slate-700">
          MATRIX
        </div>
        <div
          className="absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-400 text-[8px] font-semibold text-slate-900 shadow-lg"
          style={{ top, left }}
        >
          +
        </div>
        <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Cautious
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Bold
        </div>
        <div className="absolute left-2 top-2 -rotate-90 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Tight
        </div>
        <div className="absolute right-2 top-2 -rotate-90 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Loose
        </div>
      </div>
      <p id="signal-matrix-description" className="mt-4 text-xs text-slate-500">
        Position is derived from tightness (<span className="tabular-nums">{assessment.scores.tightness}</span>)
        and market bravery (<span className="tabular-nums">{assessment.scores.riskAppetite}</span>).
      </p>
    </section>
  );
};

export const DataSourcePanel = ({ treasury }: { treasury: TreasuryData }) => {
  return (
    <section
      id="data-source"
      aria-labelledby="data-source-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
    >
      <h3 id="data-source-title" className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Data Source
      </h3>
      <p className="mt-2 text-sm text-slate-200">US Treasury Fiscal Data API</p>
      <p className="mt-4 text-xs text-slate-400">Record date</p>
      <p className="mono text-sm text-slate-200">{formatDate(treasury.record_date)}</p>
      <p className="mt-4 text-xs text-slate-400">Fetched at</p>
      <p className="mono text-sm text-slate-200">{formatTimestamp(treasury.fetched_at)}</p>
      <a
        href={treasury.source}
        target="_blank"
        rel="noreferrer"
        className="touch-target mt-4 break-all text-xs text-slate-400 underline decoration-slate-700 underline-offset-4 hover:text-slate-200"
      >
        {treasury.source}
      </a>
    </section>
  );
};

export const HistoricalBanner = ({ banner }: { banner: string }) => {
  return (
    <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Time Machine</span>
      <p className="mt-1">{banner}</p>
    </div>
  );
};

export const ExecutiveSnapshotPanel = ({
  treasury,
  assessment,
  modeLabel,
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
  modeLabel: string;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";

  return (
    <section id="executive-snapshot" aria-labelledby="executive-snapshot-title" className="mt-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Executive snapshot</p>
            <h3 id="executive-snapshot-title" className="text-xl font-semibold text-slate-100">
              Operational pulse
            </h3>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
            {modeLabel}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data freshness</p>
            <p className="mono mt-2 text-sm text-slate-100">{treasury.record_date}</p>
            <p className="mt-2 text-xs text-slate-500">Fetched {formatTimestamp(treasury.fetched_at)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rate baseline</p>
            <p className="mono mt-2 text-sm text-slate-100">
              {formatNumber(assessment.scores.baseRate, "%")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Using {assessment.scores.baseRateUsed} for policy anchor
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Curve signal</p>
            <p className="mono mt-2 text-sm text-slate-100">
              {curveSlope === null ? "—" : `${curveSlope.toFixed(2)}%`}
            </p>
            <p className="mt-2 text-xs text-slate-500">Slope is {curveLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TimeMachinePanel = ({
  selectedYear,
  selectedMonth,
  years,
  isHistorical,
  latestRecordDate,
  cacheCoverage,
  monthsByYear,
  invalidSelection,
}: {
  selectedYear: number;
  selectedMonth: number;
  years: number[];
  isHistorical: boolean;
  latestRecordDate: string;
  cacheCoverage: { earliest: string | null; latest: string | null };
  monthsByYear: Record<number, number[]>;
  invalidSelection: boolean;
}) => {
  const availableMonths = monthsByYear[selectedYear] ?? [];
  const resolvedSelectedMonth =
    availableMonths.length > 0 && !availableMonths.includes(selectedMonth)
      ? availableMonths[0]
      : selectedMonth;
  const coverageLabel =
    cacheCoverage.earliest && cacheCoverage.latest
      ? `${formatDate(cacheCoverage.earliest)} → ${formatDate(cacheCoverage.latest)}`
      : "No cache loaded";
  const latestRecordLabel = formatDate(latestRecordDate);

  return (
    <section id="time-machine" aria-labelledby="time-machine-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Time Machine</p>
            <h3 id="time-machine-title" className="text-xl font-semibold text-slate-100">
              Replay a prior regime
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Pull the latest available Treasury record on or before a chosen month to see the
              historical regime.
            </p>
          </div>
          {isHistorical ? (
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100"
            >
              Exit historical view
            </a>
          ) : null}
        </div>

        <form method="GET" className="mt-6 grid gap-4 md:grid-cols-[1fr,1fr,auto]">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Month
            <select
              name="month"
              defaultValue={resolvedSelectedMonth}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {monthOptions.map((option) => {
                const isUnavailable =
                  availableMonths.length > 0 && !availableMonths.includes(option.value);
                return (
                  <option key={option.value} value={option.value} disabled={isUnavailable}>
                    {option.label}
                    {isUnavailable ? " (not available)" : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            Year
            <select
              name="year"
              defaultValue={selectedYear}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-base text-slate-100 transition-colors hover:border-slate-700"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            Load snapshot
          </button>
        </form>
        {invalidSelection ? (
          <p className="mt-4 text-xs text-amber-200" role="status" aria-live="polite">
            That month is not available in the cache. Showing the latest data instead.
          </p>
        ) : null}
        <p className="mt-4 text-xs text-slate-500">
          Latest available record: <span className="mono text-slate-300">{latestRecordLabel}</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Cache coverage: <span className="mono text-slate-300">{coverageLabel}</span>
        </p>
      </div>
    </section>
  );
};

export const SensorArray = ({ sensors }: { sensors: SensorReading[] }) => {
  return (
    <section id="sensor-array" aria-labelledby="sensor-array-title" className="mt-10">
      <h3 id="sensor-array-title" className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Live Sensor Array
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-300 break-words">{sensor.label}</p>
                <p className="mono mt-2 text-2xl text-slate-100">
                  {formatNumber(sensor.value, sensor.unit)}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {sensor.isLive ? "Live" : "Offline"}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400 break-words">{sensor.explanation}</p>
            <div className="mt-4 text-xs text-slate-500">
              <p className="break-words">Source: {sensor.source}</p>
              <p>Record date: {formatDate(sensor.record_date)}</p>
              <p>Fetched: {formatTimestamp(sensor.fetched_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const PlaybookPanel = ({
  playbook,
  stopItems,
  startItems,
  fenceItems,
}: {
  playbook: PlaybookEntry | null;
  stopItems: string[];
  startItems: string[];
  fenceItems: string[];
}) => {
  return (
    <section id="playbook" aria-labelledby="playbook-title" className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Playbook</p>
            <h3 id="playbook-title" className="text-xl font-semibold">
              {playbook?.title ?? "Operational Guidance"}
            </h3>
            {playbook ? (
              <p className="mt-2 text-sm text-slate-300 break-words">{playbook.insight}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-300">
                Playbook data unavailable. Use regime constraints as guardrails.
              </p>
            )}
          </div>
          {playbook ? (
            <div className="text-right text-xs text-slate-400">
              <p>{playbook.tone}</p>
              <p className="mt-1 text-slate-300">Mandate: {playbook.mandate}</p>
              <p className="mt-1 text-slate-500">Metric: {playbook.metric}</p>
            </div>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stop</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {stopItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {startItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fence</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {fenceItems.map((item) => (
                <li key={item} className="break-words">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {playbook ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Leadership signals</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                  More often
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {playbook.leadershipPhrases.more.map((item) => (
                    <li key={item} className="break-words">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-rose-200">Less often</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {playbook.leadershipPhrases.less.map((item) => (
                    <li key={item} className="break-words">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};
