import type { Metadata } from "next";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { BriefArtifactScript } from "./components/briefArtifactScript";
import { buildBriefArtifact, deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../lib/report/briefArtifact";
import { homeOrientationLine } from "../lib/seo";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { SinceLastVisit } from "./components/home/SinceLastVisit";
import { YourRecordNote } from "./components/home/YourRecordNote";
import { ActivationTracker } from "./components/activationTracker";
import { OperatorWorkflowRouteTracker } from "./components/operatorWorkflowRouteTracker";
import { ConditionsLegend } from "./components/home/ConditionsLegend";
import { WeekStepper } from "./components/home/WeekStepper";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { CadenceSelector } from "./components/cadenceSelector";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel, isRegimeKey } from "../lib/regimePresentation";
import { formatDecisionReversal, formatStripMargin } from "../lib/report/reportFormatting";
import { isRoute } from "../lib/navigation/routeType";
import { resolveDataStatusGuidance } from "../lib/report/trustStatus";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatWeekMondayUTC } from "../lib/formatters";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { describeMarketMoveScale } from "../lib/report/marketMoveScale";
import { describeMovementCause } from "../lib/report/decisionMovement";
import { operatorStageForVariantMode, operatorStageLabel } from "../lib/report/operatorStage";
import { guardrailMatchesRule, ruleMetricLabel } from "../lib/report/boundedDecisionRules";
import { getMonthlyRegimeHistory, primeMonthlyRegimeHistoryForRead } from "../lib/summary/monthlyRegimeHistory";
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
import { WhatChangedSection } from "./components/home/WhatChangedSection";
import { WhyConditionsSection } from "./components/home/WhyConditionsSection";
import { AllAreaRules } from "./components/home/AllAreaRules";
import { CompanyCalibration } from "./components/home/CompanyCalibration";
import { AlertSection } from "./components/home/AlertSection";
import { RecordSection } from "./components/home/RecordSection";
import { ActionLink } from "./components/ui/actionLink";
import { WhatWouldChangeSection } from "./components/home/WhatWouldChangeSection";
import { ShareLinks } from "./components/home/ShareLinks";
import { ShareBriefButton } from "./components/shareBriefButton";
import {
  HOME_DECISION_PARAM,
  parseHomeDecision,
  buildHomeAreaRows,
  buildSignalChangeRows,
  describeConditionsTrail,
  describeEarlierConditions,
  describeHeldAreasForCard,
  describeWeeklyMovement,
  HOME_SECTIONS,
} from "../lib/report/home/homeSectionModel";
import { findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { describeScoreMovementCaveat } from "../lib/report/scoreMovement";
import { RegimeRadar } from "./components/home/RegimeRadar";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { buildPublishedBriefPath, describeCitableBriefBasis, getPublishedBriefs, publishedBriefWeekLabel, selectCitablePermalinkBrief } from "../lib/report/publishedBriefs";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { getTimeMachineRegimeSeries, getTimeMachineYieldCurveSeries } from "../lib/timeMachine/timeMachineCache";
import { getLatestTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { JsonLdScript } from "./components/jsonLdScript";
import { PublishedCallWatcher } from "./components/publishedCallWatcher";
import { OfflineNotice } from "./components/offlineNotice";
import { DecisionPicker, type DecisionPickerOption } from "./components/home/DecisionPicker";
import { describeSpellLengths, findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
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
  /* Primed here, not left to the report read: that primes inside the home
     page's cached loader, which a cache hit skips, so a new isolate served
     from the cache drew the conditions trail from the bundled months alone. */
  await primeMonthlyRegimeHistoryForRead();
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
  /* The archive is month-end readings, so an archived view is named by its
     month-end, not by a Monday (2026-10-14). It said "Week of Sep 28" under a
     banner reading "Viewing September 2026", and the arrows said "week" while
     stepping a month at a time. */
  const periodLabel = historicalSelection
    ? `Month-end ${formatDateUTC(historicalSelection.asOf)}`
    : weekOfLabel;
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
    flipProximity: buildFlipProximity(reportData.assessment).map((line) => ({
      ...line,
      /* Each move against a Fed step and the record's own months, so a reader
         can hold a headline against the line (`marketMoveScale.ts`). */
      scale: describeMarketMoveScale({
        input: line.input,
        move: line.inputMove,
        baseRateUsed: reportData.assessment.scores.baseRateUsed,
        series: getTimeMachineYieldCurveSeries(Number.MAX_SAFE_INTEGER),
      }),
    })),
  };

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
    scoringBasis: reportData.scoringBasis,
  });
  const decisionMovement = homepage.weeklyDecisionCardModel.decision.decisionMovement;
  const homeAreaRows = buildHomeAreaRows({
    actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
    decisionRules: homepage.weeklyDecisionCardModel.decision.decisionRules ?? [],
    movement: decisionMovement,
    scores: { tightness, riskAppetite },
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
  /* The verdict's one line on why: the lines the scores crossed since the
     earlier reading ("Risk appetite fell through 54."), or that none was.
     Nothing on a week with no comparison, which the stamp line already says. */
  const whyLine = decisionMovement ? describeMovementCause(decisionMovement) : undefined;
  /* Whose lines these are: the stage and runway the reader chose, or the
     defaults, said once, at the head of the areas. */
  const calibrationChosen = Boolean(data.operatorContext.companyStage || data.operatorContext.companyRunway);
  const stageLabel = operatorStageLabel(operatorStageForVariantMode(activeStage));
  /* A chosen stage's own action, as a stage line; the headline stays the
     week's, which is the same for every reader. */
  const stageAction = calibrationChosen && !homepage.weeklyCall.policyOverrideActive
    ? homepage.weeklyCall.stageScopedAdjustments?.[activeStage]?.actionNow
    : undefined;
  /* The guidance's resume line: the lead area's, as /trust and every paste print it. */
  const leadResumeCondition = homepage.weeklyDecisionCardModel.decision.actionStripItems?.[0]?.reversalCondition;
  const decisionPickerOptions: DecisionPickerOption[] = decisionAreaOrder.flatMap((area) => {
    const row = homeAreaRows.find((candidate) => candidate.area === area);
    if (!row) return [];
    const answer = findLeadAnswerForArea(area);
    return [{ ...row, answer: answer ? { href: `/answers/${answer.slug}`, title: answer.title } : undefined }];
  });
  /* How long these conditions lasted before, against the reader's chosen band.
     Left out of an archived view, whose record would have to end at its month. */
  const recordSeries = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const spellLengths = historicalSelection || !isRegimeKey(regime)
    ? null
    : describeSpellLengths({
        series: recordSeries,
        currentRegime: regime,
        runwayBand: data.operatorContext.companyRunway ?? null,
      });
  const turningPoints = findRecentCallChanges(recordSeries, 4).map((change) => ({
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
    scoringBasis: reportData.scoringBasis,
    /* The one place the page says why its conditions differ from the published
       week's, when the record basis is why. A replay is not this week. */
    basisNote: historicalSelection
      ? null
      : describeCitableBriefBasis({
          currentRecordDate: reportData.treasury.record_date,
          live: reportData.assessment,
          thresholds: reportData.assessment.thresholds,
        }),
  });

  /* This week's published brief, where it reads different conditions from the
     card (2026-10-14). The note sat in the trust strip's small print, so a
     reader who opened /history saw the same week under another answer and no
     reason on the card. It now heads the card's caveats with a link to what
     was published, and the strip stops repeating it. */
  const citableBrief = historicalSelection ? undefined : selectCitablePermalinkBrief(reportData.treasury.record_date);
  const basisNote = trustStripProps.basis.note ?? null;
  const publishedNotice = citableBrief && basisNote
    ? {
        text: basisNote,
        href: buildPublishedBriefPath(citableBrief.slug),
      }
    : undefined;
  /* An archived month whose published weeks read other conditions: the archive
     is the month-end re-scored on today's formula, the briefs are what went out. */
  const monthPrefix = historicalSelection
    ? `${historicalSelection.year}-${String(historicalSelection.month).padStart(2, "0")}-`
    : null;
  const differingBrief = monthPrefix
    ? getPublishedBriefs().find((brief) => brief.recordDate.startsWith(monthPrefix) && brief.regime !== reportData.assessment.regime)
    : undefined;
  const archivedPublishedNotice = differingBrief
    ? {
        text: `The brief published for the week of ${publishedBriefWeekLabel(differingBrief)} read ${getRegimePublicLabel(differingBrief.regime)}. This view is the month-end, scored with today's formula.`,
        href: buildPublishedBriefPath(differingBrief.slug),
      }
    : undefined;
  const heldAreasLine = historicalSelection ? null : describeHeldAreasForCard(publicRegimeLabel, decisionPickerOptions);
  const heroAreas = heldAreasLine
    ? { text: heldAreasLine, href: `#${HOME_SECTIONS.areas.id}`, action: "What to do in each area" }
    : undefined;
  const heroTrust = publishedNotice
    ? { ...trustStripProps, basis: { ...trustStripProps.basis, note: null, omitReason: true } }
    : trustStripProps;

  return (
    <Shell regime={regime}>
      <BriefArtifactScript artifact={briefArtifact} />
      <ActivationTracker path="/" />
      {/* `/` was always one of the routes the tracker accepts and never mounted
          it, so a move from the brief to `/signals`, `/operate` or `/resolve`
          went unrecorded and read the same as closing the tab. */}
      <OperatorWorkflowRouteTracker />
      {/* A caveat, drawn like the archived-week banner below: the amber it
          used is the crossed-line red, so late data read as a crossed line. */}
      {isDegraded ? (
        <p className="weather-caveat-mark mb-4 rounded-lg border border-l-4 border-caveat-border bg-caveat-bg px-4 py-2.5 text-fluid-micro text-caveat-fg">
          {resolveDataStatusGuidance({
            isFallbackSnapshot: homepage.reportShell.showOfflineBadge,
            degradedSourceCount: homepage.reportShell.degradedSourceRows?.length ?? 1,
          })}
        </p>
      ) : null}
      {historicalSelection ? (
        <div className="mx-auto weather-brief-measure">
          <HistoricalBanner
            year={historicalSelection.year}
            month={historicalSelection.month}
            asOfLabel={formatDateUTC(historicalSelection.asOf)}
            liveHref="/"
            published={archivedPublishedNotice}
          />
        </div>
      ) : null}
      <div className="mx-auto weather-brief-measure space-y-4 sm:space-y-8">
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
          <ConditionsLegend
            arrival={arrivedFromShare ? "share" : undefined}
            orientation={historicalSelection ? undefined : homeOrientationLine}
            currentRegime={historicalSelection ? undefined : regime}
            thresholds={reportData.assessment.thresholds}
          />
          {/* Browse the week before the call. Horizon and confidence details
              follow the call beside Copy Brief, so wrapping controls cannot
              push the reading below the first phone viewport. */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <WeekStepper
              previousHref={prevWeekHref}
              nextHref={nextWeekHref}
              previousLabel="Previous month-end"
              nextLabel={nextHistoricalRequest ? "Next month-end" : "This week"}
              currentDateLabel={cadenceTitle ?? periodLabel}
              isHistorical={Boolean(historicalSelection)}
              history={regimeHistory}
            />
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
            <div id="weekly-call" data-page-section="weekly-call" tabIndex={-1} aria-label="This week’s operating guidance" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
              {cadenceCall ? <CadenceCallCard model={cadenceCall} titleLevel="h1" /> : null}
              <DecisionHero
                titleLevel={cadenceCall ? "h2" : "h1"}
                weeklyCall={cardCall.action}
                callDetail={historicalSelection ? undefined : whyLine}
                regime={regime}
                direction={historicalSelection ? undefined : cardCall.directionLabel}
                earlier={earlierConditions}
                /* The map from `md` up, where it is the one definition of the four
                   conditions: each change line's value at its end, the path's
                   domain as its caption, and the link to how the lines are set.
                   Below `md` the conditions legend above the week defines them. */
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
                    trailCaption={conditionsTrail.caption}
                    caveat={conditionsTrail.caveat}
                    footer={
                      <Link
                        href="/trust#formula-reference"
                        className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200"
                      >
                        How they are set
                      </Link>
                    }
                    className="ml-auto w-full max-w-[18rem]"
                  />
                }
                /* An archived week carries no live trust: the banner above says
                   which week is on screen, and a freshness strip under a past
                   call would date it to today. */
                trust={historicalSelection ? null : heroTrust}
                published={publishedNotice}
                areas={heroAreas}
                captionDetail={historicalSelection ? `Archived: ${cadenceTitle ?? periodLabel}` : undefined}
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
                  /* The earlier conditions the card's stamp line names, so a visit
                     that last saw them is not told the same change twice. */
                  cardEarlierRegimeLabel={earlierConditions && previousRegime ? getRegimePublicLabel(previousRegime) : undefined}
                  boardDeckHref={`/api/export/board-slide?format=pptx&stage=${encodeURIComponent(activeStage)}`}
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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

            {/* 2. The five areas: the picker, all five side by side folded under it,
                and the one plan link. */}
            <DecisionPicker
              options={decisionPickerOptions}
              initialSelected={parseHomeDecision(searchParams?.[HOME_DECISION_PARAM])}
              regime={regime}
            >
              <AllAreaRules
                rows={homeAreaRows}
                heldGroups={decisionMovement?.heldGroups}
                regime={regime}
                planHref={isRoute(operateHref) ? operateHref : "/operate"}
                isHistorical={Boolean(historicalSelection)}
              />
              <div>
                <ActionLink href={operateHref} variant="primary">
                  {cadenceCall?.planLabel ?? "Build this week’s plan →"}
                </ActionLink>
              </div>
            </DecisionPicker>

            {/* 3. Whose lines these are. Live weekly brief only: the profile holds
                the reader's company as of today, and an archived week or a longer
                horizon was reached by choosing it. Sits after the areas because the
                table above already names the company it is scaled to; this is where
                the reader changes that. */}
            {!historicalSelection && activeCadence === "weekly" ? (
              <CompanyCalibration
                stageLabel={stageLabel}
                activeStage={activeStage}
                activeRunway={activeRunway}
                runwayEmphasis={runwayEmphasis}
                stageAction={stageAction}
              />
            ) : null}

            {/* 4. What the conditions are made of, and what the reading leaves out:
                the two scores with their meanings, the excluded inputs that would
                change the classification, and the capped score's real distance. */}
            <WhyConditionsSection
              regime={regime}
              tightness={tightness}
              riskAppetite={riskAppetite}
              changeLines={callChangeLines}
              saturatedPressure={tightnessSaturated ? tightnessPressure : undefined}
              notCounted={reportData.scoringBasis.notCounted}
              warning={reportData.scoringBasis.warning}
            />

            {/* 5. What changed. One table, every signal, each against the earlier
                reading and against its own lines. It opens on the table: the card
                says what the week did to the conditions and why, and each area's
                row says which of its lines moved. Only a read with nothing to
                compare says so over it. */}
            <WhatChangedSection
              heading={`What changed ${basis.since}`}
              rows={signalChangeRows}
              lead={comparisonUnavailable ? describeWeeklyMovement({ tightnessDelta, riskAppetiteDelta, comparisonUnavailable, basis }) : undefined}
              comparisonUnavailable={comparisonUnavailable}
              basis={basis}
            />

            {/* 6. What would change the guidance: its pause and resume lines, the
                line where conditions change, and where the reading sits. */}
            <WhatWouldChangeSection
              ladders={scoreLadders}
              flipProximity={v2HeroSignalData.flipProximity}
              reversalTrigger={reversalTriggerLabel}
              resumeWhen={resumeWhenLabel}
              guardrail={guardrailLabel}
              leadResume={leadResumeCondition ? formatDecisionReversal(leadResumeCondition) : undefined}
              flipConditions={flipConditionLabels}
              callChangeLines={callChangeLines}
              regime={regime}
              conditionsTrail={conditionsTrail}
            />

            {/* 7. How unusual is this? */}
            <RecordSection
              lastTime={lastTimeCallChanged}
              callChangeLines={callChangeLines}
              turningPoints={turningPoints}
              spellLengths={spellLengths}
              record={historicalSelection ? undefined : recordSeries}
            />

            {/* 8. The alert: hearing the day a line is crossed is how the page is
                meant to be used, so it follows everything it watches. */}
            <AlertSection />

            {/* Last, as a line rather than a section: the way out to every share
                format, and the week's published brief. */}
            <ShareLinks currentRecordDate={reportData.treasury.record_date} />
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
