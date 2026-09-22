import { formatBoldnessDeltaLabel } from "../viewModel";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { NO_LIVE_READING_CALL, OPERATING_LATITUDE_LABEL } from "../../lib/report/reportCopy";
import { RegimeGlyph } from "./illustrations/RegimeGlyph";
import type { RegimeKey } from "../../lib/types";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../../lib/report/homeBriefModel";
import { WeeklyChangeReport } from "./hero/weeklyChangeReport";
import { SignalReadoutCells } from "./hero/SignalReadoutCells";
import { BoundedConditionsPanel, type BoundedConditions } from "./hero/BoundedConditionsPanel";
import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { GlossaryLink } from "./ui/plainLanguage";
import { UrlDetails } from "./ui/urlDetails";
import { ActionLink } from "./ui/actionLink";
import { classifyScoreBand, scoreBandScaleLabel } from "../../lib/report/signalTranslations";
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
  /**
   * True when no previous reading was compared. A zero delta then means
   * "nothing was measured", not "nothing moved", and the sentences that read
   * the deltas say so instead of reporting a steady week.
   */
  comparisonUnavailable?: boolean;
  boldnessScore: number;
  boldnessDelta: number;
  /** Trailing monthly boldness readings, oldest first. Omit to hide the sparkline. */
  boldnessTrend?: readonly SparklinePoint[];
  boldnessShorthand?: string;
  weeklyCall?: string;
  actionNow?: string;
  regime: string;
  previousRegime?: string;
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
  boundedConditions?: BoundedConditions;
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

/** The acronym expanded, since this line is its first use on the page. */
const FRED_SOURCE_LABEL = "St. Louis Fed (FRED)";

/**
 * The sentence under the h1, keyed by how the two scores moved this week. One
 * plain noun and a direction; "tightening inputs" was the engine's word for it.
 */
const INPUT_MOVEMENT_SENTENCE: Record<ReturnType<typeof describeInputMovement>, string> = {
  "steady inputs": "Neither score moved much this week.",
  "tightening inputs": "The scores moved toward tighter money this week.",
  "easing inputs": "The scores moved toward easier money this week.",
  "mixed inputs": "The two scores moved in opposite directions this week.",
};

/* A degraded read hands the hero zero deltas. Saying "neither score moved" on
   one would be the manufactured-stable claim tests/noComparisonHonesty.test.ts
   exists to keep off the page. */
const NO_COMPARISON_SENTENCE = "No previous week to compare the scores against.";

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
  comparisonUnavailable = false,
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
   * there in full where the trust line renders it by name. "FRED" is expanded
   * on this, its first use on the page: it is an acronym for a Federal Reserve
   * bank's data service, and nothing else on `/` says so. */
  const sourceLabel = isTreasuryUrl ? FRED_SOURCE_LABEL : treasurySource ?? FRED_SOURCE_LABEL;
  const sourceNode = isTreasuryUrl ? (
    <a
      href={treasurySource}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-white/20 underline-offset-2 hover:text-white/80 hover:decoration-white/40"
    >
      {FRED_SOURCE_LABEL}
    </a>
  ) : (
    <span>{treasurySource ?? FRED_SOURCE_LABEL}</span>
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

            {/* What the weather word means for money, in one sentence, under
                the word itself. It used to render only when the action line
                happened to equal the call — so on a normal week the loudest
                element on the page had no gloss anywhere in the hero. */}
            {regimeKey ? (
              <p className="max-w-xl text-xs leading-relaxed text-slate-400">
                {REGIME_WEATHER_RATIONALES[regimeKey]}
              </p>
            ) : null}

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
              {weeklyCall ?? boldnessShorthand ?? NO_LIVE_READING_CALL.currentCall}
            </TitleTag>

            {/* The action line, only when it says something the call above
                does not. The rationale that used to stand in for it sits
                under the weather word now. */}
            {_showActionNow ? (
              <p className="text-xs sm:text-sm font-normal text-slate-300 max-w-xl leading-relaxed">
                {actionNow}
              </p>
            ) : null}

            {/* How the two scores moved this week, from the same deltas the
                cells below print. "Cloudy — Mid (Fragile) posture with steady
                inputs" was three undefined engine words in the one sentence
                under the h1; the stage label still travels with the exports. */}
            <p className="text-xs font-medium text-slate-400">
              {comparisonUnavailable
                ? NO_COMPARISON_SENTENCE
                : INPUT_MOVEMENT_SENTENCE[describeInputMovement(tightnessDelta, riskAppetiteDelta ?? 0)]}
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
                  <span>{comparisonUnavailable ? "No previous week to compare" : "Steady vs last week"}</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400">{OPERATING_LATITUDE_LABEL} · room to hire, spend and commit</div>

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
              <SignalReadoutCells
                idSuffix="details"
                tightness={tightness}
                tightnessDelta={tightnessDelta}
                tightnessPressure={tightnessPressure}
                tightnessSaturated={tightnessSaturated}
                tightnessLevel={tightnessLevel}
                tightnessLevelColor={tightnessLevelColor}
                tightnessDeltaMetadataLabel={tightnessDeltaMetadataLabel}
                tightnessThreshold={tightnessThreshold}
                riskAppetite={riskAppetite}
                riskAppetiteDelta={riskAppetiteDelta}
                riskAppetiteLevel={riskAppetiteLevel}
                riskAppetiteLevelColor={riskAppetiteLevelColor}
                riskAppetiteDeltaLabel={riskAppetiteDeltaLabel}
                riskAppetiteThreshold={riskAppetiteThreshold}
                regime={regime}
                regimeKey={regimeKey}
                regimeDisplay={regimeDisplay}
                flipProximity={signalData?.flipProximity}
              />
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

          <BoundedConditionsPanel
            flipConditions={flipConditions}
            guardrail={guardrail}
            reversalTrigger={reversalTrigger}
            boundedConditions={boundedConditions}
            thresholdBusinessConsequence={thresholdBusinessConsequence}
            tightness={tightness}
            riskAppetite={riskAppetite}
          />

          {/* One copy control per artifact. "Copy Brief" already produces the
              Slack-formatted block (and hands off to the native share sheet where
              there is one), so the separate Slack button duplicated it.

              Everything in this row acts on the brief. "Present" used to sit at
              the end of it and changes the page's display mode instead, so it
              moved to the header beside theme and settings. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ShareBriefButton text={weeklyCall ?? boldnessShorthand ?? NO_LIVE_READING_CALL.currentCall} lines={shareLines} showLabel />
            {/* Takes no payload: it reads the same published artifact the share
                panel and the presentation frames read. The literal that used to
                sit here made the hero a second definition of the week's call. */}
            <CopyMeetingSlideButton />
            {/* Three actions, one button register: the two copy controls are the
                shared clipboard row and the link is the ghost action link. This
                row used to show a sky tint, a slate shadow and a bare text link
                with an arrow glyph for three things of equal weight. */}
            <ActionLink href="/operate#ops-decision-shield" variant="ghost">
              Test a plan against this week
            </ActionLink>
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
