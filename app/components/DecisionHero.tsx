import type { OperatorContext } from "../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { SignalWaterfall } from "./SignalWaterfall";
import { StageSwitcher } from "./StageSwitcher";
import { ShareBriefButton } from "./shareBriefButton";

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
      className="underline decoration-white/20 underline-offset-2 hover:text-white/70 hover:decoration-white/40"
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
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/60">
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
          <StageSwitcher currentStage={operatorContext.companyStage} />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`} showLabel />
            <span title={isFallback ? "All data from snapshot" : degradedCount && degradedCount > 0 ? `${degradedCount} source group${degradedCount === 1 ? "" : "s"} running on cached data` : "All sources live"} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.06em] ${dataStatusBg} ${dataStatusColor}`}>
              <span className={`size-2 rounded-full ${dataStatusColor} ${isFallback || (degradedCount && degradedCount > 0) ? "animate-pulse" : ""}`} aria-hidden="true" />
              {dataStatus}
            </span>
            <span className="text-fluid-micro text-white/50 hidden sm:inline">{sourceNode} · {recordDate}{trustStatusLabel ? ` · ${trustStatusLabel}` : ""}</span>
          </div>
        </div>

        <div className="sm:text-right">
          <div className="relative inline-flex items-center justify-center p-3">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden="true">
              {confidenceLabel ? (
                <>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke={confidenceLabel === "HIGH" ? "rgba(110,231,183,0.6)" : confidenceLabel === "MED" ? "rgba(252,211,77,0.6)" : "rgba(253,164,175,0.6)"}
                    strokeWidth="5"
                    strokeDasharray={confidenceLabel === "HIGH" ? "289 0" : confidenceLabel === "MED" ? "217 72" : "145 144"}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ filter: confidenceLabel === "HIGH" ? "drop-shadow(0 0 6px rgba(110,231,183,0.35))" : confidenceLabel === "MED" ? "drop-shadow(0 0 6px rgba(252,211,77,0.35))" : "drop-shadow(0 0 6px rgba(253,164,175,0.35))" }}
                  />
                  {[25, 50, 75].map((pct) => {
                    const angle = (pct / 100) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    return <line key={pct} x1={50 + 42 * Math.cos(rad)} y1={50 + 42 * Math.sin(rad)} x2={50 + 50 * Math.cos(rad)} y2={50 + 50 * Math.sin(rad)} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />;
                  })}
                </>
              ) : null}
            </svg>
            <SignalWaterfall data={signalData ?? {}}>
              <div className="relative z-10 font-display text-[clamp(2.75rem,9vw,5.5rem)] font-bold leading-none text-white tabular-nums"
                style={{ textShadow: "0 0 80px rgba(255,255,255,0.06)" }}>
                {boldnessScore}
              </div>
            </SignalWaterfall>
          </div>
          <div className="mt-2 h-1 w-full max-w-[8rem] mx-auto sm:ml-auto sm:mr-0 rounded-full" style={{ background: "linear-gradient(90deg, rgba(244,63,94,0.3), rgba(251,191,36,0.3), rgba(52,211,153,0.3))" }}>
            <div className="relative h-full">
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-white ring-2 ring-white/20" style={{ left: `${Math.min(100, Math.max(0, boldnessScore))}%` }} />
            </div>
          </div>
          <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/60 mt-1">
            Boldness Budget
            <span className="ml-1.5 text-white/50"> /100</span>
          </p>
          <p className="text-fluid-micro text-white/50 mt-0.5">How much room you have to operate</p>
        </div>
      </div>
    </section>
  );
}
