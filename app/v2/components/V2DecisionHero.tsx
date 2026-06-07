import type { OperatorContext } from "../../../lib/report/operatorContext";
import type { WeeklyLeadershipSummary } from "../../../lib/report/homeBriefModel";
import type { SignalDirection } from "../viewModel";
import { REGIME_DISPLAY } from "../viewModel";
import { SignalWaterfall } from "./SignalWaterfall";
import { StageSwitcher } from "./StageSwitcher";

type Props = {
  tightness: number;
  tightnessDelta: number;
  regime: string;
  postureLabel: string;
  signalDirection: SignalDirection;
  recordDate: string;
  fetchedAt: string;
  operatorContext: OperatorContext;
  confidenceLabel?: string;
  weeklyLeadershipSummary: WeeklyLeadershipSummary;
  signalData?: {
    baseRate?: number | null;
    baseRateUsed?: string;
    curveSlope?: number | null;
    macroContributors?: string[];
    tightnessThreshold?: number;
  };
};

const formatSignedInteger = (value: number) =>
  value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;

const normalizeShorthand = (line: string, notchShiftLabel: string) => {
  if (line.toLowerCase().includes("bold this week")) {
    return line.replace(/^We're/, "We’re");
  }

  return `We’re ${notchShiftLabel} bold this week.`;
};

const buildDriverChips = ({
  tightnessDelta,
  signalData,
}: {
  tightnessDelta: number;
  signalData?: Props["signalData"];
}) => {
  const riskDriver = signalData?.macroContributors?.find((driver) => driver.toLowerCase().includes("risk"));
  const curveStable = Math.abs(signalData?.curveSlope ?? 0) < 0.1;

  return [
    riskDriver ?? "Risk appetite unchanged",
    tightnessDelta === 0 ? "Tightness unchanged" : `Tightness ${formatSignedInteger(tightnessDelta)}`,
    curveStable ? "Curve stable" : "Curve moving",
  ].slice(0, 3);
};

export function V2DecisionHero({
  tightness,
  tightnessDelta,
  regime,
  postureLabel,
  recordDate,
  fetchedAt,
  operatorContext,
  confidenceLabel,
  weeklyLeadershipSummary,
  signalData,
}: Props) {
  const regimeDisplay = REGIME_DISPLAY[regime] ?? regime;
  const shorthand = normalizeShorthand(weeklyLeadershipSummary.shorthandLine, weeklyLeadershipSummary.notchShiftLabel);
  const stabilityBand = weeklyLeadershipSummary.stabilityWeeks >= 4 ? "High" : weeklyLeadershipSummary.stabilityWeeks >= 2 ? "Moderate" : "Low";
  const stabilityLabel = `${stabilityBand} (Week ${weeklyLeadershipSummary.stabilityWeeks})`;
  const driverChips = buildDriverChips({ tightnessDelta, signalData });
  const stageLabel = operatorContext.companyStage
    ? operatorContext.companyStage === "pre-seed" ? "Pre-seed"
    : operatorContext.companyStage === "seed" ? "Seed"
    : operatorContext.companyStage === "series-a" ? "Series A"
    : operatorContext.companyStage === "series-b-plus" ? "Series B+"
    : "Public"
    : null;

  return (
    <section className="weather-surface rounded-2xl border border-white/[0.06] p-5 sm:p-6 lg:col-span-12" aria-labelledby="this-week-heading">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-fluid-nano font-semibold tracking-[0.18em] text-sky-200/80" id="this-week-heading">
                THIS WEEK
              </p>
              <p className="mt-1 text-fluid-micro text-white/35">{recordDate} · {regimeDisplay}{stageLabel ? ` · ${stageLabel}` : ""}</p>
            </div>
            <StageSwitcher currentStage={operatorContext.companyStage} />
          </div>

          <div className="grid gap-2 text-fluid-xs sm:grid-cols-2 lg:grid-cols-3">
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Boldness budget:</span> <strong className="text-white">{weeklyLeadershipSummary.notchShiftLabel}</strong>
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Hiring window:</span> <strong className="text-white">{weeklyLeadershipSummary.hiringWindow}</strong>
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Expansion window:</span> <strong className="text-white">{weeklyLeadershipSummary.expansionWindow}</strong>
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Raise window:</span> <strong className="text-white">{weeklyLeadershipSummary.raiseWindow}</strong>
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Stability:</span> <strong className="text-white">{stabilityLabel}</strong>
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-white/75">
              <span className="text-white/40">Net delta:</span> <strong className="text-white">{weeklyLeadershipSummary.netDeltaLabel}</strong>
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 space-y-3 lg:w-72">
          <SignalWaterfall data={signalData ?? {}}>
            <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <p className="text-fluid-nano font-semibold tracking-[0.14em] text-sky-200/70">Boldness Budget: {weeklyLeadershipSummary.boldnessScore} / 100</p>
              <p className="mt-2 font-display text-5xl font-bold leading-none text-white tabular-nums">
                {weeklyLeadershipSummary.boldnessScore} <span className="text-xl text-white/35">/ 100</span>
              </p>
              <p className="mt-2 text-fluid-xs text-white/55">Change: <strong className="text-white">{formatSignedInteger(weeklyLeadershipSummary.boldnessDelta)}</strong></p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {driverChips.map((driver) => (
                  <span key={driver} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-fluid-nano text-white/55">
                    {driver}
                  </span>
                ))}
              </div>
            </div>
          </SignalWaterfall>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3">
        <p className="text-fluid-nano font-semibold tracking-[0.14em] text-emerald-200/70">spoken shorthand</p>
        <p className="mt-1 text-lg font-semibold text-white">{shorthand}</p>
        {postureLabel ? <p className="mt-1 text-fluid-micro text-white/40">Baseline posture: {postureLabel}.</p> : null}
      </div>
      {fetchedAt ? <p className="mt-3 text-fluid-nano text-white/25">Updated {fetchedAt}</p> : null}
    </section>
  );
}
