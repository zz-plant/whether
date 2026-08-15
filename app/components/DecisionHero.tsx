import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, REGIME_DISPLAY, formatBoldnessDeltaLabel } from "../viewModel";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalWaterfall } from "./SignalWaterfall";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";
import type { RegimeKey } from "../../lib/types";
import type { RegimeSignalIndicator } from "../../lib/report/homeBriefModel";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import type { SparklinePoint } from "./ui/sparkline";
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
  /** Trailing monthly boldness readings, oldest first. Omit to hide the sparkline. */
  boldnessTrend?: readonly SparklinePoint[];
  boldnessShorthand?: string;
  weeklyCall?: string;
  actionNow?: string;
  regime: string;
  previousRegime?: string;
  postureLabel: string;
  signalDirection: SignalDirection;
  recordDate: string;
  fetchedAt: string;
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
  /** Per-signal weekly movement, rendered in the signal-breakdown popover. */
  signalIndicators?: readonly RegimeSignalIndicator[];
  revisitDecisions?: boolean;
  revisitQueue?: ReadonlyArray<{
    id: string;
    label: string;
    reason: string;
    recheck: string;
  }>;
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
  boldnessTrend,
  boldnessShorthand,
  weeklyCall,
  actionNow,
  regime,
  postureLabel,
  signalDirection,
  recordDate,
  fetchedAt,
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
  signalIndicators,
  revisitDecisions = false,
  revisitQueue = [],
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

  // The score column states a level and a one-week delta; neither says whether 68
  // is a normal reading or an outlier. The sparkline answers that in the space of
  // a word, and the shaded band is the middle 50% of the same window.
  const trendPoints = boldnessTrend && boldnessTrend.length >= 2 ? boldnessTrend : undefined;
  const trendValues = trendPoints?.map((p) => p.value);
  const trendDomain = trendValues ? sparklineDomain(trendValues) : undefined;
  const trendBand = trendValues ? interquartileRange(trendValues) : undefined;
  const trendTone = boldnessDelta > 0 ? "easing" : boldnessDelta < 0 ? "tightening" : "unchanged";

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
          // The glyph carries its own title/desc ("Rose from 61 to 64"), so it
          // stays exposed to assistive tech rather than sitting behind
          // aria-hidden with only "+3.0 pts" left to announce.
          <p className="mt-0.5 flex items-center gap-1.5 text-fluid-nano">
            <span className="inline-block w-10 shrink-0">
              <DeltaGlyph
                idPrefix={`hero-tightness-delta-${idSuffix}`}
                previous={tightness - tightnessDelta}
                current={tightness}
                min={0}
                max={100}
                label="Cash availability"
              />
            </span>
            {/* Coloured by this signal's own move. Using the week's overall
                direction here painted a rising tightness emerald whenever the
                headline call happened to be "easing". */}
            <span className={trendToneClass(trendDirectionFromDelta(tightnessDelta), false)}>
              {tightnessDeltaMetadataLabel}
            </span>
          </p>
        ) : null}
        <div className="mt-1.5 w-full">
          <ThresholdLadder
            idPrefix={`hero-tightness-${idSuffix}`}
            min={0}
            max={100}
            current={tightness}
            previous={tightness - tightnessDelta}
            trigger={tightnessThreshold}
            signalLabel="Cash availability"
            scaleDirection="0 = easier funding · 100 = harder funding"
          />
        </div>
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
              <span className="inline-block w-10 shrink-0">
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
              <span className={trendToneClass(trendDirectionFromDelta(riskAppetiteDelta), true)}>
                {riskAppetiteDeltaLabel}
              </span>
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

          <section
            data-testid="weekly-top-fold"
            aria-label="Decisions to revisit"
            className={`rounded-lg border px-3 py-2.5 ${
              revisitDecisions
                ? "border-amber-500/35 bg-amber-500/10"
                : "border-emerald-500/25 bg-emerald-500/[0.06]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-fluid-xs font-semibold text-slate-100">
                Revisit last week&apos;s decisions?
              </p>
              <span className={`shrink-0 text-fluid-nano font-mono font-semibold uppercase ${revisitDecisions ? "text-amber-300" : "text-emerald-300"}`}>
                {revisitDecisions ? "Yes · revisit active" : "No · plan on track"}
              </span>
            </div>
            {revisitDecisions && revisitQueue.length > 0 ? (
              <ul className="mt-2 grid gap-1 text-fluid-xs text-slate-300 sm:grid-cols-2">
                {revisitQueue.slice(0, 2).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold text-slate-100">{item.label}:</span>{" "}
                    {item.recheck || item.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <details className="group">
            <summary className="flex min-h-11 cursor-pointer select-none items-center rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-white/75 after:ml-auto after:pl-2 after:text-slate-400 after:content-['▾'] group-open:after:content-['▴']">
              <span className="sm:hidden">Why this call · {signalReadoutSummary}</span>
              <span className="hidden sm:inline">Why this call · inspect the signal breakdown</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Signal readout">
              {renderSignalCells("details")}
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
          <SignalWaterfall data={signalData ?? {}} indicators={signalIndicators}>
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-[clamp(2.5rem,6vw,3.75rem)] font-bold leading-none text-white tabular-nums">
                {boldnessScore}
              </span>
              <span className="text-fluid-xs font-semibold text-white/40">/100</span>
            </div>
          </SignalWaterfall>
          <div
            className={`mt-2 flex items-center justify-center gap-1.5 text-base font-bold tabular-nums ${trendToneClass(trendDirectionFromDelta(boldnessDelta), true)}`}
          >
            <TrendGlyph direction={trendDirectionFromDelta(boldnessDelta)} className="h-4 w-4" />
            <span>{boldnessDeltaLabel}</span>
          </div>
          {trendPoints && trendDomain ? (
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-fluid-nano tabular-nums text-white/45">
              <Sparkline
                points={trendPoints}
                label="Boldness budget"
                domain={trendDomain}
                band={trendBand}
                tone={trendTone}
                widthEm={6}
                className="text-white/60"
              />
              {/* The graphic is autoscaled, so the span has to be readable or the
                  shape can't be decoded. */}
              <span>{trendPoints.length} mo · {rangeLabel(trendDomain)}</span>
            </p>
          ) : null}
          <p className="text-fluid-xs font-medium text-white/50 mt-1">
            Boldness budget
          </p>
        </div>
      </div>
    </section>
  );
}
