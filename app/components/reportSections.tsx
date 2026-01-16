/**
 * Report section components for the Whether Report dashboard.
 * Keeps layout blocks focused and reusable across the Regime Station UI.
 */
import type { RegimeAssessment } from "../../lib/regimeEngine";
import type { PlaybookEntry } from "../../lib/playbook";
import type { SensorReading, TreasuryData } from "../../lib/types";

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : date.toUTCString();
};

const formatNumber = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)}${unit}`;
};

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 blur-2xl" />
      <div className={`absolute inset-0 bg-gradient-to-br ${regimeAccent.panel} opacity-40`} />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Regime</p>
          <h2 className="text-3xl font-semibold text-slate-100">{regimeLabel}</h2>
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
            Tightness {assessment.scores.tightness} · Risk {assessment.scores.riskAppetite}
          </span>
        </div>
      </div>
      <p className="relative mt-4 text-slate-200">{assessment.description}</p>
      <ul className="relative mt-4 space-y-2 text-sm text-slate-300">
        {assessment.constraints.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-slate-500">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="relative mt-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        <p>{assessment.tightnessExplanation}</p>
        <p>{assessment.riskAppetiteExplanation}</p>
      </div>
    </div>
  );
};

export const LiveTickerPanel = ({
  treasury,
  assessment,
}: {
  treasury: TreasuryData;
  assessment: RegimeAssessment;
}) => {
  const curveSlope = assessment.scores.curveSlope;
  const curveLabel = curveSlope === null ? "—" : curveSlope < 0 ? "Inverted" : "Normal";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Live Ticker</h3>
        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {treasury.isLive ? "Live" : "Offline"}
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
            {curveSlope === null ? "—" : `${curveSlope.toFixed(2)}%`}
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
      <div className="mt-4 text-xs text-slate-500">Source: {treasury.source}</div>
    </div>
  );
};

export const ScoreReadoutPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Sensor Readout</h3>
      <div className="mt-4 space-y-5">
        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>Capital Tightness</span>
            <span className="text-slate-200">{assessment.scores.tightness}/100</span>
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
            <span className="text-slate-200">{assessment.scores.riskAppetite}/100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-amber-400"
              style={{ width: `${assessment.scores.riskAppetite}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const SignalMatrixPanel = ({ assessment }: { assessment: RegimeAssessment }) => {
  const x = assessment.scores.riskAppetite;
  const y = assessment.scores.tightness;
  const top = `${100 - y}%`;
  const left = `${x}%`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Signal Matrix</h3>
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
      <p className="mt-4 text-xs text-slate-500">
        Position is derived from tightness ({assessment.scores.tightness}) and market bravery (
        {assessment.scores.riskAppetite}).
      </p>
    </div>
  );
};

export const DataSourcePanel = ({ treasury }: { treasury: TreasuryData }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Data Source</h3>
      <p className="mt-2 text-sm text-slate-200">US Treasury Fiscal Data API</p>
      <p className="mt-4 text-xs text-slate-400">Record date</p>
      <p className="mono text-sm text-slate-200">{treasury.record_date}</p>
      <p className="mt-4 text-xs text-slate-400">Fetched at</p>
      <p className="mono text-sm text-slate-200">{formatTimestamp(treasury.fetched_at)}</p>
      <p className="mt-4 break-all text-xs text-slate-500">{treasury.source}</p>
    </div>
  );
};

export const SensorArray = ({ sensors }: { sensors: SensorReading[] }) => {
  return (
    <section className="mt-10">
      <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">Live Sensor Array</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">{sensor.label}</p>
                <p className="mono mt-2 text-2xl text-slate-100">
                  {formatNumber(sensor.value, sensor.unit)}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {sensor.isLive ? "Live" : "Offline"}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">{sensor.explanation}</p>
            <div className="mt-4 text-xs text-slate-500">
              <p>Source: {sensor.source}</p>
              <p>Record date: {sensor.record_date}</p>
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
    <section className="mt-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Playbook</p>
            <h3 className="text-xl font-semibold">{playbook?.title ?? "Operational Guidance"}</h3>
            {playbook ? (
              <p className="mt-2 text-sm text-slate-300">{playbook.insight}</p>
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
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {startItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fence</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {fenceItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
