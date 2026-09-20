import { REGIME_DESCRIPTOR, formatBoldnessDeltaLabel } from "../viewModel";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS, OPERATING_LATITUDE_LABEL } from "../../lib/report/reportCopy";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { DeltaGlyph } from "./illustrations/DeltaGlyph";
import { trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";
import type { RegimeKey } from "../../lib/types";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../../lib/report/homeBriefModel";
import { WeeklyChangeReport } from "./hero/weeklyChangeReport";
import { buildBoundedConditionRails, parenthesizePointsToLine } from "../../lib/report/operatingCalls";
import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";
import type { RuleCondition } from "../../lib/report/boundedDecisionRules";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { GlossaryLink, PlainEnglishScoreNote } from "./ui/plainLanguage";
import { UrlDetails } from "./ui/urlDetails";
import { BoundedValue } from "./ui/boundedValue";
import {
  classifyScoreBand,
  scoreBandScaleLabel,
  compositeSignalScales,
} from "../../lib/report/signalTranslations";
import type { SparklinePoint } from "./ui/sparkline";
import { ShareBriefButton } from "./shareBriefButton";
import { CopyMeetingSlideButton } from "./CopyMeetingSlideButton";
import { resolveDataStatusLabel } from "../../lib/report/trustStatus";
import { formatConfidenceChipLabel } from "../../lib/report/reportFormatting";
import { StatusLiveIcon, StatusStaticIcon } from "./uiIcons";
import { StagePersonaSelector } from "./StagePersonaSelector";
import { RunwayPersonaSelector } from "./RunwayPersonaSelector";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { RunwayBand } from "../../lib/report/operatorRunway";
import { REGIME_WEATHER_LABELS, REGIME_WEATHER_RATIONALES } from "../../lib/regimePresentation";
import { describeInputMovement } from "../../lib/report/inputMovement";
import { describeWindowPosition } from "../../lib/report/windowPosition";
import Link from "next/link";
import { Sun, Cloud, Zap, Snowflake, ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

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
  activeRunway?: RunwayBand;
  /**
   * Which constraint binds this week — cash or the corridor — once a runway band
   * has reshaped the stage rule. Unset when the band is the default, so an
   * uncalibrated brief prints nothing here.
   */
  runwayEmphasis?: string;
  /**
   * The heading level for the call. `h1` by default — it is the page's subject.
   * `h2` on the one state where a cadence card above it carries the call the
   * reader asked for; an `h2` above an `h1`, or two `h1`s, both invert the
   * document outline.
   */
  titleLevel?: "h1" | "h2";
  signalData?: {
    baseRate?: number | null;
    baseRateUsed?: string;
    curveSlope?: number | null;
    macroContributors?: string[];
    tightnessThreshold?: number;
    riskAppetiteThreshold?: number;
    flipProximity?: string[];
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
  postureLabel,
  signalDirection: _signalDirection,
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
  titleLevel = "h1",
  signalData,
  activeStage = "series-a",
  activeRunway,
  runwayEmphasis,
}: Props) {
  const regimeDisplay = getRegimePublicLabel(regime);
  const tightnessDeltaSign = tightnessDelta > 0 ? "+" : tightnessDelta < 0 ? "" : "";
  const tightnessDeltaLabel = tightnessDelta !== 0 ? `${tightnessDeltaSign}${tightnessDelta.toFixed(1)} pts` : "unchanged";
  const _boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);

  // Band words and band sentences have to come from the same classification, or
  // the card says "low" above a sentence that says "balanced".
  /* The scale-position wording, not the bare band word. Every place this
     string renders has a pause line or a posture line within sight of it, and
     "moderate" beside "pause line crossed" reads as a contradiction rather
     than as two different questions being answered. */
  const tightnessBand = classifyScoreBand(tightness);
  const tightnessLevel = scoreBandScaleLabel(tightnessBand);
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
  const riskAppetiteLevel = riskAppetiteBand ? scoreBandScaleLabel(riskAppetiteBand) : undefined;
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
  // The score against its own window, as a rank. "Operating latitude" names
  // the number; this says whether 33 is low, which is what a reader who has
  // not seen the page before is asking.
  const trendPosition = trendValues && trendPoints
    ? describeWindowPosition(boldnessScore, trendValues, `since ${trendPoints[0].label}`)
    : null;

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
  const _showActionNow = actionNow && actionNow.trim() !== normalizedCall && actionNow.trim() !== "";

  // Mobile-collapsed signal readout (DD-004): the summary line keeps all three
  // values visible, so collapsing hides only deltas and descriptors.
  const signalReadoutSummary = [
    `Funding pressure ${tightness} ${tightnessLevel}`,
    typeof riskAppetite === "number" && riskAppetiteLevel
      ? `Risk appetite ${riskAppetite} ${riskAppetiteLevel}`
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
          <span className={`text-fluid-nano font-normal ${tightnessLevelColor}`}>{tightnessLevel}</span>
          {tightnessSaturated && typeof tightnessPressure === "number" ? (
            <span
              className="ml-1.5 text-fluid-nano font-normal text-amber-300/80"
              title={`Raw pressure is ${tightnessPressure.toFixed(0)} before the 100-point clip`}
            >
              · ceiling ({tightnessPressure.toFixed(0)})
            </span>
          ) : null}
        </p>
        {tightnessDelta === 0 && tightnessSaturated ? (
          /*
           * A clipped score cannot move, so the delta row rendered nothing at
           * exactly the moment conditions were most extreme — the reader saw
           * 100/100 and no direction, and had to infer from the ceiling tag
           * beside it that the silence meant "off the top" rather than "flat".
           * Say it. The raw pressure is in the tag; what is missing is that the
           * score has stopped being able to report a move.
           */
          <p className="mt-0.5 text-fluid-nano text-amber-300/70">
            At the ceiling — a clipped score cannot show a weekly move.
          </p>
        ) : tightnessDelta !== 0 ? (
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
            triggerLabel={DECISION_CONTRACT_LABELS.watch.postureFlips}
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
            <span className={`text-fluid-nano font-normal ${riskAppetiteLevelColor ?? ""}`}>{riskAppetiteLevel ?? ""}</span>
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
              triggerLabel={DECISION_CONTRACT_LABELS.watch.postureFlips}
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
        {/* The flip watch: the distance to the boundary in the market's units
            rather than in score points, nearest move first. The rails above
            show how far each score sits from its line; this says what has to
            happen on the curve or the bill for that line to be crossed. */}
        {signalData?.flipProximity && signalData.flipProximity.length > 0 ? (
          <div className="mt-1.5 border-t border-slate-800/60 pt-1.5">
            <p className="text-fluid-nano font-semibold uppercase tracking-[0.08em] text-white/40">
              {DECISION_CONTRACT_LABELS.watch.flipWatch}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {signalData.flipProximity.map((sentence) => (
                <li key={sentence} className="text-fluid-nano leading-snug text-white/60">
                  {sentence}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );

  const weatherIconMap: Record<string, typeof Sun> = {
    EXPANSION: Sun,
    DEFENSIVE: Cloud,
    VOLATILE: Zap,
    SCARCITY: Snowflake,
  };
  const WeatherIcon = regimeKey ? weatherIconMap[regimeKey] : Sun;
  const TitleTag = titleLevel;
  const regimeWeatherLabel = (regimeKey ? REGIME_WEATHER_LABELS[regimeKey] : regimeDisplay).toUpperCase();

  /* The card names its own regime so the surface, the stamp and the sparkline
     take their colour from `data-regime` (tokens.css) — the same source as the
     copy, so they cannot disagree with it. The landscape artwork that used to
     sit here is gone: its `relative` beat its `absolute`, so it rendered as a
     200px block above the call in every viewport, and in light mode as a
     hard-edged grey rectangle. The stamp's glyph carries the weather. */
  return (
    /*
     * `id="share-ready-artifact"` lives here, on the card that actually is the
     * share-ready artifact. It used to sit on a visually hidden `h1` in
     * `app/page.tsx`, which meant the screenshot capture waited on a zero-size
     * element and the "copy weekly brief" anchor jumped to nothing.
     */
    <section
      id="share-ready-artifact"
      className="weather-card weather-hero-card relative overflow-hidden p-4 sm:p-6 lg:p-7"
      aria-labelledby="weekly-call-title"
      data-regime={regimeKey ?? undefined}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:gap-6 sm:grid sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start sm:gap-y-3">
          <div className="order-1 min-w-0 space-y-2 sm:col-start-1 sm:row-start-1">
            {/* The regime stamp: sharp (§XIV), in the regime's own ink with visual weather glyph. */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                style={{
                  color: "var(--regime-ink)",
                  borderColor: "color-mix(in srgb, var(--regime-accent) 40%, transparent)",
                  backgroundColor: "color-mix(in srgb, var(--regime-accent) 14%, transparent)",
                }}
              >
                {regimeKey ? (
                  <span className="inline-block w-4 shrink-0" aria-hidden="true">
                    <RegimeGlyph idPrefix="hero-stamp" regime={regimeKey} />
                  </span>
                ) : (
                  <WeatherIcon size={14} aria-hidden="true" />
                )}
                <span>{regimeWeatherLabel}</span>
              </span>
            </div>

            {/* The homepage's `h1`. It was an `h2` under a visually hidden
                `h1` reading "Weekly Brief", so the one heading a crawler and a
                screen-reader user meet first said nothing this week that it did
                not say every week, while the sentence that carries the call was
                a level down. The call is the page.

                `titleLevel` drops it to `h2` on the one state where something
                above it outranks it: with a cadence selected, that card's
                headline is the call the reader asked for and this one is the
                weekly detail beneath it. Two `h1`s, or an `h2` above the `h1`,
                would both invert the outline. */}
            <TitleTag
              id="weekly-call-title"
              style={{ viewTransitionName: "page-title" }}
              className="max-w-2xl text-pretty font-sans text-display font-semibold leading-[1.2] tracking-[-0.012em] text-white"
            >
              {weeklyCall ?? boldnessShorthand ?? `${regimeDisplay} posture`}
            </TitleTag>

            <p className="text-xs sm:text-sm font-normal text-slate-300 max-w-xl leading-relaxed">
              {(_showActionNow ? actionNow : (regimeKey ? REGIME_WEATHER_RATIONALES[regimeKey] : REGIME_DESCRIPTOR[regime])) ?? "Expand GTM and product bets only where activation and retention are tracking."}
            </p>

            <p className="text-xs font-medium text-slate-400">
              {`${postureLabel || "Steady"} posture with ${describeInputMovement(tightnessDelta, riskAppetiteDelta ?? 0)}.`}
            </p>
          </div>

          {/* Executive Room to Act Score Block (All Viewports) */}
          <div className="order-2 min-w-0 sm:order-none sm:col-start-2 sm:row-start-1 flex flex-col items-start sm:items-end justify-start gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-[-0.02em] text-white">
                {boldnessScore}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">/100</span>
              {boldnessDelta !== 0 ? (
                /* The tightening / easing tokens, not a rose and an emerald
                   picked here: every other delta on the page reads them, and
                   the light theme's 700-level inks live on the tokens. */
                <span className={`ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums ${
                  boldnessDelta < 0
                    ? "border-semantic-tightening-border/30 bg-semantic-tightening-border/15 text-semantic-tightening-fg"
                    : "border-semantic-easing-border/30 bg-semantic-easing-border/15 text-semantic-easing-fg"
                }`}>
                  {boldnessDelta < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                  <span>{boldnessDelta > 0 ? `+${boldnessDelta}` : boldnessDelta} this week</span>
                </span>
              ) : (
                <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-xs font-medium text-slate-300">
                  <span>Steady vs last week</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400">{OPERATING_LATITUDE_LABEL}</div>

            {trendPoints && trendDomain ? (
              <figure className="mt-1 flex flex-col items-start sm:items-end text-fluid-nano">
                <Sparkline
                  points={trendPoints}
                  label={OPERATING_LATITUDE_LABEL}
                  domain={trendDomain}
                  band={trendBand}
                  tone={trendTone}
                  widthEm={16}
                  className="text-[color:var(--regime-ink)]"
                />
                {/* The line is autoscaled, so a 4-point wobble and a 40-point
                    swing draw the same height. The window and range beside it
                    are what let a reader decode the shape — the rule the
                    sparkline documents and this caller had not been keeping. */}
                <figcaption className="mt-0.5 flex flex-col items-start sm:items-end sm:text-right tabular-nums text-slate-500">
                  {trendPosition ? <span className="text-slate-400">{trendPosition}</span> : null}
                  <span>
                    {`${trendPoints[0].label}–${trendPoints[trendPoints.length - 1].label} · ${rangeLabel(trendDomain)} · `}
                    {/* The record this window is cut from. The memory rail that
                        carried this link drew the same months at the foot of the
                        page; the months are behind the line now, so the link is here. */}
                    <Link href="/history" className="text-slate-400 underline decoration-white/20 underline-offset-2 hover:text-white/80">
                      History
                    </Link>
                  </span>
                </figcaption>
              </figure>
            ) : null}
          </div>

        <div className="order-3 min-w-0 space-y-3 sm:order-none sm:col-span-2 sm:col-start-1 sm:row-start-2">
          <WeeklyChangeReport
            revisitDecisions={revisitDecisions}
            revisitQueue={revisitQueue}
            noChangeAreas={noChangeAreas}
            signalIndicators={signalIndicators}
            recordDate={recordDate}
            sourceLabel={sourceLabel}
          />

          {/* Calibrate stage and runway: displayed on sm+ desktop; mobile has dropdowns in header */}
          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <StagePersonaSelector activeStage={activeStage} />
            <RunwayPersonaSelector activeRunway={activeRunway} />
          </div>
          {runwayEmphasis ? (
            <p
              data-testid="runway-emphasis"
              className="flex items-start gap-1.5 text-xs leading-snug text-amber-200/90"
            >
              <Wallet size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
              <span>{runwayEmphasis}</span>
            </p>
          ) : null}

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
            <fieldset className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Signal readout">
              {renderSignalCells("details")}
            </fieldset>
            {/* The gloss for the headline score sits with the signal glosses rather
                than in a hover-only `title` on the label, which never showed on touch. */}
            <p className="mt-2 text-fluid-nano text-white/45">
              {OPERATING_LATITUDE_LABEL} is calculated from funding pressure and risk appetite, and
              reads as the room to hire, spend, and commit this week.
            </p>
            <p className="mt-1 text-fluid-nano text-white/45">
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
                        triggerLabel={DECISION_CONTRACT_LABELS.threshold.pauseIf}
                        reversal={rail.clearsAt}
                        reversalLabel={DECISION_CONTRACT_LABELS.reversal.changeCourseIf}
                        hysteresisBand
                        invert={rail.invert}
                        signalLabel={rail.label}
                        /* The pair reads as a small-multiple set, and the two
                           rails run opposite axes: `invert` flips the falling
                           signal so trouble sits right on both. That flip was
                           announced only by the numeric end-labels — 0…100 on
                           one rail, 100…0 on the other, at 8px — so a reader
                           comparing marker positions got risk appetite
                           backwards unless they read them. The scale words name
                           each end in the reader's terms and follow the flip,
                           which is what the ladder's `scaleDirection` was built
                           to do; the bounded rails were the one pair of rails
                           that never passed it. */
                        scaleDirection={compositeSignalScales[rail.metric]?.directionLabel}
                        viewBoxWidth={300}
                      />
                      <dl className="mt-1 grid grid-cols-2 gap-x-3 text-fluid-nano tabular-nums">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
                          <dd className="text-slate-300">
                            {rail.guardrail}
                            <span className={`ml-1 ${rail.guardrailTripped ? "text-semantic-caution-fg" : "text-white/45"}`}>
                              {parenthesizePointsToLine(rail.pointsToGuardrail, "pause", rail.guardrailTripped)}
                            </span>
                          </dd>
                        </div>
                        {rail.clearsAt !== undefined ? (
                          <div className="flex items-baseline gap-1.5">
                            <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}</dt>
                            <dd className="text-slate-300">
                              {rail.clearsAt}
                              <span className={`ml-1 ${rail.clearHolds ? "text-semantic-easing-fg" : "text-white/45"}`}>
                                {parenthesizePointsToLine(rail.pointsToClear, "resume", rail.clearHolds)}
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
                  {boundedConditions?.pauseQualifier ? `${DECISION_CONTRACT_LABELS.threshold.pauseIf} also trips if ${boundedConditions.pauseQualifier}.` : null}
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
                    <dt className="shrink-0 font-medium text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.pauseIf}:</dt>
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
                    <dt className="shrink-0 font-medium text-slate-400">{DECISION_CONTRACT_LABELS.reversal.changeCourseIf}:</dt>
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
            <Link
              href="/operate#ops-decision-shield"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 text-xs font-medium text-slate-200 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <span>Stress-test your plan</span>
              <span aria-hidden="true" className="text-slate-400">→</span>
            </Link>
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
              <span>{sourceNode} · {recordDate}{confidenceLabel ? ` · ${formatConfidenceChipLabel(confidenceLabel)}` : ""}</span>
              {trustStatusLabel ? <span className="hidden sm:inline">· {trustStatusLabel}</span> : null}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
