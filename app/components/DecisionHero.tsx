import type { OperatorContext } from "../../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { SignalWaterfall } from "./SignalWaterfall";
import { StageSwitcher } from "./StageSwitcher";
import { ShareBriefButton } from "../../components/shareBriefButton";

type Props = {
  tightness: number;
  tightnessDelta: number;
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
  signalData,
}: Props) {
  const regimeDisplay = REGIME_DISPLAY[regime] ?? regime;
  const tightnessDeltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const tightnessDeltaLabel = tightnessDelta !== 0 ? `${tightnessDeltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";
  const boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);
  const freshnessLabel = fetchedAt || recordDate;

  const tightnessLevel = tightness >= 75 ? "Elevated" : tightness >= 55 ? "Moderate" : "Low";
  const tightnessLevelColor = tightness >= 75 ? "text-rose-300/60" : tightness >= 55 ? "text-amber-300/60" : "text-emerald-300/60";
  const isUnusual = Math.abs(tightnessDelta) >= 3;
  const tightnessDeltaMetadataLabel = isUnusual ? `${tightnessDeltaLabel} · notable` : tightnessDeltaLabel;

  const dataStatus = isFallback ? "Snapshot" : degradedCount && degradedCount > 0 ? "Partial" : "Live";
  const dataStatusColor = isFallback ? "text-amber-300" : degradedCount && degradedCount > 0 ? "text-amber-300" : "text-emerald-300";
  const provenanceLabel = [treasurySource ?? "FRED", recordDate, trustStatusLabel].filter(Boolean).join(" · ");

  return (
    <section className="space-y-4" aria-labelledby="weekly-call-title">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="text-fluid-nano font-semibold uppercase tracking-[0.12em] text-white/35">This week&apos;s call</p>
            <h2 id="weekly-call-title" className="max-w-3xl text-pretty font-display text-[1.7rem] font-semibold leading-[1.08] text-white sm:text-3xl">
              {weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`}
            </h2>
          </div>
          {actionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">Do this week:</span> {actionNow}
            </p>
          ) : null}
          <div className="space-y-2 text-fluid-xs text-white/55">
            <p className={`font-medium ${DIRECTION_COLOR[signalDirection]}`}>
              {DIRECTION_LABEL[signalDirection]} · {boldnessDeltaLabel}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-white/45">
              <span>
                <span className="text-white/35">Tightness:</span>{" "}
                <span className={tightnessLevelColor}>{tightness}/100 · {tightnessLevel.toLowerCase()}</span>
              </span>
              {tightnessDelta !== 0 ? (
                <span className={DIRECTION_COLOR[signalDirection]}>
                  {tightnessDeltaMetadataLabel}
                </span>
              ) : null}
              <span>{regimeDisplay}{REGIME_DESCRIPTOR[regime] ? ` · ${REGIME_DESCRIPTOR[regime]}` : ""}</span>
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${dataStatusColor}`} aria-hidden="true" />
                <span className={dataStatusColor}>{dataStatus}</span>
                <span className="text-white/30">· {provenanceLabel}</span>
              </span>
            </p>
          </div>
          <StageSwitcher currentStage={operatorContext.companyStage} />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`} showLabel />
            <span className="text-fluid-micro text-white/35 hidden sm:inline">Copy or share this week&apos;s call.</span>
          </div>
        </div>

        <div className="sm:text-right">
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
              <div className="font-display text-[clamp(3.5rem,10vw,5.75rem)] font-bold leading-none text-white tabular-nums"
                style={{ textShadow: "0 0 80px rgba(255,255,255,0.06)" }}>
                {boldnessScore}
              </div>
            </SignalWaterfall>
          </div>
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/60">
            Boldness Budget
            <span className="ml-1.5 text-white/35"> /100</span>
          </p>
        </div>
      </div>
    </section>
  );
}
