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
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";

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

   // PostureDial reads -1 (loosen) .. +1 (tighten); tightness is 0-100.
   const toDialScale = (v: number) => (v - 50) / 50;
   const dialValue = toDialScale(tightness);
   const dialPrevious = toDialScale(tightness - tightnessDelta);
   const regimeKey = isRegimeKey(regime) ? regime : undefined;

   // High risk appetite = braver = room for bolder bets (see lib/report/regimeContext.ts).
   const riskAppetiteLevel = riskAppetite !== undefined ? (riskAppetite >= 75 ? "High" : riskAppetite >= 45 ? "Moderate" : "Low") : undefined;
   const riskAppetiteLevelColor = riskAppetite !== undefined ? (riskAppetite >= 75 ? "text-emerald-300" : riskAppetite >= 45 ? "text-amber-300" : "text-rose-300") : undefined;
   const riskAppetiteDeltaLabel = typeof riskAppetiteDelta === "number" ? `${riskAppetiteDelta > 0 ? "+" : ""}${riskAppetiteDelta.toFixed(1)} pts` : "";
   const tightnessThreshold = signalData?.tightnessThreshold ?? 50;

   const upperRegime = regime.toUpperCase();
   const regimeBounds = isRegimeKey(upperRegime) ? REGIME_BOUNDARIES[upperRegime] : REGIME_BOUNDARIES.EXPANSION;

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

  // Mobile-collapsed signal readout (DD-004): the summary line keeps all three
  // values visible, so collapsing hides only deltas and descriptors.
  const signalReadoutSummary = [
    `Cash availability ${tightness}`,
    typeof riskAppetite === "number" ? `Risk appetite ${riskAppetite}` : null,
    regimeDisplay,
  ]
    .filter(Boolean)
    .join(" · ");

  // Rendered twice (static desktop grid + mobile disclosure) so the collapse is
  // pure CSS — no client effect, no hydration pop-in, works without JS. The
  // idSuffix keeps the glyphs' SVG ids unique across the two renders; only one
  // copy is ever displayed.
  const renderSignalCells = (idSuffix: string) => (
    <>
      <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
        <p className="text-fluid-nano text-white/40">Cash availability</p>
        <p className="text-fluid-sm font-semibold tabular-nums text-white/85">
          {tightness}
          <span className="font-normal text-white/35">/100</span>{" "}
          <span className={`text-fluid-nano font-normal ${tightnessLevelColor}`}>{tightnessLevel.toLowerCase()}</span>
        </p>
        {tightnessDelta !== 0 ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-fluid-nano">
            <span className="inline-block w-10 shrink-0" aria-hidden="true">
              <DeltaGlyph
                idPrefix={`hero-tightness-delta-${idSuffix}`}
                previous={tightness - tightnessDelta}
                current={tightness}
                min={0}
                max={100}
                label="Cash availability"
              />
            </span>
            <span className={DIRECTION_COLOR[signalDirection]}>{tightnessDeltaMetadataLabel}</span>
          </p>
        ) : null}
      </div>

      {typeof riskAppetite === "number" ? (
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <p className="text-fluid-nano text-white/40">Risk appetite</p>
          <p className="text-fluid-sm font-semibold tabular-nums text-white/85">
            {riskAppetite}
            <span className="font-normal text-white/35">/100</span>{" "}
            <span className={`text-fluid-nano font-normal ${riskAppetiteLevelColor ?? ""}`}>{riskAppetiteLevel?.toLowerCase() ?? ""}</span>
          </p>
          {typeof riskAppetiteDelta === "number" && riskAppetiteDelta !== 0 ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-fluid-nano">
              <span className="inline-block w-10 shrink-0" aria-hidden="true">
                <DeltaGlyph
                  idPrefix={`hero-risk-appetite-delta-${idSuffix}`}
                  previous={riskAppetite - riskAppetiteDelta}
                  current={riskAppetite}
                  min={0}
                  max={100}
                  label="Risk appetite"
                  increaseIsPositive
                />
              </span>
              <span className={riskAppetiteDelta > 0 ? "text-emerald-300" : "text-rose-300"}>{riskAppetiteDeltaLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="col-span-2 rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 sm:col-span-1">
        <p className="text-fluid-nano text-white/40">Conditions</p>
        <p className="flex items-center gap-1.5 text-fluid-sm font-semibold text-white/85">
          {regimeKey ? (
            <span className="inline-block w-4 shrink-0" aria-hidden="true">
              <RegimeGlyph idPrefix={`hero-regime-${idSuffix}`} regime={regimeKey} />
            </span>
          ) : null}
          {regimeDisplay}
        </p>
        {REGIME_DESCRIPTOR[regime] ? (
          <p className="mt-0.5 text-fluid-nano text-white/45">{REGIME_DESCRIPTOR[regime]}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <section className="weather-card relative overflow-hidden p-5 sm:p-7" aria-labelledby="weekly-call-title">
      {/* Three siblings, not two columns of one. Stacked, the score used to land
          after the whole left column — guardrails, flip watch and all — which put
          it off-screen at 375px, so the call and the number it is scored by never
          shared a viewport. Mobile orders them call → score → detail; sm+ restores
          the original two-column grid with the score spanning both rows. */}
      <div className="flex flex-col gap-6 sm:grid sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start sm:gap-y-3">
        <div className="order-1 min-w-0 space-y-1 sm:col-start-1 sm:row-start-1">
          <p className={`text-fluid-xs font-medium ${DIRECTION_COLOR[signalDirection]}`}>Weekly operating call</p>
          <h2
            id="weekly-call-title"
            className="max-w-2xl text-pretty font-sans text-display font-semibold leading-[1.25] tracking-[-0.012em] text-white"
          >
            {weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`}
          </h2>
        </div>

        <div className="order-3 min-w-0 space-y-3 sm:order-none sm:col-start-1 sm:row-start-2">
          {showActionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {actionNow}
            </p>
          ) : null}
          {/* On a flat week the delta label reads "no change vs last week", which the
              score block below already states next to the number it describes. The
              direction word alone carries it here; the delta returns when it moves. */}
          <p className={`text-fluid-xs font-medium ${DIRECTION_COLOR[signalDirection]}`}>
            {boldnessDelta === 0
              ? DIRECTION_LABEL[signalDirection]
              : `${DIRECTION_LABEL[signalDirection]} · ${boldnessDeltaLabel}`}
          </p>

          {/* Signal readout: fixed cells instead of a wrap-dependent metadata sentence.
              Collapsed to the one-line summary on mobile (DD-004); auto-open on sm+. */}
          {/* Desktop: static cells, no JS involved. */}
          <div className="hidden max-w-xl grid-cols-2 gap-2 sm:grid sm:grid-cols-3" role="group" aria-label="Signal readout">
            {renderSignalCells("desktop")}
          </div>

          {/* Mobile: native disclosure, collapsed by default (DD-004). Pure CSS
              split — <details> toggles without JS and neither viewport shifts
              layout after hydration. */}
          <details className="group sm:hidden">
            <summary className="flex min-h-11 cursor-pointer select-none items-center rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-white/85 after:ml-auto after:pl-2 after:text-slate-400 after:content-['▾'] group-open:after:content-['▴']">
              {signalReadoutSummary}
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Signal readout">
              {renderSignalCells("mobile")}
            </div>
          </details>

          {/* Bounded conditions: one box owning the trip line, guardrail, reversal, and flip watch */}
          {(flipConditions && flipConditions.length > 0) || guardrail || reversalTrigger ? (
            <div className="space-y-2.5 rounded-lg border border-slate-800/60 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-fluid-nano font-mono type-eyebrow">
                  {DECISION_CONTRACT_LABELS.watch.watchThisWeek}
                </p>
                <span className={`text-fluid-nano font-medium tabular-nums ${counterColor}`}>
                  {pointsToPause} pts to pause
                </span>
              </div>
              {typeof tightnessThreshold === "number" ? (
                <div className="w-full max-w-[20rem]">
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
              <dl className="space-y-1.5 text-fluid-xs">
                {guardrail ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-amber-300/80">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</dt>
                    <dd className="text-white/60">{guardrail}</dd>
                  </div>
                ) : null}
                {reversalTrigger ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-rose-300/80">{DECISION_CONTRACT_LABELS.reversal.reversal}:</dt>
                    <dd className="text-white/60">{reversalTrigger}</dd>
                  </div>
                ) : null}
                {flipConditions && flipConditions.length > 0 ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-sky-300/80">{DECISION_CONTRACT_LABELS.watch.flipWatch}:</dt>
                    <dd className="text-white/60">
                      {flipConditions.join(" · ")}
                      {transitionProbability && transitionProbability > 0 ? (
                        <span> ({transitionProbability}% probability)</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`} lines={shareLines} showLabel />
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
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-fluid-micro text-white/50">
            <span className="inline-flex items-center gap-1.5">
              {/* Shape carries the state alongside color: circle = fully live feed, square =
                  static input present (snapshot or cached/degraded sources). */}
              {isDegradedData ? (
                <StatusStaticIcon className="size-2 text-amber-300/90" />
              ) : (
                <StatusLiveIcon className="size-2 text-emerald-300/90 motion-safe:animate-pulse" />
              )}
              <span className={isDegradedData ? "text-amber-300" : "text-emerald-300"}>{dataStatus}</span>
            </span>
            <span className="hidden sm:inline">{sourceNode} · {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}{trustStatusLabel ? ` · ${trustStatusLabel}` : ""}</span>
          </p>
        </div>

        <div className="order-2 sm:order-none sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <SignalWaterfall data={signalData ?? {}}>
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-[clamp(2.5rem,6vw,3.75rem)] font-bold leading-none text-white tabular-nums">
                {boldnessScore}
              </span>
              <span className="text-fluid-xs font-semibold text-white/40">/100</span>
            </div>
          </SignalWaterfall>
          <div className={`mt-2 flex items-center justify-center gap-1.5 text-base font-bold tabular-nums ${
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
              regime={regimeKey}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
