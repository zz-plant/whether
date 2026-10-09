import type { Metadata } from "next";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { BriefArtifactScript } from "./components/briefArtifactScript";
import { buildBriefArtifact, deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../lib/report/briefArtifact";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { SinceLastVisit } from "./components/home/SinceLastVisit";
import { YourRecordNote } from "./components/home/YourRecordNote";
import { ActivationTracker } from "./components/activationTracker";
import { OperatorWorkflowRouteTracker } from "./components/operatorWorkflowRouteTracker";
import { FirstVisitExplainer } from "./components/homeFirstRunOrientation";
import { TimeMachineCalendarPicker } from "./components/TimeMachineCalendarPicker";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { CadenceSelector } from "./components/cadenceSelector";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel, isRegimeKey } from "../lib/regimePresentation";
import { formatStripMargin } from "../lib/report/reportFormatting";
import { isRoute } from "../lib/navigation/routeType";
import { resolveDataStatusGuidance } from "../lib/report/trustStatus";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatWeekMondayUTC } from "../lib/formatters";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { buildChangedLead } from "../lib/report/decisionMovement";
import { buildCallChangeLine } from "../lib/report/reportEvidence";
import { operatorStageForVariantMode, operatorStageLabel } from "../lib/report/operatorStage";
import { DEFAULT_RUNWAY_BAND, runwayBandPhrase } from "../lib/report/operatorRunway";
import { guardrailMatchesRule, ruleMetricLabel } from "../lib/report/boundedDecisionRules";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { HomeBriefLoadError } from "./components/home/HomeBriefLoadError";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { HistoricalBanner } from "./components/historicalBanner";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WhatChangedSection } from "./components/home/WhatChangedSection";
import { WhatItChangesSection } from "./components/home/WhatItChangesSection";
import { WhatWouldChangeSection } from "./components/home/WhatWouldChangeSection";
import { DoAndShareSection } from "./components/home/DoAndShareSection";
import { ShareBriefButton } from "./components/shareBriefButton";
import {
  HOME_DECISION_PARAM,
  parseHomeDecision,
  buildHomeAreaRows,
  buildHomeQuietDayRead,
  buildSignalChangeRows,
  describeConditionsTrail,
  describeEarlierConditions,
  describeWeeklyMovement,
} from "../lib/report/home/homeSectionModel";
import { findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { describeScoreMovementCaveat } from "../lib/report/scoreMovement";
import { RegimeRadar } from "./components/home/RegimeRadar";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { getLatestTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { JsonLdScript } from "./components/jsonLdScript";
import { PublishedCallWatcher } from "./components/publishedCallWatcher";
import { OfflineNotice } from "./components/offlineNotice";
import { DecisionPicker, type DecisionPickerOption } from "./components/home/DecisionPicker";
import { findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";
import { formatMonthLabel } from "../lib/timeMachine/monthFormatting";
import { findLeadAnswerForArea } from "./answers/decisionPages";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => {
  const resolved = searchParams ? await searchParams : undefined;
  const data = await loadHomePageAssembly(resolved);
  return buildHomeMetadata(searchParams, data.reportData);
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const regimeHistory = getMonthlyRegimeHistory();

  /* PageContent mounts the Shell itself so the page's atmosphere is keyed to
     the week the hero states. It used to be keyed here, to the last month-end
     in the regime history, and the two disagree whenever the call moves
     inside a month: on 2026-09-15 the shell painted a Sunny wash under a
     Freezing call. There is no streaming boundary between the two — app/
     loading.tsx carries the pending state — so nothing is lost by waiting. */
  return <PageContent searchParams={resolved} regimeHistory={regimeHistory} />;
}

/**
 * This view changes every week under one URL, so it cannot be cited or indexed as
 * a dated article. Point at the frozen copy of the week instead.
 *
 * Gated on how far the archive has fallen behind. When the freeze job stops
 * running this module keeps rendering the last week it managed to write, which
 * stamps an old date onto the one screen whose entire claim is that it is
 * current — the module then argues against the page it sits on. Rendering
 * nothing is the safer failure.
 */
/* The card carries no elevation: it sits inside the brief column, and a nested
 * box that lifts off its own container is what the depth ladder in surfaces.css
 * exists to prevent. That rule cannot reach a shadow written as a utility, so
 * this one stays removed at the call site. */
/** Only the horizons the cadence selector offers. `yearly` is a valid agent cadence but
 *  has no tab, so an arbitrary ?cadence= value falls back to the weekly default. */
const HOME_CADENCE_HORIZONS: readonly CadenceCallHorizon[] = ["monthly", "quarterly"];

const resolveHomeCadence = (value: string | undefined): CadenceCallHorizon | "weekly" =>
  HOME_CADENCE_HORIZONS.find((horizon) => horizon === value) ?? "weekly";

/** Month-ends on the conditions map's path: half a year, enough to show a direction without crowding the plane. */
const CONDITIONS_TRAIL_MONTHS = 6;

async function PageContent({
  searchParams,
  regimeHistory,
}: {
  searchParams?: HomePageSearchParams;
  regimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
}) {
  const activeCadence = resolveHomeCadence(searchParams?.cadence);

  let data: Awaited<ReturnType<typeof loadHomePageAssembly>>;

  try {
    data = await loadHomePageAssembly(searchParams);
  } catch {
    return (
      <Shell>
        <HomeBriefLoadError />
      </Shell>
    );
  }

  const { homepage, reportData } = data;
  const isDegraded = !homepage.reportResult.ok;

  const timeMachineRequest = parseTimeMachineRequest(searchParams);
  const operateHref = buildTimeMachineHref("/operate", timeMachineRequest);

  /*
   * `/signals` and `/operate` have marked the archived view since the time machine
   * shipped; `/` never did, and `/` is where the picker in the header actually lands
   * you (`router.push("/?month=…&year=…")`). The only signals were a "Mar 2020" chip
   * inside the timeline rail, which reads as a timeline label rather than a mode, and
   * a "PARTLY CACHED" line in the provenance strip. So the hero — the thing this
   * product exists to have screenshotted into Slack — announced a March 2020 call in
   * exactly the layout it uses for this week's.
   *
   * Resolved, not parsed: `resolveTimeMachineSelection` checks coverage, so a
   * hand-typed `?month=99` falls back to the live brief instead of claiming an
   * archived view of a month that has no data.
   */
  const historicalSelection = resolveTimeMachineSelection(searchParams);
  /* Set by the Slack and agenda copy formats on the link they print
     (`resolveSharedBriefUrl`), so a reader who followed a teammate's paste is
     greeted as one. Any other value of `ref` is somebody else's tag. */
  const arrivedFromShare = searchParams?.[SHARE_REFERRAL_PARAM] === SHARE_REFERRAL_VALUE;
  const previousHistoricalRequest = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const nextHistoricalRequest = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "next")
    : null;
  const latestSnapshot = getLatestTimeMachineSnapshot();
  const prevWeekHref = historicalSelection
    ? (previousHistoricalRequest ? buildTimeMachineHref("/", previousHistoricalRequest) : null)
    : (latestSnapshot ? buildTimeMachineHref("/", { month: latestSnapshot.month, year: latestSnapshot.year }) : null);
  const nextWeekHref = historicalSelection
    ? (nextHistoricalRequest ? buildTimeMachineHref("/", nextHistoricalRequest) : "/")
    : null;

  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const activeStage = homepage.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode;
  const activeRunway = homepage.weeklyCall.runwayBand ?? data.operatorContext.companyRunway ?? undefined;
  // Only a band that reshaped the rule carries a label; the default band leaves
  // the stage rule alone and this stays undefined.
  const runwayScopedAdjustment = homepage.weeklyCall.stageScopedAdjustments?.[activeStage];
  const runwayEmphasis = runwayScopedAdjustment?.runwayLabel
    ? runwayScopedAdjustment.thresholdEmphasis
    : undefined;

  /* The week by its Monday, as the frozen brief and every share name it. The
     reading's own date (often a Wednesday) is the trust strip's "Data as of". */
  const weekOfLabel = `Week of ${formatWeekMondayUTC(reportData.treasury.record_date)}`;
  const asOfDate = timeMachineRequest
    ? resolveHistoricalDate(timeMachineRequest.year, timeMachineRequest.month)
    : null;
  const asOfTimestamp = asOfDate ? new Date(asOfDate).getTime() : Number.NaN;
  const alignedRegimeHistory = Number.isFinite(asOfTimestamp)
    ? regimeHistory.filter((entry) => new Date(entry.record_date).getTime() <= asOfTimestamp)
    : regimeHistory;

  /* Last week, through the one derivation every surface and export shares:
     null when no comparison was made, the anomaly list counted (a move past the
     weekly sanity limit is still a move), and a signal under the reporting floor
     read as unmoved rather than as missing. Reading `changedSignals` alone here
     drew a 55-point week as flat and dropped last week whenever nothing moved. */
  const previousScores = previousScoresFromDynamics(
    homepage.weeklyDecisionCardModel.decision.reportDynamics,
    { tightness: reportData.assessment.scores.tightness, riskAppetite: reportData.assessment.scores.riskAppetite },
  );
  /* What that earlier reading is: last week's published brief, or the previous
     month-end where the archive has none, named by its date wherever this page
     used to say "last week". */
  const basis = comparisonBasis(homepage.weeklyDecisionCardModel.decision.reportDynamics.comparedWith);
  const tightnessDelta = previousScores ? reportData.assessment.scores.tightness - previousScores.tightness : 0;
  const riskAppetiteDelta = previousScores ? reportData.assessment.scores.riskAppetite - previousScores.riskAppetite : 0;

  // Built here rather than fetched: the previous card awaited the whole agent-interface
  // payload behind Suspense and swallowed its failure, which is why every cadence tab
  // rendered the same page. Everything it needs is already loaded and in hand.
  const cadenceCall =
    activeCadence === "weekly"
      ? null
      : buildCadenceCallModel({
          horizon: activeCadence,
          assessment: reportData.assessment,
          recordDate: reportData.treasury.record_date,
          recordDateLabel: homepage.reportShell.recordDateLabel,
          regimeHistory: alignedRegimeHistory,
          planHref: operateHref,
          previousScores,
        });

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const tightnessPressure = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightnessPressure;
  const tightnessSaturated = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightnessSaturated;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;

  /* The sticky strip's badge, from the headline's own tone. It searched
     `trendLabel` ("Improving", "Deteriorating", …) for "tighten" and "ease",
     which no label contains, so the badge read "Steady" on every week, the
     tightening ones included. No badge where the hero states no direction
     either: nothing to compare, a held week, or an archived one. */
  const weeklyTone = historicalSelection ? null : homepage.weeklyDecisionCardModel.status.weeklyTone ?? null;
  const signalDirection: SignalDirection | undefined =
    weeklyTone === "tightening" ? "tighten"
    : weeklyTone === "easing" ? "ease"
    : weeklyTone === "holding" ? "hold"
    : undefined;

  /* `/share` builds the same object from the same fields, so the derivation
   * lives in lib/report rather than here — the guardrail label alone has three
   * fallbacks, and a second copy of that is how two surfaces come to state
   * different thresholds for one week. */
  const {
    headline,
    primaryCall,
    flipConditionLabels,
    guardrailLabel,
    parsedGuardrailThreshold,
    reversalTriggerLabel,
    resumeWhenLabel,
    briefShareLines,
  } = deriveBriefCallFields(homepage.weeklyDecisionCardModel, homepage.weeklyCall);
  /* The card prints the headline action; the week's direction rides on the
     stamp line. Copy Brief, the sticky strip and every paste print the two as
     one sentence pair (`headline.composed`). */
  const cardCall = { action: headline.action, directionLabel: headline.directionLabel };

  /* The change line in the market's units, line by line in the order the
     "Conditions change if" sentence names them; none on a held week, whose
     sentence is the hold's condition (`buildFlipProximity`). Only the "In
     interest-rate terms" fold under that sentence prints them. */
  const v2HeroSignalData = {
    ...buildV2HeroSignalData(reportData),
    flipProximity: buildFlipProximity(reportData.assessment),
  };

  /* The quiet-day read: on a live week whose guidance held, what would change
     it, from the same builder as every paste's "Conditions change if"
     (`buildCallChangeLine`): the nearer line in points, or a held week's own
     condition. Never on a week the guidance moved (a crossed pause or resume
     line, or new conditions: `guidanceChange`, not the latitude's move), and
     never on an archived week, which the banner above dates. */
  const quietDayLine = buildHomeQuietDayRead(homepage, { historical: Boolean(historicalSelection) });
  const callChangeLine = buildCallChangeLine({ weeklyCall: homepage.weeklyCall, assessment: reportData.assessment });

  // The first rule is the one whose pause sentence the guardrail slot prints
  // (`reportDataLoader` reads `actionStripItems[0]`), so its lines are the ones
  // the rails may draw — but only when that is in fact the sentence being
  // printed. A stage-scoped or policy-override guardrail replaces the sentence
  // with one these lines do not describe, and the hero hides the sentence
  // whenever rails exist, so passing the canonical lines there would swap the
  // active override for a generic corridor.
  const corridorRule = homepage.weeklyDecisionCardModel.decision.decisionRules[0];
  const boundedConditions = corridorRule && guardrailMatchesRule(guardrailLabel, corridorRule, parsedGuardrailThreshold)
    ? {
        pause: corridorRule.pause.conditions,
        resume: corridorRule.resume.conditions,
        pauseQualifier: corridorRule.pause.qualifier,
        resumeQualifier: corridorRule.resume.qualifier,
      }
    : undefined;

  /* The selected horizon, named once. The page's `h1` is the weekly call
   * itself (`DecisionHero`); this labels the copied artifact, which lands in
   * someone else's Slack channel where it is the only thing identifying the
   * source, and the meta row's date. */
  const cadenceTitle = cadenceCall
    ? [cadenceCall.cadenceLabel, cadenceCall.periodLabel].filter(Boolean).join(" — ")
    : null;

  /* Published for the globally-mounted share panel and the presentation
   * frames, which sit outside this route's props — and for `/share`, which
   * builds the same object from the same builder. */
  const briefArtifact = buildBriefArtifact({
    homepage,
    recordDate: reportData.treasury.record_date,
    title: cadenceTitle ?? "Whether Weekly Brief",
  });

  /* The five sections' data, built once here and drawn by the components under
     app/components/home. The lines every score is judged against are the same
     three the rules state: the area pause/resume lines from the printed rule,
     and the call-change line from the engine's own thresholds. */
  const callChangeLines = {
    tightness: reportData.assessment.thresholds.tightnessRegime,
    riskAppetite: reportData.assessment.thresholds.riskAppetiteRegime,
  };
  const comparisonUnavailable =
    homepage.weeklyDecisionCardModel.decision.reportDynamics.directionLabel === "unavailable";
  const metricLines = {
    tightness: {
      pause: boundedConditions?.pause.find((condition) => condition.metric === "tightness")?.value,
      resume: boundedConditions?.resume.find((condition) => condition.metric === "tightness")?.value,
      callChange: callChangeLines.tightness,
    },
    riskAppetite: {
      pause: boundedConditions?.pause.find((condition) => condition.metric === "riskAppetite")?.value,
      resume: boundedConditions?.resume.find((condition) => condition.metric === "riskAppetite")?.value,
      callChange: callChangeLines.riskAppetite,
    },
  };
  const signalChangeRows = buildSignalChangeRows({
    indicators: homepage.weeklyDecisionCardModel.diagnostics.regimeSignalIndicators,
    dynamics: homepage.weeklyDecisionCardModel.decision.reportDynamics,
    lines: metricLines,
    tightnessPressure,
    tightnessSaturated,
  });
  const decisionMovement = homepage.weeklyDecisionCardModel.decision.decisionMovement;
  const homeAreaRows = buildHomeAreaRows({
    actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: homepage.weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: decisionMovement,
    scores: { tightness, riskAppetite },
  });
  /* The section's lead is what the week did to the decisions: which areas' lines
     were crossed, or that none were. The score-direction sentence is what remains
     where no lines could be read. */
  const movementSentence = buildChangedLead({
    movement: decisionMovement,
    quietDayLine,
    fallback: describeWeeklyMovement({ tightnessDelta, riskAppetiteDelta, comparisonUnavailable, basis }),
  });
  const scoreLadders = [
    {
      metric: "tightness" as const,
      label: ruleMetricLabel.tightness,
      value: tightness,
      previous: previousScores ? Number((tightness - tightnessDelta).toFixed(1)) : null,
      lines: signalChangeRows.find((row) => row.key === "tightness")?.lines ?? [
        { kind: "callChange" as const, value: callChangeLines.tightness },
      ],
    },
    {
      metric: "riskAppetite" as const,
      label: ruleMetricLabel.riskAppetite,
      value: riskAppetite,
      previous: previousScores ? Number((riskAppetite - riskAppetiteDelta).toFixed(1)) : null,
      lines: signalChangeRows.find((row) => row.key === "riskAppetite")?.lines ?? [
        { kind: "callChange" as const, value: callChangeLines.riskAppetite },
      ],
    },
  ];
  /* Only on a week the call moved: the last time it moved the same way, and
     what the scores did over the three months after. Null otherwise, and the
     section renders nothing rather than reaching for the nearest analogue. */
  const previousRegime = reportData.regimeAlert?.previousRegime;
  const lastTimeCallChanged = historicalSelection || !isRegimeKey(regime)
    ? null
    : findLastTimeCallChanged({
        series: getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER),
        currentRegime: regime,
        previousRegime: previousRegime && isRegimeKey(previousRegime) ? previousRegime : null,
        currentScores: { tightness, riskAppetite },
      });
  /* The first-visit fold applies to the live weekly brief only. An archived
     month or a monthly horizon was reached by choosing it, which is not a
     first-time reader's arrival. */
  const offersFirstVisitFold = !historicalSelection && activeCadence === "weekly";
  const decisionPickerOptions: DecisionPickerOption[] = decisionAreaOrder.flatMap((area) => {
    const row = homeAreaRows.find((candidate) => candidate.area === area);
    if (!row) return [];
    const answer = findLeadAnswerForArea(area);
    return [{ ...row, answer: answer ? { href: `/answers/${answer.slug}`, title: answer.title } : undefined }];
  });
  const turningPoints = findRecentCallChanges(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER), 4).map((change) => ({
    label: `${formatMonthLabel(change.year, change.month)}, ${change.fromLabel} to ${change.toLabel}`,
    href: buildTimeMachineHref("/", { month: change.month, year: change.year }),
  }));
  /* The conditions map's path: the month-end readings before this reading's
     month, oldest first. The month in progress is left out, because the cron
     writes it from the same week the current point already draws. */
  const currentMonthKey = reportData.treasury.record_date.slice(0, 7);
  const conditionsTrailEntries = alignedRegimeHistory
    .filter((entry) => entry.record_date.slice(0, 7) < currentMonthKey)
    .flatMap((entry) =>
      typeof entry.tightness === "number" && typeof entry.riskAppetite === "number"
        ? [{ recordDate: entry.record_date, tightness: entry.tightness, riskAppetite: entry.riskAppetite }]
        : [],
    )
    .slice(-CONDITIONS_TRAIL_MONTHS);
  /* The path is month-ends whichever reading the week compares with, so its
     like-for-like note reads the month-end split and is dated by the month-end. */
  const conditionsTrail = {
    points: conditionsTrailEntries.map((entry) => ({
      tightness: entry.tightness,
      riskAppetite: entry.riskAppetite,
      label: formatDateUTC(entry.recordDate),
    })),
    caption: describeConditionsTrail(conditionsTrailEntries.map((entry) => entry.recordDate)),
    caveat: describeScoreMovementCaveat(
      reportData.monthEndComparison?.movement,
      comparisonBasis(reportData.monthEndComparison?.comparedWith),
    ),
  };
  /* On a reading whose conditions differ from the earlier one, the card's stamp
     line says what they were, dated by the comparison's own basis. */
  const earlierConditions =
    !historicalSelection && previousRegime && previousRegime !== regime
      ? describeEarlierConditions({ previousLabel: getRegimePublicLabel(previousRegime), basis })
      : undefined;
  const trustStripProps = buildTrustStripProps({
    recordDateLabel: homepage.reportShell.recordDateLabel,
    isFallback: homepage.reportShell.showOfflineBadge,
    isHistorical: Boolean(historicalSelection),
    degradedSourceCount: homepage.reportShell.degradedSourceRows?.length ?? 0,
    confidenceLabel: confidenceLabel ?? "HIGH",
    assessment: reportData.assessment,
  });

  return (
    <Shell regime={regime}>
      <BriefArtifactScript artifact={briefArtifact} />
      <ActivationTracker path="/" />
      {/* `/` was always one of the routes the tracker accepts and never mounted
          it, so a move from the brief to `/signals`, `/operate` or `/resolve`
          went unrecorded and read the same as closing the tab. */}
      <OperatorWorkflowRouteTracker />
      {isDegraded ? (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-fluid-micro text-amber-300/70">
          {resolveDataStatusGuidance({
            isFallbackSnapshot: homepage.reportShell.showOfflineBadge,
            degradedSourceCount: homepage.reportShell.degradedSourceRows?.length ?? 1,
          })}
        </div>
      ) : null}
      {historicalSelection ? (
        <div className="mx-auto max-w-[64rem]">
          <HistoricalBanner
            year={historicalSelection.year}
            month={historicalSelection.month}
            asOfLabel={formatDateUTC(historicalSelection.asOf)}
            liveHref="/"
          />
        </div>
      ) : null}
      <div className="mx-auto max-w-[64rem] space-y-4 sm:space-y-8">
        <div className="weather-brief-flow">
          {/* Above the brief, not after it. This is the orientation line for a
              first-time visitor, and it sat below the hero, all three operating
              levers, and the compare strip — roughly 2,800px down on mobile,
              where it cannot orient anyone. Its own bottom-border styling was
              always that of a top strip. Hiding once dismissed is a global CSS
              rule keyed on the data attribute (app/layout.tsx), so it stays
              pre-paint and CLS-free at either position. */}
          {/* Above everything, because its whole subject is that what follows
              may no longer be current. Renders nothing until a poll finds the
              published call has moved, so on the overwhelming majority of
              visits it is not on the page at all. */}
          {/* Pairs with the service worker: it serves the last copy this
              browser saw, and this names the reading that copy contains. A
              cache without the label is the staleness this repo has already
              paid for twice. */}
          <OfflineNotice recordDateLabel={reportData.recordDateLabel} />
          <PublishedCallWatcher
            rendered={{ week: reportData.treasury.record_date, regime: reportData.assessment.regime }}
          />
          <FirstVisitExplainer
            arrival={arrivedFromShare ? "share" : undefined}
            currentRegime={historicalSelection ? undefined : regime}
          />
          {/* Browse the week before the call. Horizon and confidence details
              follow the call beside Copy Brief, so wrapping controls cannot
              push the reading below the first phone viewport. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <div>
              <div className="flex items-center gap-2">
                {prevWeekHref ? (
                  <Link
                    href={prevWeekHref}
                    aria-label="Previous week"
                    className="weather-hit-box flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-colors no-underline"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800/40 bg-slate-900/30 text-slate-600 cursor-not-allowed">
                    <ChevronLeft size={16} />
                  </span>
                )}

                {/* Navigation coverage stays unfiltered: an archived month is a
                    filtered chart, not a filtered calendar. Passing the aligned
                    series here removed every period after the archived month. */}
                <TimeMachineCalendarPicker
                  currentDateLabel={cadenceTitle ?? weekOfLabel}
                  isHistorical={Boolean(historicalSelection)}
                  history={regimeHistory}
                />

                {nextWeekHref ? (
                  <Link
                    href={nextWeekHref}
                    aria-label="Next week"
                    className="weather-hit-box flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-colors no-underline"
                  >
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800/40 bg-slate-900/30 text-slate-600 cursor-not-allowed">
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* No timeline scrubber above the call any more. The meta row's chevrons
              and calendar picker are the period controls; the regime stripe
              below the drivers is the memory rail (spec Block G: last months, no
              full chart). The zoomable scrubber lives on /history. */}
            {/* `aria-label`, not a visually hidden `h2`. The label named the
                region, but it rendered as a heading *above* the page's `h1` and
                so was the first thing a screen-reader heading list announced —
                the call itself was second. The region still has a name; it is
                no longer a heading competing with the one that matters. */}
            {/* Tier 1, and nothing else: the weather word, the call, and the
                trust strip. Every other question the reader asks is a section
                of its own below, in the order they ask them. */}
            <div id="weekly-call" data-page-section="weekly-call" tabIndex={-1} aria-label="This week’s operating guidance" className="order-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
              {cadenceCall ? <CadenceCallCard model={cadenceCall} titleLevel="h1" /> : null}
              <DecisionHero
                titleLevel={cadenceCall ? "h2" : "h1"}
                weeklyCall={cardCall.action}
                regime={regime}
                direction={historicalSelection ? undefined : cardCall.directionLabel}
                earlier={earlierConditions}
                aside={
                  <RegimeRadar
                    tightness={tightness}
                    riskAppetite={riskAppetite}
                    previousTightness={previousScores?.tightness ?? null}
                    previousRiskAppetite={previousScores?.riskAppetite ?? null}
                    tightnessThreshold={callChangeLines.tightness}
                    riskAppetiteThreshold={callChangeLines.riskAppetite}
                    currentRegime={regime}
                    trail={conditionsTrail.points}
                    showDistance={false}
                    className="ml-auto w-full max-w-[288px]"
                  />
                }
                asideNote={[conditionsTrail.caption, conditionsTrail.caveat].flatMap((line) => (line ? [line] : []))}
                /* An archived week carries no live trust: the banner above says
                   which week is on screen, and a freshness strip under a past
                   call would date it to today. */
                trust={historicalSelection ? null : trustStripProps}
                captionDetail={historicalSelection ? `Archived: ${cadenceTitle ?? weekOfLabel}` : undefined}
              />
              {/* Live briefs only. The profile holds the operator’s runway as of
                  today; combining it with an archived regime would date the
                  company’s cash position to the archived week. */}
              {!historicalSelection ? (
                <SinceLastVisit
                  current={{
                    recordDate: reportData.treasury.record_date,
                    recordDateLabel: homepage.reportShell.recordDateLabel,
                    regimeLabel: publicRegimeLabel,
                    call: primaryCall,
                  }}
                  /* On a quiet week the lead below already ends with it. */
                  callChangeLine={quietDayLine ? undefined : callChangeLine}
                  boardDeckHref={`/api/export/board-slide?format=pptx&stage=${encodeURIComponent(activeStage)}`}
                  linesCrossedLead={movementSentence}
                />
              ) : null}
              {/* The reader's own decisions against this week's reading, for a browser
                  that has recorded some: one line, and nothing at all for the rest. */}
              {!historicalSelection ? <YourRecordNote tightness={tightness} riskAppetite={riskAppetite} /> : null}
              {/* The one Copy Brief (DD-005), under the card and its two reader
                  notes (which render nothing for most visits) rather than in it:
                  the card is what people screenshot, so a button inside it would
                  be in every picture. It lived in "Do and share" at the foot of
                  the page — about 2,560px down on desktop for a returning reader,
                  and folded away entirely on a first visit — which left the
                  page's canonical artifact action off the first screen. On a
                  first visit it folds with the brief: on a phone it pushed the
                  decision picker under the tab bar, and that question is the
                  one thing a first visit is asked. */}
              <div
                data-first-visit-collapsible={offersFirstVisitFold ? "true" : undefined}
                className="mt-4 flex flex-wrap items-center gap-2"
              >
                <ShareBriefButton text={primaryCall} lines={briefShareLines} showLabel />
                {/* Labelled: three bare words beside Copy Brief did not say they
                    set the horizon the guidance is stated for. The confidence chip
                    that sat between them repeated the trust strip on the card. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fluid-xs text-slate-400">Plan horizon</span>
                  <CadenceSelector />
                </div>
              </div>
            </div>

            {offersFirstVisitFold ? (
              <DecisionPicker
                options={decisionPickerOptions}
                initialSelected={parseHomeDecision(searchParams?.[HOME_DECISION_PARAM])}
                regime={regime}
                scores={{ tightness, riskAppetite }}
                flipCondition={reversalTriggerLabel}
                lastTime={lastTimeCallChanged ? { record: lastTimeCallChanged, callChangeLines } : undefined}
                turningPoints={turningPoints}
                calibration={{
                  stageLabel: operatorStageLabel(operatorStageForVariantMode(activeStage)),
                  runwayPhrase: runwayBandPhrase(activeRunway ?? DEFAULT_RUNWAY_BAND),
                  chosen: Boolean(data.operatorContext.companyStage || data.operatorContext.companyRunway),
                }}
              />
            ) : null}

            {/* Sections 2 to 5, folded on a first visit behind the picker above.
                `contents` keeps each section a flex item of the column, so the
                phone and desktop `order-*` classes below still apply. */}
            <div data-first-visit-collapsible={offersFirstVisitFold ? "true" : undefined} className="contents">
            {/* 2. What changed. One table, every signal, each against the earlier
                reading and against its own lines — the four signals used to be
                drawn twice on this page, in the hero and again beside the actions. */}
            <WhatChangedSection
              rows={signalChangeRows}
              lead={movementSentence}
              comparisonUnavailable={comparisonUnavailable}
              basis={basis}
            />

            {/* 3. What that changes, by area. On a phone this renders before the
                signals: the Monday reader is checking whether to act, not why. */}
            <WhatItChangesSection
              rows={homeAreaRows}
              regime={regime}
              activeStage={activeStage}
              activeRunway={activeRunway}
              runwayEmphasis={runwayEmphasis}
              planHref={isRoute(operateHref) ? operateHref : "/operate"}
              isHistorical={Boolean(historicalSelection)}
            />

            {/* 4. What would change the guidance: the two ladders with their three
                lines and the earlier reading’s dot, each line of "Conditions change
                if" in interest-rate terms under it, and — only on a week the call
                moved — what happened the last time it moved this way. */}
            <WhatWouldChangeSection
              ladders={scoreLadders}
              flipProximity={v2HeroSignalData.flipProximity}
              reversalTrigger={reversalTriggerLabel}
              resumeWhen={resumeWhenLabel}
              guardrail={guardrailLabel}
              flipConditions={flipConditionLabels}
              lastTime={lastTimeCallChanged}
              callChangeLines={callChangeLines}
              regime={regime}
              conditionsTrail={conditionsTrail}
            />

            {/* 5. Do and share, including the one conversion on the page. */}
            <DoAndShareSection
              operateHref={operateHref}
              planLabel={cadenceCall?.planLabel}
              currentRecordDate={reportData.treasury.record_date}
              currentRecordDateLabel={homepage.reportShell.recordDateLabel}
            />
            </div>
        </div>
      </div>

      {/*
        * The assembled graph, not a second one built here.
        *
        * This tag used to hold a hand-rolled Article/Report node while
        * `buildHomeStructuredData()` — Organization, WebSite, CollectionPage,
        * Dataset, FAQPage, BreadcrumbList — was assembled on every request and
        * dropped, because nothing on this page read `reportShell.structuredData`.
        * So the site's only brand-entity anchors were missing from the one URL
        * search engines resolve them from, and the node that did ship carried
        * display-string dates and a `result` object using no schema.org term.
        *
        * `serializeJsonLd` rather than `JSON.stringify`: the payload interpolates
        * the headline and posture labels, and this was the only JSON-LD call site
        * in the repo that skipped the escaper written for exactly that.
        */}
      <JsonLdScript data={homepage.reportShell.structuredData} />

      <StickyCallStrip
        call={primaryCall}
        direction={signalDirection}
        weatherWord={publicRegimeLabel}
        marginLabel={formatStripMargin(confidenceLabel ?? "HIGH", trustStripProps.margin?.points)}
        shareLines={briefShareLines}
      />
    </Shell>
  );
}
