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
import { FirstVisitExplainer } from "./components/homeFirstRunOrientation";
import { TimeMachineCalendarPicker } from "./components/TimeMachineCalendarPicker";
import { CompactTrustPopover } from "./components/CompactTrustPopover";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { CadenceSelector } from "./components/cadenceSelector";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel, isRegimeKey } from "../lib/regimePresentation";
import { CONFIDENCE_WORD } from "./components/trustStrip";
import { isRoute } from "../lib/navigation/routeType";
import { resolveDataStatusGuidance } from "../lib/report/trustStatus";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC } from "../lib/formatters";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { buildQuietDayRead } from "../lib/report/flipProximity";
import { buildChangedLead } from "../lib/report/decisionMovement";
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
  buildHomeAreaRows,
  buildSignalChangeRows,
  describeWeeklyMovement,
} from "../lib/report/home/homeSectionModel";
import { findLastTimeCallChanged } from "../lib/report/lastTimeCallChanged";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { previousScoresFromDynamics } from "../lib/export/scoreReference";
import { getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";
import { buildTrackRecord } from "../lib/report/trackRecord";
import { getLatestTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";
import { JsonLdScript } from "./components/jsonLdScript";
import { PublishedCallWatcher } from "./components/publishedCallWatcher";
import { OfflineNotice } from "./components/offlineNotice";
import { FirstVisitDecisionPicker, type DecisionPickerOption } from "./components/home/FirstVisitDecisionPicker";
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
  /* What that earlier reading is: the previous monthly snapshot, named by its
     date wherever this page used to say "last week". */
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
  const weeklyLeadershipSummary = homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary;

  const signalDirection: SignalDirection = (
    homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten"
    : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease"
    : "hold"
  );

  /* `/share` builds the same object from the same fields, so the derivation
   * lives in lib/report rather than here — the guardrail label alone has three
   * fallbacks, and a second copy of that is how two surfaces come to state
   * different thresholds for one week. */
  const {
    primaryCall,
    flipConditionLabels,
    guardrailLabel,
    parsedGuardrailThreshold,
    reversalTriggerLabel,
    resumeWhenLabel,
    briefShareLines,
  } = deriveBriefCallFields(homepage.weeklyDecisionCardModel);

  const v2HeroSignalData = {
    ...buildV2HeroSignalData(reportData),
    flipProximity: buildFlipProximity(reportData.assessment).map((entry) => entry.sentence),
  };

  /* The quiet-day read: the line a returning reader on a non-Monday needs to
     know the call still stands and how far it is from flipping. Derived from
     the same snapshot the hero draws, so the verdict and the flip watch cannot
     disagree; absent on a week the call moved. */
  /* "Call unchanged" is a claim about a comparison: never on a read with no
     previous week (`steadyWeek` is computed from a zero move there), never on a
     week the call moved (a sub-point move can still be the confirming read),
     and never on an archived week, which the banner above dates. */
  const quietDayLine =
    previousScores && !reportData.regimeAlert && !historicalSelection
      ? buildQuietDayRead({
          steadyWeek: weeklyLeadershipSummary.steadyWeek,
          flipProximity: v2HeroSignalData.flipProximity,
        })
      : null;

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

  /* The whole record, as /history reads it, so the popover's "months on
   * record" and the page it links to agree. The series walk is cached per
   * window, so the second reader of the full window pays nothing. */
  const trackRecord = buildTrackRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));

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
    nearestLine: v2HeroSignalData.flipProximity[0],
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
        <div className="flex flex-col gap-4 sm:gap-8 min-w-0">
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
          <FirstVisitExplainer arrival={arrivedFromShare ? "share" : undefined} />
          {/* Meta row: week switcher and the confidence popover. The "Data through …
              · refreshed …" line that sat under the switcher restated the hero's
              trust line and the popover's timestamp; the stage pill that sat beside
              the popover overlapped the hero's own stage control at every width
              above `sm` (the header carries the phone-only pill).

              The row wraps rather than stacking below `sm`: on a 430px phone the
              week title and the confidence chip fit on one line, and stacking
              them put a fifth row between the top of the page and the call on a
              first visit. Where they do not fit, the chip wraps under the
              title, which is the row the stack gave every phone. */}
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
                  currentDateLabel={cadenceTitle ?? "Week of " + homepage.reportShell.recordDateLabel}
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
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto mt-1 sm:mt-0">
              {/* The horizon sits with the other period controls, next to the
                  week it qualifies. It used to live at the foot of the page
                  while the card it swaps renders at the top, and reached back
                  up with a `scrollIntoView` — so using it correctly meant
                  being scrolled somewhere you had not asked to go, and not
                  using it meant never learning the card could change. */}
              <CadenceSelector />
              <CompactTrustPopover
                /* The fallback is a code like the real value, not the phrase it
                   used to be — the popover formats both the same way now. */
                confidenceLabel={confidenceLabel ?? "HIGH"}
                isHistorical={Boolean(historicalSelection)}
                fetchedAtLabel={homepage.reportShell.fetchedAtLabel}
                recordDateLabel={homepage.reportShell.recordDateLabel}
                treasurySource={homepage.reportShell.treasurySource}
                degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
                record={trackRecord}
                regime={regime}
              />
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
                weeklyCall={primaryCall}
                callDetail={homepage.weeklyDecisionCardModel.decision.actionNowShort}
                regime={regime}
                /* An archived week carries no live trust: the banner above says
                   which week is on screen, and a freshness strip under a past
                   call would date it to today. */
                trust={historicalSelection ? null : trustStripProps}
                captionDetail={historicalSelection ? `Archived: ${cadenceTitle ?? "Week of " + homepage.reportShell.recordDateLabel}` : undefined}
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
                  flipProximitySentence={v2HeroSignalData.flipProximity[0]}
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
              <div
                data-first-visit-collapsible={offersFirstVisitFold ? "true" : undefined}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <ShareBriefButton text={primaryCall} lines={briefShareLines} showLabel />
              </div>
            </div>

            {offersFirstVisitFold ? (
              <FirstVisitDecisionPicker
                options={decisionPickerOptions}
                regime={regime}
                flipCondition={reversalTriggerLabel}
                turningPoints={turningPoints}
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

            {/* 4. What would change the call: the two ladders with their three
                lines and the earlier reading’s dot, the flip watch under the axis each
                sentence describes, and — only on a week the call moved — what
                happened the last time it moved this way. */}
            <WhatWouldChangeSection
              ladders={scoreLadders}
              flipProximity={buildFlipProximity(reportData.assessment)}
              reversalTrigger={reversalTriggerLabel}
              resumeWhen={resumeWhenLabel}
              guardrail={guardrailLabel}
              flipConditions={flipConditionLabels}
              thresholdBusinessConsequence={homepage.weeklyDecisionCardModel.decision.thresholdBusinessConsequence}
              lastTime={lastTimeCallChanged}
              callChangeLines={callChangeLines}
              basis={basis}
            />

            {/* 5. Do and share, including the one conversion on the page. */}
            <DoAndShareSection
              operateHref={operateHref}
              planLabel={cadenceCall?.planLabel}
              currentRecordDate={reportData.treasury.record_date}
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
        confidenceWord={CONFIDENCE_WORD[confidenceLabel ?? "HIGH"]}
        shareLines={briefShareLines}
      />
    </Shell>
  );
}
