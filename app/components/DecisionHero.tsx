import { DIRECTION_LABEL, DIRECTION_COLOR, REGIME_DESCRIPTOR, formatBoldnessDeltaLabel } from "../viewModel";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalWaterfall } from "./SignalWaterfall";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";
import type { RegimeKey } from "../../lib/types";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../../lib/report/homeBriefModel";
import { WeeklyChangeReport } from "./hero/weeklyChangeReport";
import { buildBoundedConditionRails, formatPointsToLine } from "../../lib/report/operatingCalls";
import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";
import type { RuleCondition } from "../../lib/report/boundedDecisionRules";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { GlossaryLink, PlainEnglishScoreNote } from "./ui/plainLanguage";
import { UrlDetails } from "./ui/urlDetails";
import { BoundedValue } from "./ui/boundedValue";
import {
  SCORE_BAND_LABELS,
  classifyScoreBand,
  compositeSignalScales,
} from "../../lib/report/signalTranslations";
import type { SparklinePoint } from "./ui/sparkline";
import { ShareBriefButton } from "./shareBriefButton";
import { CopyMeetingSlideButton } from "./CopyMeetingSlideButton";
import { resolveDataStatusLabel } from "../../lib/report/trustStatus";
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { StagePersonaSelector } from "./StagePersonaSelector";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";

type Props = {
  tightness: number;
  tightnessDelta: number;
  tightnessPressure?: number;
  tightnessSaturated?: boolean;
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
  /**
   * The bounded rule's lines as data — the same clause the `guardrail` and
   * `flipConditions` sentences are derived from — so the rails draw what the
   * rows say without parsing them.
   */
  boundedConditions?: {
    pause: readonly RuleCondition[];
    resume: readonly RuleCondition[];
    /** Non-numeric conditions the rule states beside its lines; printed under the rails so the readout is the whole rule. */
    pauseQualifier?: string;
    resumeQualifier?: string;
  };
  shareLines?: string[];
  /** Per-signal weekly movement, rendered in the signal-breakdown popover. */
  signalIndicators?: readonly RegimeSignalIndicator[];
  revisitDecisions?: boolean;
  revisitQueue?: readonly RevisitQueueItem[];
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
  tightnessPressure,
  tightnessSaturated,
  riskAppetite,
  riskAppetiteDelta,
  boldnessScore,
  boldnessDelta,
  boldnessTrend,
  boldnessShorthand,
  weeklyCall,
  actionNow,
  regime,
  signalDirection,
  recordDate,
  confidenceLabel,
  trustStatusLabel,
  treasurySource,
  degradedCount,
  isFallback,
  flipConditions,
  guardrail,
  reversalTrigger,
  boundedConditions,
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
  const regimeDisplay = getRegimePublicLabel(regime);
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

  // The bounded rule, as rail coordinates. Rails and rows come off the same
  // clause data, so the rails cannot state a threshold the rows do not.
  const boundedRails = buildBoundedConditionRails({
    pause: boundedConditions?.pause,
    resume: boundedConditions?.resume,
    scores:
      typeof riskAppetite === "number"
        ? { tightness, riskAppetite }
        : undefined,
  });

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
  const dataStatus = resolveDataStatusLabel({ isFallbackSnapshot: isFallback, degradedSourceCount: degradedCount ?? 0 });

  const isTreasuryUrl = treasurySource?.startsWith("http");
  /* The same attribution as `sourceNode`, as plain text. The evidence rows in
   * the change report are a definition list, not prose, so a URL would print
   * there in full where the trust line renders it as the word "FRED". */
  const sourceLabel = isTreasuryUrl ? "FRED" : treasurySource ?? "FRED";
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
          {tightnessSaturated && typeof tightnessPressure === "number" ? (
            <span
              className="ml-1.5 text-fluid-nano font-normal text-amber-300/80"
              title={`Raw pressure is ${tightnessPressure.toFixed(0)} before the 100-point clip`}
            >
              · ceiling ({tightnessPressure.toFixed(0)})
            </span>
          ) : null}
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
            triggerLabel="Watch line"
            viewBoxWidth={220}
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
          {/* The pair is meant to be read together, so it gets a single
              encoding. Funding pressure had a rail and risk appetite had a
              sentence, which left two panels claiming to be a pair while showing
              the reader nothing he could compare. Risk appetite trips low, so the
              rail is inverted and both put trouble on the right. */}
          <div className="mt-1.5 w-full">
            <ThresholdLadder
              idPrefix={`hero-risk-appetite-${idSuffix}`}
              min={0}
              max={100}
              current={riskAppetite}
              previous={
                typeof riskAppetiteDelta === "number" ? riskAppetite - riskAppetiteDelta : undefined
              }
              trigger={riskAppetiteThreshold}
              triggerLabel="Watch line"
              viewBoxWidth={220}
              invert
              signalLabel="Risk appetite"
              scaleDirection={compositeSignalScales.riskAppetite.directionLabel}
            />
          </div>
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
          </div>

        <div className="order-3 min-w-0 space-y-3 sm:order-none sm:col-span-2 sm:col-start-1 sm:row-start-2">
          {showActionNow ? (
            <p className="text-fluid-sm font-medium text-slate-100">
              <span className="text-emerald-300/80">{DECISION_CONTRACT_LABELS.action.doNow}:</span> {actionNow}
            </p>
          ) : null}
          <WeeklyChangeReport
            revisitDecisions={revisitDecisions}
            revisitQueue={revisitQueue}
            noChangeAreas={noChangeAreas}
            signalIndicators={signalIndicators}
            recordDate={recordDate}
            sourceLabel={sourceLabel}
          />

          {/* After the call and the reconsideration list, before the rules the
              stage actually changes. It sat directly under the headline, which
              put a four-way control between the sentence and the list that
              explains it. */}
          <StagePersonaSelector activeStage={activeStage} />

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
            <fieldset className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Signal readout">
              {renderSignalCells("details")}
            </fieldset>
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
                      ? `${pointsToPause} points — ${thresholdBusinessConsequence.consequenceLabel} crossed`
                      : `${pointsToPause} points until ${thresholdBusinessConsequence.consequenceLabel}`}
                  </span>
                ) : null}
              </div>

              {/* The rule, drawn. Three prose rows used to state six numbers
                  across two scales and leave the reader to subtract; a rail per
                  signal puts the reading, the guardrail and the line that clears
                  it on one axis, with the span where neither fires shaded, and
                  the readout under each rail states the distance as a number.
                  The sentences survive only as the copied share lines and as
                  the fallback when a rule carries no numeric line. Both rails
                  run trouble-to-the-right (`invert` flips the falling one),
                  which is what lets the pair read as a small-multiple set. */}
              {boundedRails.length > 0 ? (
                <div
                  className="grid gap-x-4 gap-y-2 sm:grid-cols-2"
                  aria-label="Distance to this week's bounded conditions"
                >
                  {boundedRails.map((rail) => (
                    <div key={rail.metric} className="min-w-0">
                      <p className="flex items-baseline justify-between gap-2 text-fluid-nano text-white/45">
                        <span>{rail.label}</span>
                        <span className="tabular-nums text-white/70">{rail.current}<span className="text-white/35">/100</span></span>
                      </p>
                      <ThresholdLadder
                        idPrefix={`hero-bounded-${rail.metric}`}
                        min={0}
                        max={100}
                        current={rail.current}
                        trigger={rail.guardrail}
                        triggerLabel={DECISION_CONTRACT_LABELS.threshold.guardrail}
                        reversal={rail.clearsAt}
                        reversalLabel={DECISION_CONTRACT_LABELS.reversal.clearsWhen}
                        hysteresisBand
                        invert={rail.invert}
                        signalLabel={rail.label}
                        viewBoxWidth={300}
                      />
                      <dl className="mt-1 grid grid-cols-2 gap-x-3 text-fluid-nano tabular-nums">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.guardrail}</dt>
                          <dd className="text-slate-300">
                            {rail.guardrail}
                            <span className={`ml-1 ${rail.guardrailTripped ? "text-semantic-caution-fg" : "text-white/45"}`}>
                              {formatPointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)}
                            </span>
                          </dd>
                        </div>
                        {rail.clearsAt !== undefined ? (
                          <div className="flex items-baseline gap-1.5">
                            <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}</dt>
                            <dd className="text-slate-300">
                              {rail.clearsAt}
                              <span className={`ml-1 ${rail.clearHolds ? "text-semantic-easing-fg" : "text-white/45"}`}>
                                {formatPointsToLine(rail.pointsToClear, "resume", rail.clearHolds)}
                              </span>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  ))}
                </div>
              ) : null}

              {boundedRails.length > 0 && (boundedConditions?.pauseQualifier || boundedConditions?.resumeQualifier) ? (
                <p className="text-fluid-nano text-white/45">
                  {boundedConditions?.pauseQualifier ? `${DECISION_CONTRACT_LABELS.threshold.guardrail} also trips if ${boundedConditions.pauseQualifier}.` : null}
                  {boundedConditions?.pauseQualifier && boundedConditions?.resumeQualifier ? " " : null}
                  {boundedConditions?.resumeQualifier ? `Clears only when ${boundedConditions.resumeQualifier}.` : null}
                </p>
              ) : null}

              <dl className="space-y-1.5 text-fluid-xs">
                {/* Hue tracks posture: guardrail and reversal are the tighten
                    side. The guardrail and clears-when sentences print only when
                    no rail could be drawn for them; otherwise the readouts above
                    carry the numbers and the sentences would restate them. */}
                {guardrail && boundedRails.length === 0 ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{guardrail}</BoundedValue></dd>
                  </div>
                ) : null}
                {reversalTrigger ? (
                  <div className="flex gap-2">
                    {/* The regime line, not the rule line: this is where the
                        posture itself flips, and it sits at a different number
                        from the rule's guardrail. Named so the reader is not
                        left with two unexplained pairs of thresholds. */}
                    <dt className="shrink-0 font-medium text-semantic-reversal-fg">{DECISION_CONTRACT_LABELS.watch.postureFlips}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{reversalTrigger}</BoundedValue></dd>
                  </div>
                ) : null}
                {flipConditions && flipConditions.length > 0 && boundedRails.length === 0 ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0 font-medium text-slate-400">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}:</dt>
                    <dd className="text-slate-300"><BoundedValue>{flipConditions.join(" · ")}</BoundedValue></dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {/* One copy control per artifact. "Copy Brief" already produces the
              Slack-formatted block (and hands off to the native share sheet where
              there is one), so the separate Slack button duplicated it.

              Everything in this row acts on the brief. "Present" used to sit at
              the end of it and changes the page's display mode instead, so it
              moved to the header beside theme and settings. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`} lines={shareLines} showLabel />
            {/* Takes no payload: it reads the same published artifact the share
                panel and the presentation frames read. The literal that used to
                sit here made the hero a second definition of the week's call. */}
            <CopyMeetingSlideButton />
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
          <p className="mt-1 text-fluid-xs font-medium text-white/50">
            Boldness budget
          </p>
          {trendPoints && trendDomain ? (
            /* Still a sparkline — no axes, no gridlines, no legend — but sized to
               the column instead of to a line of type. At six em on nano text it
               drew 72x14px, which is under the width the series has points and
               too short for the shaded quartile band to separate from the stroke:
               the one graphic that answers "is 57 a normal reading?" was the one
               nobody could decode. The domain stays in text beside it because the
               scale is still fitted to the window. */
            <figure className="mt-1.5 flex flex-col items-center text-fluid-nano">
              <Sparkline
                points={trendPoints}
                label="Boldness budget"
                domain={trendDomain}
                band={trendBand}
                tone={trendTone}
                widthEm={14}
                className="text-white/60"
              />
              <figcaption className="mt-1 w-full max-w-[14em] tabular-nums text-white/45">
                <span className="flex items-baseline justify-between gap-2">
                  <span>{trendPoints.length} mo</span>
                  <span>{rangeLabel(trendDomain)}</span>
                </span>
              </figcaption>
            </figure>
          ) : null}
          <p className="text-fluid-nano leading-snug text-white/40">
            How much room you have to hire, spend, and commit.
          </p>
        </div>
      </div>
    </section>
  );
}
