import type { OperatorContext } from "../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { SignalWaterfall } from "./SignalWaterfall";
import { StageSwitcher } from "./StageSwitcher";
import { ShareBriefButton } from "./shareBriefButton";
import { DecisionMemoryButton } from "./DecisionMemoryButton";

type Props = {
  tightness: number;
  tightnessDelta: number;
  riskAppetite?: number;
  boldnessScore: number;
  boldnessDelta: number;
  boldnessShorthand?: string;
  weeklyCall?: string;
  actionNow?: string;
  regime: string;
  postureLabel: string;
  signalDirection: SignalDirection;
  recordDate: string;
  fetchedAt: string;
  operatorContext: OperatorContext;
  confidenceLabel?: string;
  trustStatusLabel?: string;
  treasurySource?: string;
  degradedCount?: number;
  isFallback?: boolean;
  flipConditions?: string[];
  transitionProbability?: number;
  guardrail?: string;
  reversalTrigger?: string;
  shareLines?: string[];
  signalData?: {
    baseRate?: number | null;
    baseRateUsed?: string;
    curveSlope?: number | null;
    macroContributors?: string[];
    tightnessThreshold?: number;
  };
};

export function DecisionHero({
  tightness,
  tightnessDelta,
  riskAppetite,
  boldnessScore,
  boldnessDelta,
  boldnessShorthand,
  weeklyCall,
  actionNow,
  regime,
  postureLabel,
  signalDirection,
  recordDate,
  fetchedAt,
  operatorContext,
  confidenceLabel,
  trustStatusLabel,
  treasurySource,
  degradedCount,
  isFallback,
  flipConditions,
  transitionProbability,
  guardrail,
  reversalTrigger,
  shareLines,
  signalData,
}: Props) {
  const regimeDisplay = REGIME_DISPLAY[regime] ?? regime;
  const tightnessDeltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const tightnessDeltaLabel = tightnessDelta !== 0 ? `${tightnessDeltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";
  const boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);

  const tightnessLevel = tightness >= 75 ? "Elevated" : tightness >= 55 ? "Moderate" : "Low";
  const tightnessLevelColor = tightness >= 75 ? "text-rose-300/60" : tightness >= 55 ? "text-amber-300/60" : "text-emerald-300/60";
  const isUnusual = Math.abs(tightnessDelta) >= 3;
  const tightnessDeltaMetadataLabel = isUnusual ? `${tightnessDeltaLabel} · notable` : tightnessDeltaLabel;

  const dataStatus = isFallback ? "Snapshot" : degradedCount && degradedCount > 0 ? `${degradedCount} cached` : "Live";
  const dataStatusColor = isFallback ? "text-amber-300" : degradedCount && degradedCount > 0 ? "text-amber-300" : "text-emerald-300";
  const dataStatusBg = isFallback ? "bg-amber-500/10 border-amber-500/20" : degradedCount && degradedCount > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20";

  const isTreasuryUrl = treasurySource?.startsWith("http");
  const sourceNode = isTreasuryUrl ? (
    <a
      href={treasurySource}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-white/20 underline-offset-2 hover:text-white/80 hover:decoration-white/40"
    >
      FRED
    </a>
  ) : (
    <span>{treasurySource ?? "FRED"}</span>
  );

  const normalizedCall = (weeklyCall ?? "").trim();
  const showActionNow = actionNow && actionNow.trim() !== normalizedCall && actionNow.trim() !== "";

  return (
    <section className="space-y-4" aria-labelledby="weekly-call-title">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className={`text-fluid-nano font-semibold uppercase tracking-[0.12em] ${DIRECTION_COLOR[signalDirection]}`}>Weekly operating call</p>
            <h2 id="weekly-call-title" className="max-w-3xl text-pretty font-display text-[2rem] font-semibold leading-[1.05] text-white sm:text-[2.4rem]">
              {weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`}
            </h2>
          </div>
          {showActionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">Do now:</span> {actionNow}
            </p>
          ) : null}
          <div className="space-y-2 text-fluid-xs text-white/65">
            <p className={`font-medium ${DIRECTION_COLOR[signalDirection]}`}>
              {DIRECTION_LABEL[signalDirection]} · {boldnessDeltaLabel}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/50">
              <span>
                 <span className="text-white/50">Capital tightness:</span>{" "}
                <span className={tightnessLevelColor}>{tightness}/100 · {tightnessLevel.toLowerCase()}</span>
              </span>
              {tightnessDelta !== 0 ? (
                <span className={DIRECTION_COLOR[signalDirection]}>
                  {tightnessDeltaMetadataLabel}
                </span>
              ) : null}
              <span>{regimeDisplay}{REGIME_DESCRIPTOR[regime] ? ` · ${REGIME_DESCRIPTOR[regime]}` : ""}</span>
            </p>
          </div>
          {guardrail || reversalTrigger ? (
            <p className="text-fluid-micro text-white/50">
              {guardrail ? (
                <span>
                  <span className="font-semibold uppercase tracking-[0.06em] text-amber-300/80">Guardrail:</span>{" "}
                  {guardrail}
                </span>
              ) : null}
              {guardrail && reversalTrigger ? <span aria-hidden="true"> · </span> : null}
              {reversalTrigger ? (
                <span>
                  <span className="font-semibold uppercase tracking-[0.06em] text-rose-300/80">Reversal:</span>{" "}
                  {reversalTrigger}
                </span>
              ) : null}
            </p>
          ) : null}
          {flipConditions && flipConditions.length > 0 ? (
            <p className="text-fluid-micro text-white/50">
              <span className="font-semibold uppercase tracking-[0.06em] text-sky-300/80">
                Flip watch:
              </span>{" "}
              {flipConditions.join(" · ")}
              {transitionProbability && transitionProbability > 0 ? (
                <span> · {transitionProbability}% transition risk</span>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <StageSwitcher currentStage={operatorContext.companyStage} />
            <DecisionMemoryButton
              regime={regime}
              recordDate={recordDate}
              tightness={tightness}
              riskAppetite={riskAppetite}
              boldnessScore={boldnessScore}
              primaryCall={weeklyCall ?? postureLabel}
              guardrail={guardrail}
              reversalTrigger={reversalTrigger}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`} lines={shareLines} showLabel />
            <span
              title={isFallback ? "All data from snapshot" : degradedCount && degradedCount > 0 ? `${degradedCount} source group${degradedCount === 1 ? "" : "s"} running on cached data` : "All sources live"}
              aria-label={isFallback ? "Data status: all data from snapshot" : degradedCount && degradedCount > 0 ? `Data status: ${degradedCount} source group${degradedCount === 1 ? "" : "s"} running on cached data` : "Data status: all sources live"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.06em] ${dataStatusBg} ${dataStatusColor}`}
            >
              <span className={`size-2 rounded-full ${dataStatusColor} ${isFallback || (degradedCount && degradedCount > 0) ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
              {dataStatus}
            </span>
            <span className="text-fluid-micro text-white/50 hidden sm:inline">{sourceNode} · {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}{trustStatusLabel ? ` · ${trustStatusLabel}` : ""}</span>
          </div>
          <p className="text-fluid-micro text-white/50 sm:hidden">
            Data: {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}{trustStatusLabel ? ` · ${trustStatusLabel}` : ""}
          </p>
        </div>

        <div className="sm:text-right">
          <SignalWaterfall data={signalData ?? {}}>
            <div className="inline-flex items-baseline justify-center gap-1 sm:justify-end">
              <span className="font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-none text-white tabular-nums">
                {boldnessScore}
              </span>
              <span className="text-fluid-xs font-semibold text-white/50">/100</span>
            </div>
          </SignalWaterfall>
          <div className={`mt-1.5 flex items-center justify-center gap-1.5 sm:justify-end font-display text-base sm:text-lg font-bold tabular-nums ${
            boldnessDelta > 0 ? "text-emerald-300"
            : boldnessDelta < 0 ? "text-rose-300"
            : "text-slate-400"
          }`}>
            <span aria-hidden="true">{boldnessDelta > 0 ? "↑" : boldnessDelta < 0 ? "↓" : "→"}</span>
            <span>{boldnessDeltaLabel}</span>
          </div>
          <div className="mt-2 h-1 w-full max-w-[8rem] mx-auto sm:ml-auto sm:mr-0 rounded-full" style={{ background: "linear-gradient(90deg, rgba(244,63,94,0.3), rgba(251,191,36,0.3), rgba(52,211,153,0.3))" }}>
            <div className="relative h-full">
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-white ring-2 ring-white/20" style={{ left: `${Math.min(100, Math.max(0, boldnessScore))}%` }} />
            </div>
          </div>
          <p className="text-fluid-micro font-semibold tracking-[0.04em] text-white/50 mt-1">
            Boldness budget
          </p>
          <p className="text-fluid-micro text-white/50 mt-0.5">How much room you have to operate</p>
        </div>
      </div>
    </section>
  );
}
