import type { Metadata } from "next";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { BriefArtifactScript } from "./components/briefArtifactScript";
import { deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { SHARE_REFERRAL_PARAM, SHARE_REFERRAL_VALUE } from "../lib/report/briefArtifact";
import { homeOrientationLine } from "../lib/seo";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { SinceLastVisit } from "./components/home/SinceLastVisit";
import { YourRecordNote } from "./components/home/YourRecordNote";
import { ActivationTracker } from "./components/activationTracker";
import { OperatorWorkflowRouteTracker } from "./components/operatorWorkflowRouteTracker";
import { ConditionsLegend } from "./components/home/ConditionsLegend";
import { PeriodControl } from "./components/home/PeriodControl";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { CadenceSelector } from "./components/cadenceSelector";
import { QuietWeekFold } from "./components/home/QuietWeekFold";
import type { CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel, isRegimeKey } from "../lib/regimePresentation";
import { formatDecisionReversal, formatNearestChange, formatStripMargin } from "../lib/report/reportFormatting";
import { describeSavedCopyBanner, resolveDataStatusGuidance } from "../lib/report/trustStatus";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatWeekMondayUTC } from "../lib/formatters";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { describeMarketMoveScale, describeScoreMoveRanges } from "../lib/report/marketMoveScale";
import { describeGuidanceChange, describeMovementCause, buildStandupLine } from "../lib/report/decisionMovement";
import { anyPauseLineMet } from "../lib/report/reportEvidence";
import { operatorStageForVariantMode, operatorStageLabel } from "../lib/report/operatorStage";
import { guardrailMatchesRule, ruleMetricLabel } from "../lib/report/boundedDecisionRules";
import { getMonthlyRegimeHistory, primeMonthlyRegimeHistoryForRead } from "../lib/summary/monthlyRegimeHistory";
import { HomeBriefLoadError } from "./components/home/HomeBriefLoadError";
import { buildHomePageArtifact } from "./homePageArtifact";
import { buildHomeHistoryModels } from "./homePageHistory";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
  parseTimeMachineRequest,
  resolveTimeMachineSelection,
} from "../lib/timeMachine/timeMachineSelection";
import { HistoricalBanner } from "./components/historicalBanner";
import { resolveHistoricalDate } from "../lib/timeMachine/timeMachine";
import { WhatChangedSection } from "./components/home/WhatChangedSection";
import { WhyConditionsSection } from "./components/home/WhyConditionsSection";
import { AreaStrip } from "./components/home/AreaStrip";
import { RunwayFold } from "./components/home/RunwayFold";
import { CompanyCalibration } from "./components/home/CompanyCalibration";
import { LineStateBand } from "./components/home/LineStateBand";
import { AlertSection } from "./components/home/AlertSection";
import { RecordSection } from "./components/home/RecordSection";
import Link from "next/link";
import { ActionLink, PlainActionLink } from "./components/ui/actionLink";
import { WhatWouldChangeSection } from "./components/home/WhatWouldChangeSection";
import { ShareLinks } from "./components/home/ShareLinks";
import { ShareBriefButton } from "./components/shareBriefButton";
import { CopyStandupButton } from "./components/CopyStandupButton";
import { CopyExecSummaryButton } from "./components/CopyExecSummaryButton";
import { CopyImageCardButton } from "./components/CopyImageCardButton";
import {
  HOME_DECISION_PARAM,
  HOME_MONDAY_EMAIL_HASH,
  ROLE_FORMAT_LINKS,
  parseHomeDecision,
  buildAreaGroups,
  buildHomeAreaRows,
  buildSignalChangeRows,
  describeEarlierConditions,
  buildAreaStrip,
  describeLineStateBand,
  describeWeeklyMovement,
  HOME_SECTIONS,
} from "../lib/report/home/homeSectionModel";
import { buildWeekMove } from "../lib/report/home/weekMove";
import { DEFAULT_RUNWAY_BAND, runwayBandLabel, runwayBandSublabel } from "../lib/report/operatorRunway";
import { findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { buildPublishedBriefPath, describeCitableBriefBasis, getPublishedBriefs, publishedBriefWeekLabel, selectCitablePermalinkBrief } from "../lib/report/publishedBriefs";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { getTimeMachineRegimeSeries, getTimeMachineYieldCurveSeries } from "../lib/timeMachine/timeMachineCache";
import { getLatestTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { HomePageTail } from "./components/home/HomePageTail";
import { PublishedCallWatcher } from "./components/publishedCallWatcher";
import { OfflineNotice } from "./components/offlineNotice";
import { frameFactsAttributes } from "../lib/navigation/runningHead";
import { ScoreLadder } from "./components/ui/scoreLadder";
import { resolveGlobalHeaderRouteLabel } from "../lib/navigation/globalHeader";
import { DecisionPicker, type DecisionPickerOption } from "./components/home/DecisionPicker";
import { describeConditionFacts, describeConditionsSince, describeSpellLengths, findRecentCallChanges } from "../lib/report/lastTimeCallChanged";
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
  /* The bundled copy a failed read serves, or a reading filled from it. */
  const savedCopy = homepage.reportShell.showOfflineBadge;
  const savedReadingDate = savedCopy ? reportData.recordDateLabel : undefined;

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

  /* The selected horizon, the artifact every share format renders, and the one Slack
     paste. The builders live in `homePageArtifact.ts` so this route does not decide the
     artifact's shape a second time. */
  const { cadenceCall, cadenceTitle, briefArtifact, briefSlackBlock } = buildHomePageArtifact({
    homepage,
    reportData,
    activeCadence,
    alignedRegimeHistory,
    operateHref,
    previousScores,
  });

  /* The five sections' data, built once here and drawn by the components under
     app/components/home. The lines every score is judged against are the same
     three the rules state: the area pause/restart lines from the printed rule,
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
  /* A week nothing moved says so once, on the stamp line, in place of "Holding this week". */
  const unmovedLine = decisionMovement?.moved.length === 0 && cardCall.directionLabel === "Holding this week" ? whyLine?.replace(/\.$/, "") : undefined;
  /* Whose lines these are: the stage and runway the reader chose, or the
     defaults, said once, at the head of the areas. */
  const calibrationChosen = Boolean(data.operatorContext.companyStage || data.operatorContext.companyRunway);
  const stageLabel = operatorStageLabel(operatorStageForVariantMode(activeStage));
  /* Where this reading is scaled to, as a chip in the card's stamp row
     (2026-10-31). The call is correctly the same for every reader, so the
     localization belongs in the chrome rather than in a second call. The
     trailing clause is the band's own meaning ("cash first"), printed only when
     the band actually reshaped the rule — a default band reads "follow the
     guidance", which is what the shared call already says. */
  const readingLocation = !historicalSelection && activeCadence === "weekly"
    ? {
        label: runwayScopedAdjustment?.runwayLabel
          ? `${stageLabel} · ${runwayBandLabel(activeRunway ?? DEFAULT_RUNWAY_BAND)} · ${runwayBandSublabel(activeRunway ?? DEFAULT_RUNWAY_BAND).toLowerCase()}`
          : `${stageLabel} · ${runwayBandLabel(activeRunway ?? DEFAULT_RUNWAY_BAND)}`,
        href: `#${HOME_SECTIONS.calibration.id}`,
        hint: "Change your stage and runway",
      }
    : undefined;
  /* A chosen stage's own action, as a stage line; the headline stays the
     week's, which is the same for every reader. */
  const stageAction = calibrationChosen && !homepage.weeklyCall.policyOverrideActive
    ? homepage.weeklyCall.stageScopedAdjustments?.[activeStage]?.actionNow
    : undefined;
  /* The guidance's restart line: the lead area's, as /trust and every paste print it. */
  const leadItem = homepage.weeklyDecisionCardModel.decision.actionStripItems?.at(0);
  const leadResumeCondition = leadItem?.reversalCondition;
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
  const { conditionsTrail, inputHistory } = buildHomeHistoryModels({ reportData, alignedRegimeHistory });
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

  const nearestMargin = trustStripProps.margin ?? null;
  /* The running head's tension, in the margin's own number: "2 pts from Freezing". */
  const nearestChange = historicalSelection ? null : formatNearestChange(nearestMargin, regime);

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
  /* A saved copy's lines are an old reading's, so the card states no hold of its
     own: the banner (or, on a held week, the call) says what waits for live data,
     and the areas below are dated to the reading. "No area is on hold." sat under
     "hold new hires, spend and vendor contracts" (2026-11-02). */
  const areaStripModel = historicalSelection || savedCopy ? null : buildAreaStrip(decisionPickerOptions);
  /* The week's move, for the card to replay once on arrival: live, compared readings
     only, and null on a week the conditions held and no area changed standing. The
     earlier strip is the same rules read at the earlier scores. */
  const weekMove =
    historicalSelection || savedCopy || isDegraded || comparisonUnavailable || !isRegimeKey(regime)
      ? null
      : buildWeekMove({
          since: basis.label,
          previous: previousScores,
          current: { tightness, riskAppetite },
          previousRegime: previousRegime && isRegimeKey(previousRegime) ? previousRegime : null,
          regime,
          thresholds: callChangeLines,
          strip: areaStripModel,
          previousStrip: previousScores
            ? buildAreaStrip(
                buildHomeAreaRows({
                  actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
                  decisionRules: homepage.weeklyDecisionCardModel.decision.decisionRules ?? [],
                  movement: null,
                  scores: previousScores,
                }),
              )
            : null,
        });
  /* The week's exception, above the call: null on a calm week, so the page's
     silhouette changes with the weather rather than being drawn the same way
     whatever the reading says. */
  const lineStateBand = historicalSelection || savedCopy ? null : describeLineStateBand(homeAreaRows, basis, decisionMovement);
  const pauseCauseOnBand = lineStateBand?.state === "crossed"
    && decisionMovement?.moved.every((area) => area.kind === "paused");
  /* The meaning line under the call carries the two scores it rests on: they
     lived only inside the map, so the week's word could be screenshotted but
     not cited. One click to the section that shows the change lines and what
     the score leaves out. */
  const heroReading = {
    numbers: `Funding pressure ${Math.round(tightness)}, risk appetite ${Math.round(riskAppetite)}.`,
    whyHref: `#${HOME_SECTIONS.diagnosis.id}`,
    /* Live scores against the record. An archived month would need a record ending at that month. */
    facts: historicalSelection ? null : describeConditionFacts({ series: recordSeries, regime, tightness, riskAppetite }),
  };
  const conditionsSince = historicalSelection || !isRegimeKey(regime)
    ? undefined
    : describeConditionsSince({ series: recordSeries, currentRegime: regime }) ?? undefined;
  /* A live reading's alone: a saved copy or an archived month carries no current "feels like". */
  const countedReading = historicalSelection || savedCopy ? null : reportData.scoringBasis?.countedReading ?? null;
  /* What the record's months did, drawn around this week: an archived month's reading has no later months to be judged by. */
  const moveRanges = historicalSelection ? null : describeScoreMoveRanges();
  /* The card sizes the room before a change once; the count of months held at this
     distance is /trust's. */
  const heroTrust = {
    ...trustStripProps,
    baseRate: null,
    basis: {
      ...trustStripProps.basis,
      consequenceOnCard: Boolean(countedReading),
      ...(publishedNotice ? { note: null, omitReason: true } : {}),
    },
  };

  /* A quiet week (2026-11-03): no area moved and the conditions held since the
     earlier reading, and nothing is close to changing. The card and the areas are
     the whole answer, so the sections that explain them fold (`QuietWeekFold`). Live,
     compared, current readings only: a saved copy or a week with no comparison has
     not shown that nothing moved. */
  const guidanceChange = describeGuidanceChange({
    movement: decisionMovement,
    regimeChanged: homepage.weeklyDecisionCardModel.decision.reportDynamics.regimeChanged,
  });
  /* The week's one-line standup, for the quick-copy pill: what the guidance did
     this week and what would change it, in one pasteable line. */
  const standupLine = buildStandupLine({
    regime,
    change: guidanceChange,
    weeklyCall: homepage.weeklyCall,
    assessment: reportData.assessment,
  });
  /* A three-bullet executive summary for a leadership email or Monday sync, from
     the same brief lines the share panel copies. */
  const execSummaryText = briefShareLines && briefShareLines.length > 0
    ? briefShareLines.map((line) => `• ${line}`).join("\n")
    : primaryCall;
  const quietWeek =
    !historicalSelection
    && !savedCopy
    && !isDegraded
    && !comparisonUnavailable
    && guidanceChange === "held"
    && !trustStripProps.couldChangeNextWeek
    && confidenceLabel !== "LOW"
    && lineStateBand?.state !== "near";

  const periodControl = (
    <PeriodControl
      previousHref={prevWeekHref}
      nextHref={nextWeekHref}
      nextLabel={nextHistoricalRequest ? "Next month" : "This week"}
      currentDateLabel={periodLabel}
      isHistorical={Boolean(historicalSelection)}
      history={regimeHistory}
    />
  );

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
        <p className="weather-caveat-band weather-caveat-mark mb-4 px-4 py-2.5 text-fluid-nano">
          {savedCopy
            ? describeSavedCopyBanner({
                recordDate: reportData.treasury.record_date,
                now: new Date(),
                guidanceHeld: homepage.weeklyCall.policyOverrideActive,
              })
            : resolveDataStatusGuidance({
                degradedSourceCount: homepage.reportShell.degradedSourceRows?.length ?? 1,
              })}
        </p>
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
            compact
            arrival={arrivedFromShare ? "share" : undefined}
            /* On an archived week too (2026-10-27): the sentence is as true of March 2020
               as of this week, a first visit can arrive on a shared archive link, and
               leaving it out shrank the legend by a line, so on a first visit the week
               stepper under it jumped up 62px on the first step back. */
            orientation={homeOrientationLine}
            currentRegime={historicalSelection ? undefined : regime}
            thresholds={reportData.assessment.thresholds}
          />
          {/* Browse the week before the call. Horizon and confidence details
              follow the call beside Copy Brief, so wrapping controls cannot
              push the reading below the first phone viewport. */}
          {historicalSelection ? periodControl : null}
          {/* Under the stepper, not above the page (2026-10-27): inserted above, the
              band pushed the key a reader had just pressed 142px down on a desktop and
              150–216px on a phone, so stepping back a second month meant finding it
              again. Here it lands beside the control that opened it, still above the
              call, and stepping between archived months moves nothing. */}
          {historicalSelection ? (
            <HistoricalBanner
              year={historicalSelection.year}
              month={historicalSelection.month}
              asOfLabel={formatDateUTC(historicalSelection.asOf)}
              liveHref="/"
              published={archivedPublishedNotice}
            />
          ) : null}
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
            <div
              id="weekly-call"
              data-page-section="weekly-call"
              tabIndex={-1}
              aria-label="This week’s operating guidance"
              className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
              /* What the running head prints once the card has scrolled away: on a
                 phone it is the brief's own line, the call with the jump to the
                 areas (lib/navigation/runningHead.ts). */
              {...frameFactsAttributes({
                regime,
                condition: publicRegimeLabel,
                date: periodLabel,
                /* The page by the name the header gives it, not its h1: the h1 is the
                   card's call, and the strip beside it on desktop prints the call. */
                title: resolveGlobalHeaderRouteLabel("/"),
                tension: nearestChange,
                tensionNear: trustStripProps.couldChangeNextWeek || confidenceLabel === "LOW",
                call: primaryCall,
                jump: { href: `#${HOME_SECTIONS.areas.id}`, label: "By area" },
              })}
            >
              {/* Above the card, inside the region it belongs to. Renders nothing
                  unless an area is on hold or close to its line. */}
              {lineStateBand ? <LineStateBand model={lineStateBand} /> : null}
              <DecisionHero
                periodControl={historicalSelection ? undefined : periodControl}
                location={readingLocation}
                briefNumber={citableBrief ? { label: citableBrief.slug.toUpperCase(), href: buildPublishedBriefPath(citableBrief.slug) } : undefined}
                reading={heroReading}
                weeklyCall={cardCall.action}
                callDetail={historicalSelection || unmovedLine || pauseCauseOnBand ? undefined : whyLine}
                regime={regime}
                direction={historicalSelection ? undefined : unmovedLine ?? cardCall.directionLabel}
                earlier={earlierConditions}
                since={conditionsSince}
                /* The two scores from `md` up, each as a figure on its ladder
                   (docs/design/rebuild-covenant.md): the number, where it stands
                   against its lines, and the lines named where they sit. The
                   conditions map this column held is in "What would change our
                   mind", where the change lines are the subject. */
                aside={
                  <div className="space-y-8" data-hero-scores>
                    {scoreLadders.map((ladder) => (
                      <ScoreLadder key={ladder.metric} figure label={ladder.label} value={ladder.value} lines={ladder.lines} />
                    ))}
                  </div>
                }
                /* An archived week carries no live trust: the banner above says
                   which week is on screen, and a freshness strip under a past
                   call would date it to today. */
                trust={historicalSelection ? null : heroTrust}
                published={publishedNotice}
                areaStrip={
                  areaStripModel ? (
                    <AreaStrip
                      model={areaStripModel}
                      earlier={weekMove?.areas}
                      /* Each area's action beside its standing, from `lg` up, where the row has
                         the width; "Your decisions this week" gives the sentence up there. */
                      rules={Object.fromEntries(homeAreaRows.map((row) => [row.area, row.rule]))}
                    />
                  ) : undefined
                }
                move={weekMove}
                feelsLike={countedReading ? { regime: countedReading.regime, href: `#${HOME_SECTIONS.diagnosis.id}` } : undefined}
                captionDetail={historicalSelection ? `Archived: ${cadenceTitle ?? periodLabel}` : undefined}
                /* Both scores on a phone too, side by side under the areas: the number and
                   where it stands. The ruled line is the margin's, from `md` up. */
                phoneFigure={
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1" data-hero-scores-compact>
                    {scoreLadders.map((ladder) => (
                      <ScoreLadder key={ladder.metric} figure="compact" label={ladder.label} value={ladder.value} lines={ladder.lines} />
                    ))}
                    {/* The facts line's one link to the basis, which it carries from md up. */}
                    <Link href={heroReading.whyHref} className="weather-hit col-span-2 text-fluid-sm leading-snug text-slate-300 underline decoration-slate-600 underline-offset-4">
                      Why conditions are {publicRegimeLabel}
                    </Link>
                  </div>
                }
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
              {!historicalSelection ? <YourRecordNote tightness={tightness} riskAppetite={riskAppetite} recordDate={reportData.treasury.record_date} /> : null}
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
              <div className="weather-brief-actions mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ShareBriefButton text={primaryCall} lines={briefShareLines} slackBlock={briefSlackBlock} showLabel />
                  <CopyStandupButton text={standupLine} />
                  <CopyExecSummaryButton text={execSummaryText} />
                  <CopyImageCardButton />
                  {/* The core loop, beside the artifact rather than 4,000px below
                      it: the alert is what a quiet week is for. */}
                  <PlainActionLink href={`#${HOME_MONDAY_EMAIL_HASH}`}>Email me Mondays →</PlainActionLink>
                </div>
                {/* No plan-horizon control here (2026-11-03): it is set once, so it
                    folds with stage and runway under the calibration line below. */}
              </div>
            </div>

            {/* The selected horizon's guidance, under the call (2026-10-29): the
                weekly call leads at every horizon, so a longer horizon joins the
                brief as a band below it rather than taking the page's lead. The
                `?cadence=` link a reader shared still opens this card — it opens
                under this week's call. */}
            {cadenceCall ? <CadenceCallCard model={cadenceCall} /> : null}

            {/* 2. The five areas: the picker, all five side by side folded under it,
                and the one plan link. */}
            <DecisionPicker
              options={decisionPickerOptions}
              initialSelected={parseHomeDecision(searchParams?.[HOME_DECISION_PARAM]) ?? data.operatorContext.decisionArea ?? undefined}
              regime={regime}
              stageLabel={stageLabel}
              activeRunway={activeRunway}
              savedReadingDate={savedReadingDate}
              isHistorical={Boolean(historicalSelection)}
              rulesAbove={Boolean(areaStripModel)}
              groups={buildAreaGroups(homeAreaRows, { tightness, riskAppetite }, {
                comparison: previousScores ? { scores: previousScores, since: basis.since } : null,
                /* An archived month's record would have to end at that month. */
                record: historicalSelection ? undefined : recordSeries,
              })}
            >
              <RunwayFold regime={regime} isHistorical={Boolean(historicalSelection)} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <ActionLink href={operateHref} variant="primary">
                  {cadenceCall?.planLabel ?? "Build this week’s plan →"}
                </ActionLink>
                {!historicalSelection && homeAreaRows.some((row) => row.pause?.met) ? (
                  <ActionLink id="what-you-may-hear" href="/roles#decision-conversations" variant="inline">
                    Sample conversations about pause rules
                  </ActionLink>
                ) : null}
              </div>
              {/* The formats a reader with one of these roles came for, named. They sat
                  behind "Share or embed this" at the foot of the page. After the areas
                  rather than beside Copy Brief: the decision, then the artifact, and the
                  words-before-the-areas budget stands. */}
              {!historicalSelection ? (
                <p data-role-formats className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fluid-sm text-slate-400">
                  Share as:
                  {ROLE_FORMAT_LINKS.map((format) => (
                    <ActionLink key={format.href} href={format.href} variant="inline">
                      {format.label}
                    </ActionLink>
                  ))}
                </p>
              ) : null}
            </DecisionPicker>

            {/* 3. Whose rules these are, and the settings behind them. Live briefs
                only: the profile holds the reader's company as of today. At every
                horizon since 2026-11-03, because the horizon control folds here too.
                Sits after the areas because the table above already names the
                company it is scaled to; this is where the reader changes that. */}
            {!historicalSelection ? (
              <CompanyCalibration
                stageLabel={stageLabel}
                activeStage={activeStage}
                activeRunway={activeRunway}
                runwayEmphasis={runwayEmphasis}
                stageAction={stageAction}
                horizon={{ control: <CadenceSelector />, current: activeCadence }}
              />
            ) : null}

            {/* 4. What changed. One table, every signal, each against the earlier
                reading and against its own lines. It opens on the table: the card
                says what the week did to the conditions and why, and each area's
                row says which of its lines moved. Only a read with nothing to
                compare says so over it. */}
            <QuietWeekFold quiet={quietWeek} regimeLabel={publicRegimeLabel}>
              <WhatChangedSection
                compact
                drawnAbove
                historyOpen={searchParams?.inputs === "1"}
                heading={`What changed ${basis.since}`}
                rows={signalChangeRows}
                moveRanges={moveRanges}
                feelsLike={countedReading}
                history={{
                  tightness: conditionsTrail.points.map((point) => ({ label: point.label, value: point.tightness })),
                  riskAppetite: conditionsTrail.points.map((point) => ({ label: point.label, value: point.riskAppetite })),
                }}
                historyCaveat={conditionsTrail.caveat}
                inputHistory={historicalSelection ? undefined : inputHistory}
                lead={comparisonUnavailable ? describeWeeklyMovement({ tightnessDelta, riskAppetiteDelta, comparisonUnavailable, basis, savedReadingDate }) : undefined}
                comparisonUnavailable={comparisonUnavailable}
                basis={basis}
              />

              {/* 5. What the conditions are made of, and what the reading leaves out:
                  the two scores with their meanings, the excluded inputs that would
                  change the classification, and the capped score's real distance. */}
              <WhyConditionsSection
                regime={regime}
                tightness={tightness}
                riskAppetite={riskAppetite}
                changeLines={callChangeLines}
                pendingConditions={reportData.assessment.regimeTransition?.pending
                  ? reportData.assessment.regimeTransition.candidateState
                  : undefined}
                notCounted={reportData.scoringBasis.notCounted}
                warning={reportData.scoringBasis.warning}
              />

              {/* 6. What would change the guidance: its pause and restart lines, the
                  line where conditions change, and where the reading sits. */}
              <WhatWouldChangeSection
                feelsLike={countedReading}
                ladders={scoreLadders}
                flipProximity={v2HeroSignalData.flipProximity}
                reversalTrigger={reversalTriggerLabel}
                resumeWhen={resumeWhenLabel}
                guardrail={guardrailLabel}
                leadResume={leadResumeCondition ? formatDecisionReversal(leadResumeCondition) : undefined}
                leadHeld={leadItem ? anyPauseLineMet([leadItem], { tightness, riskAppetite }) : undefined}
                flipConditions={flipConditionLabels}
                callChangeLines={callChangeLines}
                regime={regime}
                conditionsTrail={conditionsTrail}
              />

              {/* 8. How unusual is this? */}
              <RecordSection
                lastTime={lastTimeCallChanged}
                callChangeLines={callChangeLines}
                turningPoints={turningPoints}
                spellLengths={spellLengths}
                record={historicalSelection ? undefined : recordSeries}
              />
            </QuietWeekFold>

            {/* 9. The alert: hearing the day a line is crossed is how the page is
                meant to be used, so it follows everything it watches. */}
            <AlertSection defaultFrequency={arrivedFromShare ? "weekly" : "alerts"} />

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
      <HomePageTail
        structuredData={homepage.reportShell.structuredData}
        call={primaryCall}
        direction={signalDirection}
        weatherWord={publicRegimeLabel}
        marginLabel={formatStripMargin(confidenceLabel ?? "HIGH", trustStripProps.margin?.points)}
        shareLines={briefShareLines}
      />
    </Shell>
  );
}
