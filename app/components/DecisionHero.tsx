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
import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { GlossaryLink, PlainEnglishScoreNote, SignalScaleNote } from "./ui/plainLanguage";
import { UrlDetails } from "./ui/urlDetails";
import { BoundedValue } from "./ui/boundedValue";
import {
  SCORE_BAND_LABELS,
  classifyScoreBand,
  compositeSignalScales,
} from "../../lib/report/signalTranslations";
import type { SparklinePoint } from "./ui/sparkline";
import { ShareBriefButton } from "./shareBriefButton";
import { DecisionMemoryButton } from "./DecisionMemoryButton";
import { CopySlackBriefButton } from "./CopySlackBriefButton";
import { CopyMeetingSlideButton } from "./CopyMeetingSlideButton";
import { PresentModeButton } from "./PresentModeButton";
import type { MeetingSlidePayload } from "../../lib/export/meetingSlideExport";
import { ThresholdProximityBar } from "./ThresholdProximityBar";
import { DeveloperQuickAccess } from "./DeveloperQuickAccess";
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { StagePersonaSelector } from "./StagePersonaSelector";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";

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
  /** Decision areas that are not flagged for revisit this week. */
  noChangeAreas?: readonly string[];
  thresholdBusinessConsequence?: ThresholdBusinessConsequence | null;
  /** Server-resolved from `?why=1`, so a shared link opens on the same panel. */
  signalBreakdownOpen?: boolean;
  activeStage?: StartupVariantMode;
  signalData?: {
    baseRate?: number | null;
    baseRateUsed?: string;
    curveSlope?: number | null;
    macroContributors?: string[];
    tightnessThreshold?: number;
    riskAppetiteThreshold?: number;
  };
};

const REGIME_GLYPH_KEYS = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const satisfies readonly RegimeKey[];
const isRegimeKey = (value: string): value is RegimeKey =>
  REGIME_GLYPH_KEYS.some((key) => key === value);

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
  guardrail,
  reversalTrigger,
  shareLines,
  signalIndicators,
  revisitDecisions = false,
  revisitQueue = [],
  noChangeAreas = [],
  thresholdBusinessConsequence,
  signalBreakdownOpen = false,
  signalData,
  activeStage = "series-a",
}: Props) {
  const regimeDisplay = REGIME_DISPLAY[regime] ?? regime;
  const tightnessDeltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const tightnessDeltaLabel = tightnessDelta !== 0 ? `${tightnessDeltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";
  const boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);

  // Band words and band sentences have to come from the same classification, or
  // the card says "low" above a sentence that says "balanced".
  const tightnessBand = classifyScoreBand(tightness);
  const tightnessLevel = SCORE_BAND_LABELS[tightnessBand];
  const tightnessLevelColor =
    tightnessBand === "high"
      ? "text-rose-300/60"
      : tightnessBand === "mid"
        ? "text-amber-300/60"
        : "text-emerald-300/60";
  const isUnusual = Math.abs(tightnessDelta) >= 3;
  const tightnessDeltaMetadataLabel = isUnusual ? `${tightnessDeltaLabel} · notable` : tightnessDeltaLabel;

  const regimeKey = isRegimeKey(regime) ? regime : undefined;

  // High risk appetite = braver = room for bolder bets (see lib/report/regimeContext.ts).
  const riskAppetiteBand = riskAppetite !== undefined ? classifyScoreBand(riskAppetite) : undefined;
  const riskAppetiteLevel = riskAppetiteBand ? SCORE_BAND_LABELS[riskAppetiteBand] : undefined;
  const riskAppetiteLevelColor =
    riskAppetiteBand === "high"
      ? "text-emerald-300"
      : riskAppetiteBand === "mid"
        ? "text-amber-300"
        : riskAppetiteBand === "low"
          ? "text-rose-300"
          : undefined;
  const riskAppetiteDeltaLabel = typeof riskAppetiteDelta === "number" ? `${riskAppetiteDelta > 0 ? "+" : ""}${riskAppetiteDelta.toFixed(1)} pts` : "";
  const tightnessThreshold = signalData?.tightnessThreshold ?? 50;
  const riskAppetiteThreshold = signalData?.riskAppetiteThreshold ?? 50;

  const pointsToPause = thresholdBusinessConsequence?.pointsToThreshold;
  const counterColor = typeof pointsToPause === "number" && pointsToPause <= 10
    ? "text-rose-300"
    : typeof pointsToPause === "number" && pointsToPause <= 20
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
    `Funding pressure ${tightness} ${tightnessLevel.toLowerCase()}`,
    typeof riskAppetite === "number" && riskAppetiteLevel
      ? `Risk appetite ${riskAppetite} ${riskAppetiteLevel.toLowerCase()}`
      : null,
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
        <p className="text-fluid-nano text-white/40">Funding pressure</p>
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
                label="Funding pressure"
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
            signalLabel="Funding pressure"
            scaleDirection={compositeSignalScales.tightness.directionLabel}
          />
        </div>
        <PlainEnglishScoreNote
          signalKey="tightness"
          score={tightness}
          lead="This signal alone"
          className="mt-1.5"
        />
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
          <SignalScaleNote signalKey="riskAppetite" className="mt-1.5" />
          <PlainEnglishScoreNote
            signalKey="riskAppetite"
            score={riskAppetite}
            lead="This signal alone"
            className="mt-1"
          />
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
    <section className="weather-card weather-hero-card relative overflow-hidden p-5 sm:p-7" aria-labelledby="weekly-call-title">
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
            {/* Sits with the call it describes, and fills the space the score block
                opens beside a two-line headline. On a flat week the delta reads "no
                change vs last week", which the score states next to the number it
                describes; the direction word alone carries it here. */}
            <p className={`text-fluid-xs font-medium ${DIRECTION_COLOR[signalDirection]}`}>
              {boldnessDelta === 0
                ? DIRECTION_LABEL[signalDirection]
                : `${DIRECTION_LABEL[signalDirection]} · ${boldnessDeltaLabel}`}
            </p>
            <StagePersonaSelector activeStage={activeStage} className="pt-1.5" />
          </div>

        <div className="order-3 min-w-0 space-y-3 sm:order-none sm:col-span-2 sm:col-start-1 sm:row-start-2">
          {showActionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {actionNow}
            </p>
          ) : null}
          <section
            data-testid="weekly-top-fold"
            aria-label="What needs reconsideration this week"
            className={`rounded-xl border p-3.5 backdrop-blur-sm transition-all ${
              revisitDecisions
                ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                : "border-emerald-500/30 bg-emerald-500/[0.07] shadow-[0_0_20px_rgba(16,185,129,0.06)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-fluid-xs font-semibold text-slate-100 flex items-center gap-1.5">
                <span className={`inline-block size-2 rounded-full ${revisitDecisions ? "bg-amber-400" : "bg-emerald-400"}`} />
                What needs reconsideration this week?
              </p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-fluid-nano font-semibold uppercase tracking-[0.08em] border ${
                revisitDecisions
                  ? "border-amber-500/40 bg-amber-500/20 text-semantic-caution-fg"
                  : "border-emerald-500/40 bg-emerald-500/20 text-semantic-easing-fg"
              }`}>
                {revisitDecisions ? `${revisitQueue.length} need attention` : "No change"}
              </span>
            </div>
            {revisitQueue.length > 0 ? (
              <ul className="mt-2 grid gap-1 text-fluid-xs text-slate-300 sm:grid-cols-2">
                {revisitQueue.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold text-slate-100">{item.label}:</span>{" "}
                    {item.recheck || item.reason}
                  </li>
                ))}
              </ul>
            ) : null}
            {noChangeAreas.length > 0 ? (
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-fluid-nano text-white/45">
                <span className="font-semibold text-slate-400">No change:</span>{" "}
                {noChangeAreas.join(" · ")}
              </p>
            ) : null}
          </section>

          {/* The chevron comes from the shared contract rather than a hand-rolled
              `after:content` pair, and the open state rides in `?why=1` so the
              panel survives being shared. */}
          <UrlDetails
            queryKey="why"
            initialOpen={signalBreakdownOpen}
            className="weather-auto-chevron"
            summaryClassName="cursor-pointer select-none rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 text-fluid-xs font-medium text-white/75"
            summary={<span>Why this call · {signalReadoutSummary}</span>}
          >
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Signal readout">
              {renderSignalCells("details")}
            </div>
            <p className="mt-2 text-fluid-nano text-white/45">
              Unfamiliar with a term here? <GlossaryLink>Open the glossary</GlossaryLink>
            </p>
          </UrlDetails>

          {/* Bounded conditions: one box owning the trip line, guardrail, reversal, and flip watch */}
          {(flipConditions && flipConditions.length > 0) || guardrail || reversalTrigger ? (
            <div className="space-y-2.5 rounded-lg border border-slate-800/60 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-fluid-nano type-eyebrow">
                  {DECISION_CONTRACT_LABELS.watch.watchThisWeek}
                </p>
                {thresholdBusinessConsequence ? (
                  <span className={`whitespace-nowrap text-fluid-nano font-medium tabular-nums ${counterColor}`}>
                    {thresholdBusinessConsequence.status === "crossed"
                      ? `${pointsToPause} points — ${thresholdBusinessConsequence.consequenceLabel} threshold crossed`
                      : `${pointsToPause} points until ${thresholdBusinessConsequence.consequenceLabel}`}
                  </span>
                ) : null}
              </div>

              {thresholdBusinessConsequence ? (
                <ThresholdProximityBar consequence={thresholdBusinessConsequence} className="my-1" />
              ) : null}

              <dl className="space-y-1.5 text-fluid-xs">
                {/* Three rows previously carried three unrelated hues (amber,
                    rose, sky), which ranked nothing — they were labels, not
                    directions. Hue now tracks posture: guardrail and reversal
                    are the tighten side, flip watch is neutral. The semantic
                    tokens also invert correctly in light mode on their own,
                    unlike the raw text-<hue>-300 classes these replace. */}
                {guardrail ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{guardrail}</BoundedValue></dd>
                  </div>
                ) : null}
                {reversalTrigger ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.reversal.reversal}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
                  </div>
                ) : null}
                {flipConditions && flipConditions.length > 0 ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-slate-400">{DECISION_CONTRACT_LABELS.watch.flipWatch}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{flipConditions.join(" · ")}</BoundedValue></dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <CopySlackBriefButton
              weeklyCall={weeklyCall ?? postureLabel}
              regime={regimeDisplay}
              boldnessScore={boldnessScore}
              recordDate={recordDate}
              guardrail={guardrail}
              reversalTrigger={reversalTrigger}
              lines={shareLines}
            />
            <CopyMeetingSlideButton
              payload={{
                recordDate,
                regime: regimeDisplay,
                stageLabel: "Startup",
                actionNow: actionNow ?? weeklyCall ?? postureLabel,
                pauseIf: guardrail ?? "Hold irreversible commitments until threshold pressure clears.",
                changeCourseIf: reversalTrigger ?? "Resume staged approvals when conditions ease.",
                tightness,
                riskAppetite: riskAppetite ?? 50,
                confidence: confidenceLabel ?? "MED",
                provenance: treasurySource ?? "U.S. Treasury",
              }}
            />
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
              tightnessThreshold={tightnessThreshold}
              riskAppetiteThreshold={riskAppetiteThreshold}
            />
            <PresentModeButton />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-fluid-micro text-white/50">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
              {/* Source, date and confidence stay on mobile. They were behind
                  `hidden sm:inline`, which left the phone showing only "Snapshot"
                  — dropping provenance exactly where the brief gets screenshotted
                  and shared, and losing Confidence, a required field of the
                  screenshot contract. Only the longer trust-status sentence is
                  held back to keep the line from dominating a narrow column. */}
              <span>{sourceNode} · {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}</span>
              {trustStatusLabel ? <span className="hidden sm:inline">· {trustStatusLabel}</span> : null}
            </p>
            <DeveloperQuickAccess
              regime={regimeDisplay}
              boldnessScore={boldnessScore}
              weeklyCall={weeklyCall ?? postureLabel}
            />
          </div>
        </div>

        <div className="order-2 sm:order-none sm:col-start-2 sm:row-start-1">
          <SignalWaterfall data={signalData ?? {}} indicators={signalIndicators}>
            <div className="weather-glow-aura inline-flex items-baseline justify-center gap-1">
              <span className="text-[clamp(2.5rem,6vw,3.75rem)] font-bold leading-none text-white tabular-nums drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
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
          <p className="text-fluid-nano leading-snug text-white/40">
            How much room you have to hire, spend, and commit.
          </p>
        </div>
      </div>
    </section>
  );
}
