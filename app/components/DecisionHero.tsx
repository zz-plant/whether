import type { OperatorContext } from "../../lib/report/operatorContext";
import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { SignalWaterfall } from "./SignalWaterfall";
import { PostureDial } from "./illustrations/PostureDial";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import type { RegimeKey } from "../../lib/types";
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

const REGIME_GLYPH_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];

// Narrowing rather than `value as RegimeKey`: regime arrives as a plain string,
// so an assertion would let an unrecognised value through to the glyph lookup.
const isRegimeKey = (value: string): value is RegimeKey =>
  REGIME_GLYPH_KEYS.some((key) => key === value);

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
  // Tightness is reported 0-100; the dial reads -1 (loosen) to +1 (tighten).
  const dialValue = tightness / 50 - 1;
  const dialPrevious = tightnessDelta !== 0 ? (tightness - tightnessDelta) / 50 - 1 : undefined;
  const upperRegime = regime.toUpperCase();
  const regimeKey = isRegimeKey(upperRegime) ? upperRegime : null;
  const tightnessThreshold = signalData?.tightnessThreshold;

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
      {/* items-start, not items-end: the left column runs ~600px tall while the
          score block is ~120px, so bottom-aligning it stranded the number at the
          foot of the hero and left a large void beside the headline. Pairing the
          headline with its score at the top closes the gap and reads like one unit. */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-12 shrink-0" aria-hidden="true">
                    <DeltaGlyph
                      idPrefix="hero-tightness-delta"
                      previous={tightness - tightnessDelta}
                      current={tightness}
                      min={0}
                      max={100}
                      label="Capital tightness"
                    />
                  </span>
                  <span className={DIRECTION_COLOR[signalDirection]}>
                    {tightnessDeltaMetadataLabel}
                  </span>
                </span>
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
            <div className="space-y-1.5 pt-1 text-fluid-micro">
              <p className="text-white/40 uppercase tracking-[0.06em] text-fluid-nano">Watch this week</p>
              {typeof tightnessThreshold === "number" ? (
                <div className="w-[6rem] py-1">
                  <ThresholdLadder
                    idPrefix="hero-tightness"
                    min={0}
                    max={100}
                    current={tightness}
                    trigger={tightnessThreshold}
                    signalLabel="Capital tightness"
                  />
                </div>
              ) : null}
              {guardrail ? (
                <p className="text-white/50">
                  <span className="font-semibold text-amber-300/80">Guardrail:</span>{" "}
                  {guardrail}
                </p>
              ) : null}
              {reversalTrigger ? (
                <p className="text-white/50">
                  <span className="font-semibold text-rose-300/80">Reversal:</span>{" "}
                  {reversalTrigger}
                </p>
              ) : null}
              {flipConditions && flipConditions.length > 0 ? (
                <p className="text-white/50">
                  <span className="font-semibold text-sky-300/80">Transition risk:</span>{" "}
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
          <p className="text-fluid-micro font-semibold tracking-[0.04em] text-white/50 mt-1">
            Boldness budget
          </p>
          <p className="text-fluid-micro text-white/50 mt-0.5">Inverse of tightness: room to hire, spend, &amp; commit</p>
          {/* Replaces a hardcoded-rgba gradient track: this is theme-aware and carries
              last week's reading, so the delta is visible rather than implied. */}
          <div className="mt-3 w-full max-w-[10rem] mx-auto sm:ml-auto sm:mr-0">
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
