import type { OperatorContext } from "../../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { DeltaBadge } from "./DeltaBadge";
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
  signalData?: {
    baseRate?: number | null;
    baseRateUsed?: string;
    curveSlope?: number | null;
    macroContributors?: string[];
    tightnessThreshold?: number;
  };
};

export function V2DecisionHero({
  tightness,
  tightnessDelta,
  regime,
  postureLabel,
  signalDirection,
  recordDate,
  fetchedAt,
  operatorContext,
  confidenceLabel,
  signalData,
}: Props) {
  const regimeDisplay = REGIME_DISPLAY[regime] ?? regime;
  const deltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const deltaLabel = tightnessDelta !== 0 ? `${deltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";

  const tightnessLevel = tightness >= 75 ? "Elevated" : tightness >= 55 ? "Moderate" : "Low";
  const tightnessLevelColor = tightness >= 75 ? "text-rose-300/60" : tightness >= 55 ? "text-amber-300/60" : "text-emerald-300/60";
  const isUnusual = Math.abs(tightnessDelta) >= 3;

  const stageLabel = operatorContext.companyStage
    ? operatorContext.companyStage === "pre-seed" ? "Pre-seed"
    : operatorContext.companyStage === "seed" ? "Seed"
    : operatorContext.companyStage === "series-a" ? "Series A"
    : operatorContext.companyStage === "series-b-plus" ? "Series B+"
    : "Public"
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-10 w-full min-w-0">
        <div>
          <div className="relative inline-block">
            <svg className="absolute inset-0 w-full h-full -m-[14%]" viewBox="0 0 100 100" aria-hidden="true">
              {confidenceLabel ? (
                <circle
                  cx="50" cy="50" r="46"
                  fill="none"
                  stroke={confidenceLabel === "HIGH" ? "rgba(110,231,183,0.25)" : confidenceLabel === "MED" ? "rgba(252,211,77,0.25)" : "rgba(253,164,175,0.25)"}
                  strokeWidth="1.5"
                  strokeDasharray={confidenceLabel === "HIGH" ? "289 0" : confidenceLabel === "MED" ? "217 72" : "145 144"}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              ) : null}
            </svg>
            <SignalWaterfall data={signalData ?? {}}>
              <h1 className="font-display text-[clamp(4rem,12vw,6.5rem)] font-bold leading-none text-white tracking-[-0.02em] tabular-nums"
                style={{ textShadow: "0 0 80px rgba(255,255,255,0.06)" }}>
                <DeltaBadge tightness={tightness}>{tightness}</DeltaBadge>
              </h1>
            </SignalWaterfall>
          </div>
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/60">
            Credit conditions
            <span className={`ml-1.5 ${tightnessLevelColor}`}>{tightnessLevel}</span>
          </p>
        </div>
        <div className="text-fluid-xs text-white/50 space-y-0.5 w-full min-w-0">
          <p>
            <span className={DIRECTION_COLOR[signalDirection]}>
              {DIRECTION_LABEL[signalDirection]}
            </span>
            {tightnessDelta !== 0 ? (
              <span className={`ml-1.5 ${DIRECTION_COLOR[signalDirection]}`}>
                {deltaLabel}
                {isUnusual ? <span className="ml-1 text-white/20">· notable</span> : null}
              </span>
            ) : null}
          </p>
          <p>{regimeDisplay} — {REGIME_DESCRIPTOR[regime] ?? ""}</p>
          {stageLabel ? <p>{stageLabel}</p> : null}
          <p className="text-white/40">{recordDate}</p>
          {fetchedAt ? <p className="text-white/30">Updated {fetchedAt}</p> : null}
          <StageSwitcher currentStage={operatorContext.companyStage} />
        </div>
      </div>
    </div>
  );
}
