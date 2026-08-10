import type { OperatorContext } from "../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalWaterfall } from "./SignalWaterfall";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { PostureDial } from "./illustrations/PostureDial";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import type { RegimeKey } from "../../lib/types";
import { StageSwitcher } from "./StageSwitcher";
import { ShareBriefButton } from "./shareBriefButton";
import { DecisionMemoryButton } from "./DecisionMemoryButton";
import { RegimeCommandBar } from "../components/RegimeCommandBar";
import { buildFlipConditionsWithoutTriggerDuplication } from "../../lib/report/canonicalDecisionCopy";
import { formatNumberWithUnit } from "../../lib/formatters";
import { Tag } from "./ui/tag";

type Props = {
  tightness: number;
  tightnessDelta: number;
  riskAppetite?: number;
  riskAppetiteDelta?: number;
  boldnessScore: number;
  boldnessDelta: number;
  boldnessShorthand?: string;
  weeklyCall?: string;
  actionNow?: string;
  regime: string;
  previousRegime?: string;
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

const REGIME_GLYPH_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];
const isRegimeKey = (value: string): value is RegimeKey =>
  REGIME_GLYPH_KEYS.some((key) => key === value);

const REGIME_BOUNDARIES: Record<RegimeKey, { label: string; threshold: number; color: string }> = {
  SCARCITY: { label: "Scarcity", threshold: 75, color: "rose" },
  DEFENSIVE: { label: "Defensive", threshold: 65, color: "amber" },
  VOLATILE: { label: "Volatile", threshold: 55, color: "sky" },
  EXPANSION: { label: "Expansion", threshold: 45, color: "emerald" },
};

const formatCompactTrust = (label: string | undefined, degradedCount?: number, showOfflineBadge?: boolean) => {
  if (label) return label;
  if (showOfflineBadge) return "Snapshot";
  if (degradedCount && degradedCount > 0) return `${degradedCount} cached`;
  return "Live";
};

export function DecisionHero({
  tightness,
  tightnessDelta,
  riskAppetite,
  riskAppetiteDelta,
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

   const dialValue = tightness;
   const dialPrevious = tightness - tightnessDelta;
   const regimeKey = isRegimeKey(regime) ? regime : undefined;

   const riskAppetiteLevel = riskAppetite !== undefined ? (riskAppetite >= 75 ? "Low" : riskAppetite >= 45 ? "Moderate" : "High") : undefined;
   const riskAppetiteLevelColor = riskAppetite !== undefined ? (riskAppetite >= 75 ? "text-rose-300" : riskAppetite >= 45 ? "text-amber-300" : "text-emerald-300") : undefined;
   const riskAppetiteDeltaLabel = typeof riskAppetiteDelta === "number" ? `${riskAppetiteDelta > 0 ? "+" : ""}${riskAppetiteDelta.toFixed(1)} pts` : "";
   const tightnessThreshold = signalData?.tightnessThreshold ?? 50;

   // Posture compass: tightness (x-axis) vs risk appetite (y-axis) with regime boundaries.
   const compassX = tightness / 100;
   const compassY = 1 - (riskAppetite ?? 50) / 100;

   const upperRegime = regime.toUpperCase();
   const regimeBounds = isRegimeKey(upperRegime) ? REGIME_BOUNDARIES[upperRegime] : REGIME_BOUNDARIES.EXPANSION;
  const flipDist = tightness < regimeBounds.threshold
    ? Math.abs(tightness - regimeBounds.threshold)
    : Math.abs((riskAppetite ?? 50) - (regimeBounds.threshold - 10));
  const flipDistLabel = flipDist < 10 ? "Near" : flipDist < 20 ? "Approaching" : "Distant";

  const pointsToPause = Math.max(0, Math.round(regimeBounds.threshold - tightness));
  const counterColor = pointsToPause <= 10
    ? "text-rose-300"
    : pointsToPause <= 20
      ? "text-amber-300"
      : "text-emerald-300";

  const isDegradedData = isFallback || (degradedCount && degradedCount > 0);
  const dataStatus = isFallback ? "Snapshot" : degradedCount && degradedCount > 0 ? `${degradedCount} cached` : "Live";

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
    <section className="weather-card relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-7 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl hover:border-slate-700/80 transition-all duration-300" aria-labelledby="weekly-call-title">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className={`text-fluid-xs font-medium ${DIRECTION_COLOR[signalDirection]}`}>Weekly operating call</p>
            <h2
              id="weekly-call-title"
              className="max-w-3xl text-pretty font-display text-display leading-tight text-white sm:text-[2.8rem]"
            >
              {weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`}
            </h2>
          </div>
          {showActionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {actionNow}
            </p>
          ) : null}
          <div className="space-y-2.5 text-fluid-xs text-white/60">
            <p className={`font-medium ${DIRECTION_COLOR[signalDirection]}`}>
              {DIRECTION_LABEL[signalDirection]} · {boldnessDeltaLabel}
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-white/40">
              <span>
                <span>Cash availability:</span>{" "}
                <span className={tightnessLevelColor}>{tightness}/100 · {tightnessLevel.toLowerCase()}</span>
              </span>
              {tightnessDelta !== 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-12 shrink-0" aria-hidden="true">
                    <DeltaGlyph
                      idPrefix="hero-tightness-delta"
                      previous={tightness - tightnessDelta}
                      current={tightness}
                      min={0}
                      max={100}
                      label="Cash availability"
                    />
                  </span>
                  <span className={DIRECTION_COLOR[signalDirection]}>
                    {tightnessDeltaMetadataLabel}
                  </span>
                </span>
              ) : null}
              {typeof riskAppetite === "number" ? (
                <>
                  <span>
                    <span> Risk appetite:</span>{" "}
                     <span className={riskAppetiteLevelColor ?? ""}>{riskAppetite}/100 · {riskAppetiteLevel?.toLowerCase() ?? ""}</span>
                  </span>
                  {typeof riskAppetiteDelta === "number" && riskAppetiteDelta !== 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block w-12 shrink-0" aria-hidden="true">
                        <DeltaGlyph
                          idPrefix="hero-risk-appetite-delta"
                          previous={riskAppetite - riskAppetiteDelta}
                          current={riskAppetite}
                          min={0}
                          max={100}
                          label="Risk appetite"
                        />
                      </span>
                      <span className={riskAppetiteDelta > 0 ? "text-emerald-300" : "text-rose-300"}>
                        {riskAppetiteDeltaLabel}
                      </span>
                    </span>
                  ) : null}
                </>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                {regimeKey ? (
                  <span className="inline-block w-4 shrink-0" aria-hidden="true">
                    <RegimeGlyph idPrefix="hero-regime" regime={regimeKey} />
                  </span>
                ) : null}
                <span>{regimeDisplay}{REGIME_DESCRIPTOR[regime] ? ` · ${REGIME_DESCRIPTOR[regime]}` : ""}</span>
              </span>
            </p>
          </div>

          {/* Posture compass: tightness vs risk appetite relative to regime boundaries */}
          <div className="flex items-center gap-2 pt-1" aria-label="Posture compass">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
                <defs>
                   <linearGradient id="compass-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                     <stop offset="0%" style={{ stopColor: "var(--bg-panel)" }} />
                     <stop offset="100%" style={{ stopColor: "var(--bg-raised)" }} />
                   </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-default)" strokeWidth="1" />
                <circle cx="60" cy="60" r="35" fill="none" stroke="var(--border-default)" strokeWidth="0.5" />
                <circle cx="60" cy="60" r="20" fill="none" stroke="var(--border-default)" strokeWidth="0.5" />
                <circle cx="60" cy="60" r="5" fill="var(--bg-panel)" stroke="var(--border-strong)" strokeWidth="1.5" />

                <line x1="60" y1="10" x2="60" y2="110" stroke="var(--border-default)" strokeWidth="0.5" />
                <line x1="10" y1="60" x2="110" y2="60" stroke="var(--border-default)" strokeWidth="0.5" />

                <text x="60" y="9" textAnchor="middle" fill="var(--app-text-muted)" fontSize="6">Tight</text>
                <text x="60" y="111" textAnchor="middle" fill="var(--app-text-muted)" fontSize="6">Loose</text>
                <text x="110" y="60" textAnchor="middle" fill="var(--app-text-muted)" fontSize="6">Risk</text>
                <text x="10" y="60" textAnchor="middle" fill="var(--app-text-muted)" fontSize="6">Calm</text>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none gap-[1px]">
                <span className={`text-[9px] font-bold tabular-nums ${tightness > 60 ? "text-rose-300" : tightness > 40 ? "text-amber-300" : "text-emerald-300"}`}>
                  {tightness}
                </span>
                <span className={`text-[9px] font-bold tabular-nums ${(riskAppetite ?? 50) >= 65 ? "text-emerald-300" : (riskAppetite ?? 50) >= 45 ? "text-amber-300" : "text-rose-300"}`}>
                  {riskAppetite ?? "—"}
                </span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] text-slate-400">
                {regimeBounds.label}
              </div>
              {/* Flip distance indicator */}
              {flipDistLabel !== "Distant" && (
                <div className="absolute top-0 left-0 right-0 text-center">
                  <span className={`text-[8px] font-semibold ${
                    flipDist <= 10 ? "text-rose-300" : flipDist <= 20 ? "text-amber-300" : "text-emerald-300"
                  }`}>
                    {flipDistLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-400">threshold {regimeBounds.threshold}</span>
              <span className={`text-[9px] font-medium ${counterColor}`}>
                {pointsToPause} pts to pause
              </span>
            </div>
          </div>

          {/* Flip watch with live probability */}
          {flipConditions && flipConditions.length > 0 ? (
            <div className="space-y-1.5 pt-1 text-fluid-sm">
              <p className="text-white/35 font-medium">{DECISION_CONTRACT_LABELS.watch.watchThisWeek}</p>
              {typeof tightnessThreshold === "number" ? (
                <div className="w-[6rem] py-1">
                  <ThresholdLadder
                    idPrefix="hero-tightness"
                    min={0}
                    max={100}
                    current={tightness}
                    trigger={tightnessThreshold}
                    signalLabel="Cash availability"
                  />
                </div>
              ) : null}
              {guardrail ? (
                <p className="text-white/60">
                  <span className="font-medium text-amber-300/80">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</span>{" "}
                  {guardrail}
                </p>
              ) : null}
              {reversalTrigger ? (
                <p className="text-white/60">
                  <span className="font-medium text-rose-300/80">{DECISION_CONTRACT_LABELS.reversal.reversal}:</span>{" "}
                  {reversalTrigger}
                </p>
              ) : null}
              {flipConditions && flipConditions.length > 0 ? (
                <p className="text-white/60">
                  <span className="font-medium text-sky-300/80">{DECISION_CONTRACT_LABELS.watch.flipWatch}:</span>{" "}
                  {flipConditions.join(" · ")}
                  {transitionProbability && transitionProbability > 0 ? (
                    <span> ({transitionProbability}% probability)</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Live counter: points to pause with color transition */}
           {pointsToPause > 0 ? (

            <div className="flex items-center gap-2 pt-1">
              <span className={`text-[10px] font-semibold ${counterColor}`}>
                {pointsToPause} pts to pause
              </span>
              <span className="text-[8px] text-slate-400">{flipDistLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-emerald-300 font-semibold">10 pts to pause</span>
              <span className="text-[8px] text-slate-400">threshold at safe margin</span>
            </div>
          )}

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
            <span className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${isDegradedData ? "bg-amber-400/80 motion-safe:animate-pulse" : "bg-emerald-400/80"}`} aria-hidden="true" />
              <span className={isDegradedData ? "text-amber-300" : "text-emerald-300"}>{dataStatus}</span>
            </span>
            <span className="text-fluid-micro text-white/50 hidden sm:inline">{sourceNode} · {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}{trustStatusLabel ? ` · ${trustStatusLabel}` : ""}</span>
          </div>
        </div>

        <div className="">
          <SignalWaterfall data={signalData ?? {}}>
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="font-display text-[clamp(2.5rem,6vw,3.75rem)] font-bold leading-none text-white tabular-nums">
                {boldnessScore}
              </span>
              <span className="text-fluid-xs font-semibold text-white/40">/100</span>
            </div>
          </SignalWaterfall>
          <div className={`mt-2 flex items-center justify-center gap-1.5 font-display text-base font-bold tabular-nums ${
            boldnessDelta > 0 ? "text-emerald-300"
            : boldnessDelta < 0 ? "text-rose-300"
            : "text-slate-400"
          }`}>
            <span aria-hidden="true">{boldnessDelta > 0 ? "↑" : boldnessDelta < 0 ? "↓" : "→"}</span>
            <span>{boldnessDeltaLabel}</span>
          </div>
          <p className="text-fluid-xs font-medium text-white/50 mt-1">
            Boldness budget
          </p>
          <p className="text-fluid-xs text-white/45 mt-0.5">70% risk appetite + 30% cash availability</p>
          <div className="mt-3 w-full max-w-[10rem] mx-auto">
            <PostureDial
              idPrefix="hero-posture"
              value={dialValue}
              previous={dialPrevious}
              label={postureLabel}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// Compose a compact trust badge from a live signal (used on hero) and
// on the trust page, with a "data as of" + confidence line.
// The trust badge stays compact — one line showing freshness, confidence,
// and source mode, not a separate summary card.
const CompactTrustBadge = ({
  confidenceLabel,
  trustStatusLabel,
  sourceNode,
  recordDate,
  showOfflineBadge,
  degradedCount,
}: {
  confidenceLabel?: string;
  trustStatusLabel?: string;
  sourceNode?: string;
  recordDate?: string;
  showOfflineBadge?: boolean;
  degradedCount?: number;
}) => {
  const statusLine = formatCompactTrust(trustStatusLabel, degradedCount, showOfflineBadge);
  return (
    <span className="inline-flex items-center gap-1.5 text-fluid-micro">
      <span className={`size-1.5 rounded-full ${confidenceLabel === "HIGH" ? "bg-emerald-400/80" : confidenceLabel === "MED" ? "bg-amber-400/80" : "bg-rose-400/80"}`} aria-hidden="true" />
      <span className={confidenceLabel === "HIGH" ? "text-emerald-300" : confidenceLabel === "MED" ? "text-amber-300" : "text-rose-300"}>
        {confidenceLabel}
      </span>
      <span className="text-white/40">·</span>
      <span className="text-white/50">{sourceNode ?? "FRED"}</span>
      <span className="text-white/40">·</span>
      <span className="text-white/50">{recordDate}</span>
      {statusLine ? <span className="text-white/50">· {statusLine}</span> : null}
    </span>
  );
};