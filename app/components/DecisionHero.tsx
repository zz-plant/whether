import { DIRECTION_LABEL, DIRECTION_COLOR, formatBoldnessDeltaLabel } from "../viewModel";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import type { SignalDirection } from "../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalWaterfall } from "./SignalWaterfall";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import { TrendGlyph, trendDirectionFromDelta, trendToneClass } from "./illustrations/TrendGlyph";
import type { RegimeSignalIndicator, RevisitQueueItem } from "../../lib/report/homeBriefModel";
import { WeeklyChangeReport } from "./hero/weeklyChangeReport";
import { buildBoundedConditionRails, formatPointsToLine } from "../../lib/report/operatingCalls";
import type { ThresholdBusinessConsequence } from "../../lib/report/operatingCalls";
import type { RuleCondition } from "../../lib/report/boundedDecisionRules";
import { Sparkline, interquartileRange, rangeLabel, sparklineDomain } from "./ui/sparkline";
import { GlossaryLink, PlainEnglishScoreNote } from "./ui/plainLanguage";
import { BoundedValue } from "./ui/boundedValue";
import { compositeSignalScales } from "../../lib/report/signalTranslations";
import type { SparklinePoint } from "./ui/sparkline";
import { ShareBriefButton } from "./shareBriefButton";
import { CopyMeetingSlideButton } from "./CopyMeetingSlideButton";
import { resolveDataStatusLabel } from "../../lib/report/trustStatus";
import { StatusStaticIcon } from "./uiIcons";
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

export function DecisionHero({
  tightness,
  tightnessPressure,
  tightnessSaturated,
  riskAppetite,
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
  signalData,
  activeStage = "series-a",
}: Props) {
  const regimeDisplay = getRegimePublicLabel(regime);
  const boldnessDeltaLabel = formatBoldnessDeltaLabel(boldnessDelta);

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

  // One rail per score. A bounded rule supplies the guardrail and clear line;
  // without one the rail draws the regime watch line the call flips on.
  const boundedByMetric = new Map(boundedRails.map((rail) => [rail.metric, rail] as const));
  const signalRails = [
    {
      key: "tightness" as const,
      label: "Funding pressure",
      current: tightness,
      bounded: boundedByMetric.get("tightness"),
      watchLine: signalData?.tightnessThreshold ?? 70,
      fallbackInvert: false,
      scaleDirection: compositeSignalScales.tightness.directionLabel,
      ceiling: tightnessSaturated && typeof tightnessPressure === "number" ? tightnessPressure.toFixed(0) : undefined,
    },
    ...(typeof riskAppetite === "number"
      ? [{
          key: "riskAppetite" as const,
          label: "Risk appetite",
          current: riskAppetite,
          bounded: boundedByMetric.get("riskAppetite"),
          watchLine: signalData?.riskAppetiteThreshold ?? 50,
          fallbackInvert: true,
          scaleDirection: compositeSignalScales.riskAppetite.directionLabel,
          ceiling: undefined,
        }]
      : []),
  ].map((rail) => ({
    ...rail,
    trigger: rail.bounded?.guardrail ?? rail.watchLine,
    triggerLabel: rail.bounded ? DECISION_CONTRACT_LABELS.threshold.guardrail : "Watch line",
    clearsAt: rail.bounded?.clearsAt,
    invert: rail.bounded?.invert ?? rail.fallbackInvert,
  }));


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
              style={{ viewTransitionName: "page-title" }}
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

          {/* Two rails, one per score: the reading, the line that trips this
              week's rule (or the regime watch line when no rule states one),
              both ends of the scale, and one plain-English sentence. This
              replaces a readout grid, a signal-breakdown disclosure, and a
              second set of rails, which between them said the same two
              numbers three times. */}
          <div className="space-y-3 border-t border-white/[0.06] pt-3">
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

            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2" aria-label="Each score against its line">
              {signalRails.map((rail) => (
                <div key={rail.key} className="min-w-0">
                  <p className="flex items-baseline justify-between gap-2 text-fluid-nano text-white/45">
                    <span>{rail.label}</span>
                    <span className="tabular-nums text-white/70">
                      {rail.current}<span className="text-white/35">/100</span>
                      {rail.ceiling !== undefined ? (
                        <span
                          className="ml-1.5 font-normal text-amber-300/80"
                          title={`Raw pressure is ${rail.ceiling} before the 100-point clip`}
                        >
                          · ceiling ({rail.ceiling})
                        </span>
                      ) : null}
                    </span>
                  </p>
                  <ThresholdLadder
                    idPrefix={`hero-rail-${rail.key}`}
                    min={0}
                    max={100}
                    current={rail.current}
                    trigger={rail.trigger}
                    triggerLabel={rail.triggerLabel}
                    reversal={rail.clearsAt}
                    reversalLabel={DECISION_CONTRACT_LABELS.reversal.clearsWhen}
                    hysteresisBand={rail.clearsAt !== undefined}
                    invert={rail.invert}
                    signalLabel={rail.label}
                    scaleDirection={rail.scaleDirection}
                    viewBoxWidth={300}
                  />
                  {rail.bounded ? (
                    <dl className="mt-1 grid grid-cols-2 gap-x-3 text-fluid-nano tabular-nums">
                      <div className="flex items-baseline gap-1.5">
                        <dt className="text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.guardrail}</dt>
                        <dd className="text-slate-300">
                          {rail.bounded.guardrail}
                          <span className={`ml-1 ${rail.bounded.guardrailTripped ? "text-semantic-caution-fg" : "text-white/45"}`}>
                            {formatPointsToLine(rail.bounded.pointsToGuardrail, "pause", rail.bounded.guardrailTripped)}
                          </span>
                        </dd>
                      </div>
                      {rail.bounded.clearsAt !== undefined ? (
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}</dt>
                          <dd className="text-slate-300">
                            {rail.bounded.clearsAt}
                            <span className={`ml-1 ${rail.bounded.clearHolds ? "text-semantic-easing-fg" : "text-white/45"}`}>
                              {formatPointsToLine(rail.bounded.pointsToClear, "resume", rail.bounded.clearHolds)}
                            </span>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  <PlainEnglishScoreNote signalKey={rail.key} score={rail.current} lead="This signal alone" className="mt-1.5" />
                </div>
              ))}
            </div>

            {boundedRails.length > 0 && (boundedConditions?.pauseQualifier || boundedConditions?.resumeQualifier) ? (
              <p className="text-fluid-nano text-white/45">
                {boundedConditions?.pauseQualifier ? `${DECISION_CONTRACT_LABELS.threshold.guardrail} also trips if ${boundedConditions.pauseQualifier}.` : null}
                {boundedConditions?.pauseQualifier && boundedConditions?.resumeQualifier ? " " : null}
                {boundedConditions?.resumeQualifier ? `Clears only when ${boundedConditions.resumeQualifier}.` : null}
              </p>
            ) : null}

            <div className="space-y-1 text-fluid-nano text-white/45">
              {guardrail && boundedRails.length === 0 ? (
                <p><span className="text-semantic-caution-fg">{DECISION_CONTRACT_LABELS.threshold.guardrail}:</span> <BoundedValue>{guardrail}</BoundedValue></p>
              ) : null}
              {reversalTrigger ? (
                /* The regime line, at a different number from the rules'
                   guardrail. One muted sentence, not a fourth labelled row. */
                <p>Call changes if <BoundedValue>{reversalTrigger}</BoundedValue></p>
              ) : null}
              {flipConditions && flipConditions.length > 0 && boundedRails.length === 0 ? (
                <p><span className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.clearsWhen}:</span> <BoundedValue>{flipConditions.join(" · ")}</BoundedValue></p>
              ) : null}
              <p className="text-white/40">
                Unfamiliar with a term? <GlossaryLink>Open the glossary</GlossaryLink>
              </p>
            </div>
          </div>

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
              {/* The status word appears only when there is something to say.
                  "Live" beside every source line was a badge that never changed
                  and so said nothing; a cached read still announces itself. */}
              {isDegradedData ? (
                <span className="inline-flex items-center gap-1.5">
                  <StatusStaticIcon className="size-2 text-amber-300/90" />
                  <span className="text-amber-300">{dataStatus}</span>
                </span>
              ) : null}
              {/* Source, date and confidence stay on mobile. They were behind
                  `hidden sm:inline`, which left the phone showing only "Snapshot"
                  — dropping provenance exactly where the brief gets screenshotted
                  and shared, and losing Confidence, a required field of the
                  screenshot contract. Only the longer trust-status sentence is
                  held back to keep the line from dominating a narrow column. */}
              <span>{sourceNode} · {recordDate}{confidenceLabel ? ` · Confidence ${confidenceLabel}` : ""}</span>
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
