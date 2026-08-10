import type { OperatorContext } from "../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalWaterfall } from "./SignalWaterfall";
import { PostureDial } from "./illustrations/PostureDial";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import type { RegimeKey } from "../../lib/types";
import { StageSwitcher } from "./StageSwitcher";
import { ShareBriefButton } from "./shareBriefButton";
import { DecisionMemoryButton } from "./DecisionMemoryButton";
import { RegimeCommandBar } from "../components/RegimeCommandBar";
import { buildFlipConditionsWithoutTriggerDuplication } from "../../lib/report/canonicalDecisionCopy";
import { formatNumberWithUnit } from "../../lib/formatters";

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

// Narrowing rather than `value as RegimeKey`: regime arrives as a plain string,
// so an assertion would let an unrecognised value through to the glyph lookup.
const isRegimeKey = (value: string): value is RegimeKey =>
  REGIME_GLYPH_KEYS.some((key) => key === value);

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
  // Tightness is reported 0-100; the dial reads -1 (loosen) to +1 (tighten).
  const dialValue = tightness / 50 - 1;
  const dialPrevious = tightnessDelta !== 0 ? (tightness - tightnessDelta) / 50 - 1 : undefined;
  const upperRegime = regime.toUpperCase();
  const regimeKey = isRegimeKey(upperRegime) ? upperRegime : null;
  const tightnessThreshold = signalData?.tightnessThreshold;

  // Risk appetite levels: Bold (≥65), Steady (≥45), Cautious (<45)
  const riskAppetiteLevel = typeof riskAppetite === "number"
    ? riskAppetite >= 65 ? "Bold" : riskAppetite >= 45 ? "Steady" : "Cautious"
    : "";
  const riskAppetiteLevelColor = typeof riskAppetite === "number"
    ? riskAppetite >= 65 ? "text-emerald-300/60" : riskAppetite >= 45 ? "text-amber-300/60" : "text-rose-300/60"
    : "";
  const riskAppetiteDeltaLabel = typeof riskAppetiteDelta === "number" && riskAppetiteDelta !== 0
    ? `${riskAppetiteDelta > 0 ? "↑ +" : "↓ -"}${Math.abs(riskAppetiteDelta).toFixed(1)} pts${Math.abs(riskAppetiteDelta) >= 3 ? " · notable" : ""}`
    : "";

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
    <section className="weather-section" aria-labelledby="weekly-call-title">
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
                    <span className={riskAppetiteLevelColor}>{riskAppetite}/100 · {riskAppetiteLevel.toLowerCase()}</span>
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
          {guardrail || reversalTrigger || (flipConditions && flipConditions.length > 0) ? (
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
