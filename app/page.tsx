import type { Metadata } from "next";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { ActionLink } from "./components/ui/actionLink";
import { buildPublishedBriefPath, selectCitablePermalinkBrief } from "../lib/report/publishedBriefs";
import { BriefArtifactScript } from "./components/briefArtifactScript";
import { buildBriefArtifact, deriveBriefCallFields } from "../lib/report/homeBrief/briefArtifactBuilder";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { SubscribeForm } from "./components/SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { DirectAnswersStrip } from "./components/home/DirectAnswersStrip";
import { WeeklyRetrospectiveCard } from "./components/home/WeeklyRetrospectiveCard";
import { ActivationTracker } from "./components/activationTracker";
import { FirstVisitExplainer } from "./components/homeFirstRunOrientation";
import { isDisclosureOpenInParams } from "./components/ui/disclosureUrlState";
import { TimeMachineCalendarPicker } from "./components/TimeMachineCalendarPicker";
import { CompactTrustPopover } from "./components/CompactTrustPopover";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import { CadenceSelector } from "./components/cadenceSelector";
import { buildCadenceCallModel, type CadenceCallHorizon } from "../lib/report/cadenceCallModel";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { serializeJsonLd } from "../lib/seo";
import { resolveDataStatusGuidance } from "../lib/report/trustStatus";
import {
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatMonthYearShortFromValue } from "../lib/formatters";
import { buildBoldnessScore } from "../lib/report/weeklyLeadershipBrief";
import { guardrailMatchesRule } from "../lib/report/boundedDecisionRules";
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
import { KeyDriversCard } from "./components/hero/KeyDriversCard";
import { buildDriverViews } from "../lib/report/driverDecisionViews";
import { getTimeMachineRollingYieldSeries } from "../lib/timeMachine/timeMachineCache";
import { ActionsThisWeekCard } from "./components/hero/ActionsThisWeekCard";
import { WhatCouldChangeCard } from "./components/hero/WhatCouldChangeCard";
import { StressTestQuickCard } from "./components/hero/StressTestQuickCard";
import { RecentPostureHistoryCard } from "./components/hero/RecentPostureHistoryCard";
import { StageDropdownPill } from "./components/StageDropdownPill";
import { getLatestTimeMachineSnapshot } from "../lib/timeMachine/timeMachineCache";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const regimeHistory = getMonthlyRegimeHistory();

  return (
    <Shell regime={regimeHistory.at(-1)?.regime}>
      <PageContent searchParams={resolved} regimeHistory={regimeHistory} />
    </Shell>
  );
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
function CanonicalWeekPermalink({ currentRecordDate }: { currentRecordDate: string }) {
  const brief = selectCitablePermalinkBrief(currentRecordDate);
  if (!brief) return null;

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md space-y-2.5 px-4 py-3.5">
      <p className="text-fluid-xs text-slate-300">
        This week is published as a permanent record dated <span className="font-medium text-white">{brief.recordDateLabel}</span>.
      </p>
      <ActionLink href={buildPublishedBriefPath(brief.slug)} variant="pill">
        Citable permalink
      </ActionLink>
    </section>
  );
}

type BelowTheFoldEvidenceProps = {
  operateHref?: string;
  /** Named for the selected cadence, so the one plan CTA on the page matches the
   *  horizon the reader is looking at. */
  planLabel?: string;
};

function BelowTheFoldEvidence(props: BelowTheFoldEvidenceProps) {
  return (
    /* `pill`, not `primary`. DD-005 settled Copy Brief in the hero as the one
       canonical primary action on this page; a second full-weight blue button
       further down competed with it and gave the reader no way to rank them.
       §X reserves `pill` for exactly this — a secondary navigation CTA. */
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <ActionLink href={props.operateHref ?? "/operate"} variant="pill">
        {props.planLabel ?? "Build this week’s plan →"}
      </ActionLink>
    </div>
  );
}

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
    return <HomeBriefLoadError />;
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

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const activeStage = homepage.weeklyDecisionCardModel.decision.startupVariantPolicy.selectedMode;

  const asOfDate = timeMachineRequest
    ? resolveHistoricalDate(timeMachineRequest.year, timeMachineRequest.month)
    : null;
  const asOfTimestamp = asOfDate ? new Date(asOfDate).getTime() : Number.NaN;
  const alignedRegimeHistory = Number.isFinite(asOfTimestamp)
    ? regimeHistory.filter((entry) => new Date(entry.record_date).getTime() <= asOfTimestamp)
    : regimeHistory;
  const macroTrendline = alignedRegimeHistory.slice(-24);

  // Same score the hero headlines, computed back across the window so the number
  // carries its own history. Months missing either input are dropped rather than
  // interpolated — a gap is honest, an invented point is not.
  const boldnessTrend = macroTrendline.flatMap((entry) =>
    entry.tightness != null && entry.riskAppetite != null
      ? [{
          label: formatMonthYearShortFromValue(entry.record_date),
          value: buildBoldnessScore(entry.tightness, entry.riskAppetite),
        }]
      : [],
  );

  const signalDeltas = new Map(
    homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.map((s) => [s.key, s.delta] as const)
  );
  const tightnessDelta = signalDeltas.get("tightness") ?? 0;
  const riskAppetiteDelta = signalDeltas.get("riskAppetite") ?? 0;

  // Derived from `assessment.scores` rather than from the diagnostics copy so the prior
  // read and the current one come off the same series. `changedSignals` is empty both
  // when nothing moved and when there is no prior read at all, and the two are not the
  // same claim — so an empty list yields no prior read rather than an invented flat one.
  const cadencePreviousScores = signalDeltas.size > 0
    ? {
        tightness: reportData.assessment.scores.tightness - tightnessDelta,
        riskAppetite: reportData.assessment.scores.riskAppetite - riskAppetiteDelta,
      }
    : null;

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
          previousScores: cadencePreviousScores,
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
    revisitQueue,
    noChangeAreas,
    guardrailLabel,
    parsedGuardrailThreshold,
    reversalTriggerLabel,
    briefShareLines,
  } = deriveBriefCallFields(homepage.weeklyDecisionCardModel);

  const v2HeroSignalData = buildV2HeroSignalData(reportData);

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

  /* The three driver rows, each built for the clock the decision it governs
   * runs on: funding pressure as an action ladder with persistence, risk
   * appetite as remaining cushion with its consumption pace, financing as a
   * horizon trend with no threshold bar. The pause lines are the printed
   * corridor rule's own — the same discipline the hero's bounded rails follow —
   * and the rate history is the snapshot store's rolling 1M-bill series, null
   * for months with no snapshot rather than interpolated. */
  const driverViews = buildDriverViews({
    tightness,
    tightnessDelta,
    riskAppetite,
    tightnessRegime: reportData.assessment.thresholds.tightnessRegime,
    riskAppetiteRegime: reportData.assessment.thresholds.riskAppetiteRegime,
    corridorPauseLines: boundedConditions?.pause,
    corridorPauseVerb: corridorRule?.pause.verb,
    baseRate: v2HeroSignalData.baseRate ?? null,
    baseRateUsed: v2HeroSignalData.baseRateUsed,
    history: macroTrendline,
    rateHistory: getTimeMachineRollingYieldSeries(7, reportData.treasury.record_date).oneMonth.map((point) => point.value),
  });

  /* One join, two labels. The `h1` is this page's accessible name, where the
   * product name would be noise; the artifact title is what lands in someone
   * else's Slack channel, where it is the only thing identifying the source. A
   * selected horizon names itself in both. */
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

  const cardActions = (homepage.weeklyDecisionCardModel.decision.actionStripItems?.length ?? 0) > 0
    ? homepage.weeklyDecisionCardModel.decision.actionStripItems!.map((item, idx) => ({
        id: idx + 1,
        text: item.areaActionNow,
        href: `${operateHref}#${item.lever}`,
      }))
    : (homepage.weeklyDecisionCardModel.decision.decisionRules?.slice(0, 3).map((rule, idx) => ({
        id: idx + 1,
        text: rule.doNow[0] ?? rule.recommendation,
        href: `${operateHref}#${rule.area}`,
      })) ?? []);

  const primaryFlipText = flipConditionLabels?.[0]
    ?? reversalTriggerLabel
    ?? `Rises above ${reportData.assessment.thresholds.tightnessRegime} (${tightness} today), which could flip the call to Cloudy.`;

  return (
    <>
      <BriefArtifactScript artifact={briefArtifact} />
      <h1 className="sr-only" id="share-ready-artifact">
        {cadenceTitle ?? "Weekly Brief"}
      </h1>
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
            previousHref={
              previousHistoricalRequest
                ? buildTimeMachineHref("/", previousHistoricalRequest)
                : undefined
            }
          />
        </div>
      ) : null}
      <div className="mx-auto max-w-[64rem] space-y-8">
        <div className="space-y-8 min-w-0">
          {/* Above the brief, not after it. This is the orientation line for a
              first-time visitor, and it sat below the hero, all three operating
              levers, and the compare strip — roughly 2,800px down on mobile,
              where it cannot orient anyone. Its own bottom-border styling was
              always that of a top strip. Hiding once dismissed is a global CSS
              rule keyed on the data attribute (app/layout.tsx), so it stays
              pre-paint and CLS-free at either position. */}
          <FirstVisitExplainer />
          {/* Header row: Week of Date switcher, Data currency, Stage dropdown, Confidence pill */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
            <div>
              <div className="flex items-center gap-2">
                {prevWeekHref ? (
                  <Link
                    href={prevWeekHref}
                    aria-label="Previous week"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-colors no-underline"
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-colors no-underline"
                  >
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800/40 bg-slate-900/30 text-slate-600 cursor-not-allowed">
                    <ChevronRight size={16} />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Data through {homepage.reportShell.recordDateLabel} · refreshed {homepage.reportShell.fetchedAtLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto mt-1 sm:mt-0">
              <StageDropdownPill className="hidden sm:inline-flex" />
              <CompactTrustPopover
                confidenceLabel={confidenceLabel ?? "High confidence"}
                isHistorical={Boolean(historicalSelection)}
                fetchedAtLabel={homepage.reportShell.fetchedAtLabel}
                recordDateLabel={homepage.reportShell.recordDateLabel}
                treasurySource={homepage.reportShell.treasurySource}
                degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
              />
            </div>
          </div>
          <div data-page-section="weekly-call" tabIndex={-1} aria-labelledby="weekly-call-heading" className="scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
          <h2 id="weekly-call-heading" className="sr-only">This week’s operating call</h2>
          <SwipeableWeek
            currentMonth={searchParams?.month ? parseInt(searchParams.month, 10) : undefined}
            currentYear={searchParams?.year ? parseInt(searchParams.year, 10) : undefined}
            serverMonths={macroTrendline.map((entry) => {
              const d = new Date(entry.record_date);
              return {
                recordDate: entry.record_date,
                month: d.getMonth() + 1,
                year: d.getFullYear(),
              };
            })}
          >
            {cadenceCall ? <CadenceCallCard model={cadenceCall} /> : null}
            <DecisionHero
              tightness={tightness}
              tightnessDelta={tightnessDelta}
              tightnessPressure={tightnessPressure}
              tightnessSaturated={tightnessSaturated}
              riskAppetite={riskAppetite}
              riskAppetiteDelta={riskAppetiteDelta}
              boldnessScore={weeklyLeadershipSummary.boldnessScore}
              boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
              boldnessTrend={boldnessTrend}
              boldnessShorthand={weeklyLeadershipSummary.shorthandLine}
              weeklyCall={primaryCall}
              actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
              regime={regime}
              postureLabel={postureLabel}
              signalDirection={signalDirection}
              recordDate={homepage.reportShell.recordDateLabel}
              fetchedAt={homepage.reportShell.fetchedAtLabel}
              confidenceLabel={confidenceLabel}
              trustStatusLabel={homepage.reportShell.trustStatusLabel}
              treasurySource={homepage.reportShell.treasurySource}
              degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
              isFallback={homepage.reportShell.showOfflineBadge}
              signalData={v2HeroSignalData}
              signalIndicators={homepage.weeklyDecisionCardModel.diagnostics.regimeSignalIndicators}
              flipConditions={flipConditionLabels}
              guardrail={guardrailLabel}
              reversalTrigger={reversalTriggerLabel}
              boundedConditions={boundedConditions}
              shareLines={briefShareLines}
              revisitDecisions={homepage.weeklyDecisionCardModel.decision.revisitDecisions}
              revisitQueue={revisitQueue}
              noChangeAreas={noChangeAreas}
              thresholdBusinessConsequence={homepage.weeklyDecisionCardModel.decision.thresholdBusinessConsequence}
              signalBreakdownOpen={isDisclosureOpenInParams(searchParams, "why")}
              activeStage={activeStage}
            />

            {/* 3-Column Executive Grid on Desktop, 2-Column on Tablet, Stack on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch mt-4">
              <KeyDriversCard views={driverViews} />

              <ActionsThisWeekCard
                actions={cardActions}
                operateHref={operateHref}
              />

              <WhatCouldChangeCard
                items={[
                  {
                    id: "funding",
                    label: `Funding pressure > ${reportData.assessment.thresholds.tightnessRegime}`,
                    description: tightness >= reportData.assessment.thresholds.tightnessRegime
                      ? "already above warning threshold; restricts hiring."
                      : "increases likelihood of Cloudy posture.",
                    icon: "alert",
                  },
                  {
                    id: "risk",
                    label: `Risk appetite < ${reportData.assessment.thresholds.riskAppetiteRegime}`,
                    description: primaryFlipText.toLowerCase().includes("risk appetite")
                      ? primaryFlipText
                      : "likely flips call to Cloudy / Defensive.",
                    icon: "arrow",
                  },
                  {
                    id: "rates",
                    label: "Further macro deterioration",
                    description: "raises financing costs and debt burden.",
                    icon: "percent",
                  },
                ]}
                signalsHref="/signals"
              />
            </div>

            {/* Mockup Card: Recent posture history (Weekly outlook over time) */}
            <div className="mt-5">
              <RecentPostureHistoryCard
                history={macroTrendline}
                historyHref="/history"
                currentRegime={regime}
                currentTightness={tightness}
                tightnessDelta={tightnessDelta}
                riskAppetite={riskAppetite}
                riskAppetiteDelta={riskAppetiteDelta}
                serverPrevious={macroTrendline.length >= 2 ? { regime: macroTrendline[macroTrendline.length - 2].regime, recordDate: macroTrendline[macroTrendline.length - 2].record_date } : null}
                currentRecordDate={homepage.reportShell.recordDateLabel}
              />
            </div>

            {/* Mockup Card: Stress-test a decision (See how it changes the outlook) */}
            <div className="mt-5">
              <StressTestQuickCard
                planHref={operateHref}
                assessment={reportData.assessment}
                recordDate={homepage.reportShell.recordDateLabel}
                activeStage={activeStage}
              />
            </div>
          </SwipeableWeek>
          </div>

          {/* Directly under the call, not 3,000px below it. The one conversion
              on the page used to sit under the stress tester, the decision
              tracker and the week close-out; the recipient of a shared link
              scrolled past everything the product asked of them to reach it. */}
          <div id="subscribe" data-page-section="subscribe" tabIndex={-1} aria-labelledby="subscribe-heading" className="scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
            <h2 id="subscribe-heading" className="sr-only">Get the weekly call by email</h2>
            <SubscribeForm compact />
          </div>

          {/* Below the call: unified retrospective card */}
          <div data-page-section="since-last-visit" tabIndex={-1} aria-labelledby="since-last-visit-heading" className="scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
            <h2 id="since-last-visit-heading" className="sr-only">Weekly Retrospective</h2>
            <WeeklyRetrospectiveCard
              currentVisit={{
                recordDate: reportData.treasury.record_date,
                recordDateLabel: homepage.reportShell.recordDateLabel,
                regimeLabel: publicRegimeLabel,
                call: primaryCall,
              }}
              hindsight={{
                regime: regime,
                scores: { tightness, riskAppetite },
                deltas: { tightness: tightnessDelta, riskAppetite: riskAppetiteDelta },
                thresholds: reportData.assessment.thresholds,
                recordDateLabel: homepage.reportShell.recordDateLabel,
              }}
            />
          </div>

          <div data-page-section="direct-answers" tabIndex={-1} className="scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
          <DirectAnswersStrip actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort ?? primaryCall} />
          </div>

          <div data-page-section="plan-and-evidence" tabIndex={-1} aria-labelledby="plan-and-evidence-heading" className="scroll-mt-28 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400">
          <h2 id="plan-and-evidence-heading" className="sr-only">Build the plan, and the evidence behind the call</h2>
          <BelowTheFoldEvidence operateHref={operateHref} planLabel={cadenceCall?.planLabel} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/70 pt-4">
            <span className="text-fluid-sm text-slate-400">Planning horizon</span>
            <CadenceSelector />
          </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-800/70 pt-6">
          <CanonicalWeekPermalink currentRecordDate={reportData.treasury.record_date} />
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homepage.reportShell.structuredData) }}
      />

      <StickyCallStrip
        call={primaryCall}
        direction={signalDirection}
        boldnessScore={weeklyLeadershipSummary.boldnessScore}
        boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
        shareLines={briefShareLines}
      />
    </>
  );
}
