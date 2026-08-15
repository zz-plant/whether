import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { ActionLink } from "./components/ui/actionLink";
import { buildPublishedBriefPath, latestPublishedBrief } from "../lib/report/publishedBriefs";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { RegimeHistory } from "./components/RegimeHistory";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { RitualCheck } from "./components/RitualCheck";
import { ToolsPanel } from "./components/ToolsPanel";
import { SubscribeForm } from "./components/SubscribeForm";
import { DecisionRouteRail } from "./components/DecisionRouteRail";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { ThreeWhethersCard } from "./components/ThreeWhethersCard";
import { CompareStrip } from "./components/CompareStrip";
import { FirstVisitExplainer } from "./components/homeFirstRunOrientation";
import { FreshnessDot } from "./components/FreshnessDot";
import { StageSwitcher } from "./components/StageSwitcher";
import { ViewSelector } from "./components/cadenceSelector";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import dynamic from "next/dynamic";
import { computeTransitionProbability } from "./components/home/RegimeTransitionProbability";
import { buildAgentInterfaceResponse, isAgentCadence, type AgentCadence } from "../lib/agentInterface";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import {
  DIRECTION_ARROW,
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatMonthYearShortFromValue } from "../lib/formatters";
import { buildBoldnessScore } from "../lib/report/weeklyLeadershipBrief";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { HomeBriefLoadError } from "./components/home/HomeBriefLoadError";

const EvidenceTools = dynamic(
  () => import("./components/EvidenceTools").then((mod) => mod.EvidenceTools),
  {
    ssr: false,
    loading: () => (
      <div className="weather-card h-64 animate-pulse space-y-4 p-5">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 rounded bg-white/5" />
          <div className="h-20 rounded bg-white/5" />
        </div>
        <div className="h-10 w-full rounded bg-white/10" />
      </div>
    ),
  },
);

const ScenarioSimulator = dynamic(
  () => import("./components/ScenarioSimulator").then((mod) => mod.ScenarioSimulator),
  {
    ssr: false,
    loading: () => (
      <div className="weather-card h-72 animate-pulse space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/5" />
        </div>
        <div className="h-24 w-full rounded bg-white/5" />
        <div className="h-12 w-full rounded bg-white/10" />
      </div>
    ),
  },
);

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
 */
function CanonicalWeekPermalink() {
  if (!latestPublishedBrief) return null;

  return (
    <section className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md space-y-2.5 px-4 py-3.5 shadow-md">
      <p className="text-fluid-xs text-slate-300">
        This week is published as a permanent record dated <span className="font-medium text-white">{latestPublishedBrief.recordDateLabel}</span>.
      </p>
      <ActionLink href={buildPublishedBriefPath(latestPublishedBrief.slug)} variant="pill">
        Citable permalink
      </ActionLink>
    </section>
  );
}

type RegimeEntry = { record_date: string; regime: string };

type BelowTheFoldEvidenceProps = {
  highlight: string | undefined;
  tightness: number;
  boldnessScore: number;
  pauseThreshold: number;
  currentRiskAppetite: number;
  currentRegime: string;
  companyStage: string | undefined;
  tightnessDelta: number;
  riskAppetiteDelta: number;
  recordDate: string;
  recentRecordDates: string[];
};

function BelowTheFoldEvidence(props: BelowTheFoldEvidenceProps) {
  return (
    <>
      <EvidenceDrawer highlight={props.highlight}>
        <ToolsPanel>
          <ScenarioSimulator
            baseTightness={props.tightness}
            baseBoldness={props.boldnessScore}
            pauseThreshold={props.pauseThreshold}
          />
          <EvidenceTools
            currentTightness={props.tightness}
            currentRiskAppetite={props.currentRiskAppetite}
            currentRegime={props.currentRegime}
            companyStage={props.companyStage}
            tightnessDelta={props.tightnessDelta}
            riskAppetiteDelta={props.riskAppetiteDelta}
          />
        </ToolsPanel>
      </EvidenceDrawer>

      <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ActionLink href="/operate" variant="primary">
            Build this week&apos;s plan →
          </ActionLink>
          <RitualCheck
            recordDate={props.recordDate}
            recentRecordDates={props.recentRecordDates}
          />
        </div>
        <DecisionRouteRail />
      </div>
    </>
  );
}

function BelowTheFoldHistory({
  regimes,
}: {
  regimes: RegimeEntry[];
}) {
  return <RegimeHistory regimes={regimes} />;
}

async function AsyncCadenceSection({ cadence }: { cadence: Exclude<AgentCadence, "weekly"> }) {
  const cadenceData = await buildAgentInterfaceResponse(cadence).catch(() => null);
  if (!cadenceData) return null;
  return <CadenceCallCard cadence={cadence} data={cadenceData} />;
}

async function PageContent({
  searchParams,
  regimeHistory,
}: {
  searchParams?: HomePageSearchParams;
  regimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
}) {
  const activeCadence = searchParams?.cadence && isAgentCadence(searchParams.cadence) ? searchParams.cadence : "weekly";

  let data: Awaited<ReturnType<typeof loadHomePageAssembly>>;

  try {
    data = await loadHomePageAssembly(searchParams);
  } catch {
    return <HomeBriefLoadError />;
  }

  const { homepage, reportData, operatorContext } = data;
  const isDegraded = !homepage.reportResult.ok;

  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? "";
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const regime = homepage.reportShell.regime;
  const publicRegimeLabel = getRegimePublicLabel(regime);
  const macroTrendline = regimeHistory.slice(-24);

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

  const tightness = homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness;
  const riskAppetite = homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite;
  const weeklyLeadershipSummary = homepage.weeklyDecisionCardModel.decision.weeklyLeadershipSummary;

  const signalDeltas = new Map(
    homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.map((s) => [s.key, s.delta] as const)
  );
  const tightnessDelta = signalDeltas.get("tightness") ?? 0;
  const riskAppetiteDelta = signalDeltas.get("riskAppetite") ?? 0;

  const signalDirection: SignalDirection = (
    homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("tighten") ? "tighten"
    : homepage.weeklyDecisionCardModel.status.trendLabel?.toLowerCase().includes("ease") ? "ease"
    : "hold"
  );

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const primaryCall = canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? weeklyLeadershipSummary.shorthandLine;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const v2HeroSignalData = buildV2HeroSignalData(reportData);

  const transition = computeTransitionProbability(regime);
  const toolHighlight = transition.probability > 50 ? "Transition" : Math.abs(tightnessDelta) > 3 ? "Simulator" : undefined;

  const guardrailThresholdRaw = homepage.weeklyDecisionCardModel.decision.guardrailThreshold;
  const parsedGuardrailThreshold = typeof guardrailThresholdRaw === "number"
    ? guardrailThresholdRaw
    : Number.parseFloat(String(guardrailThresholdRaw ?? ""));
  const pauseThreshold = Number.isFinite(parsedGuardrailThreshold) ? parsedGuardrailThreshold : 70;

  const numericGuardrailLabel = Number.isFinite(parsedGuardrailThreshold)
    ? `Cash availability crosses ${parsedGuardrailThreshold}`
    : undefined;
  const guardrailLabel = numericGuardrailLabel
    ?? homepage.weeklyDecisionCardModel.decision.guardrail
    ?? (typeof guardrailThresholdRaw === "string" ? guardrailThresholdRaw : undefined);
  const reversalTriggerLabel = homepage.weeklyDecisionCardModel.decision.reversalTrigger;
  const briefShareLines = [
    homepage.weeklyDecisionCardModel.decision.actionNowShort
      ? `${DECISION_CONTRACT_LABELS.action.doNow}: ${homepage.weeklyDecisionCardModel.decision.actionNowShort}`
      : null,
    guardrailLabel ? `${DECISION_CONTRACT_LABELS.threshold.guardrail}: ${guardrailLabel}` : null,
    reversalTriggerLabel ? `${DECISION_CONTRACT_LABELS.reversal.reversal}: ${reversalTriggerLabel}` : null,
    flipConditionLabels.length > 0
      ? `${DECISION_CONTRACT_LABELS.watch.flipWatch}: ${flipConditionLabels.join("; ")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <>
      <h1 className="sr-only" id="share-ready-artifact">Weekly Brief</h1>
      <FreshnessDot
        label={homepage.reportShell.fetchedAtLabel}
        recordDate={homepage.reportShell.recordDateLabel}
        treasurySource={homepage.reportShell.treasurySource}
        trustStatusLabel={homepage.reportShell.trustStatusLabel}
        degradedSourceRows={homepage.reportShell.degradedSourceRows}
        showOfflineBadge={homepage.reportShell.showOfflineBadge}
      />
      {isDegraded ? (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-fluid-micro">
          <span className="font-semibold text-amber-300/80">Some data is cached.</span>{" "}
          <span className="text-amber-300/50">Stage decisions but don&apos;t commit until live data returns.</span>
        </div>
      ) : null}
      <div className="mx-auto max-w-[64rem] space-y-8">
        <div className="space-y-8 min-w-0">
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
            {activeCadence !== "weekly" ? (
              <Suspense fallback={<div className="weather-card h-28 animate-pulse" />}>
                <AsyncCadenceSection cadence={activeCadence} />
              </Suspense>
            ) : null}
            <DecisionHero
                tightness={tightness}
                tightnessDelta={tightnessDelta}
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
                transitionProbability={transition.probability}
                guardrail={guardrailLabel}
                reversalTrigger={reversalTriggerLabel}
                shareLines={briefShareLines}
                revisitDecisions={homepage.weeklyDecisionCardModel.decision.revisitDecisions}
                revisitQueue={homepage.weeklyDecisionCardModel.decision.revisitQueue.slice(0, 3)}
               />

            <ThreeWhethersCard
               items={homepage.weeklyDecisionCardModel.decision.actionStripItems ?? []}
               sharedFlipCorridor={homepage.weeklyDecisionCardModel.decision.sharedFlipCorridor}
             />

            <CompareStrip
               currentRegime={regime}
               currentTightness={tightness}
               tightnessDelta={tightnessDelta}
               riskAppetite={riskAppetite}
               riskAppetiteDelta={riskAppetiteDelta}
               serverPrevious={macroTrendline.length >= 2 ? { regime: macroTrendline[macroTrendline.length - 2].regime, recordDate: macroTrendline[macroTrendline.length - 2].record_date } : null}
               autoExpand={Math.abs(tightnessDelta) >= 3 || (macroTrendline.length >= 2 && macroTrendline[macroTrendline.length - 2].regime !== regime)}
             />
            <details className="group weather-section-border">
              <summary className="flex min-h-11 cursor-pointer select-none items-center text-fluid-xs font-medium text-slate-300 after:ml-auto after:text-slate-500 after:content-['▾'] group-open:after:content-['▴']">
                Interpret this call for your company
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StageSwitcher currentStage={operatorContext.companyStage} />
                <ViewSelector />
              </div>
            </details>
          </SwipeableWeek>
          <FirstVisitExplainer />

          <Suspense fallback={
            <div className="space-y-6">
              <div className="weather-card h-20 animate-pulse" />
              <div className="weather-card h-32 animate-pulse" />
              <div className="weather-card h-12 animate-pulse" />
            </div>
          }>
            <BelowTheFoldEvidence
              highlight={toolHighlight}
              tightness={tightness}
              boldnessScore={weeklyLeadershipSummary.boldnessScore}
              pauseThreshold={pauseThreshold}
              currentRiskAppetite={riskAppetite}
              currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
              companyStage={operatorContext.companyStage ?? undefined}
              tightnessDelta={tightnessDelta}
              riskAppetiteDelta={riskAppetiteDelta}
              recordDate={homepage.reportShell.recordDateLabel}
              recentRecordDates={macroTrendline.slice(-4).map((entry) => formatDateUTC(entry.record_date))}
            />
          </Suspense>
        </div>

        <section className="grid gap-4 border-t border-slate-800/70 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]" aria-label="Continuity and delivery">
          <Suspense fallback={<div className="weather-card h-48 animate-pulse" />}>
            <BelowTheFoldHistory
              regimes={macroTrendline}
            />
          </Suspense>
          <SubscribeForm />
          <CanonicalWeekPermalink />
        </section>
       </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["Article", "Report"],
              "headline": `Whether Weekly Brief — ${homepage.reportShell.recordDateLabel}`,
              "name": `Whether Weekly Brief — ${homepage.reportShell.recordDateLabel}`,
              "about": "US Macro Operating Posture for Startup Leaders",
              "datePublished": homepage.reportShell.recordDateLabel,
              "dateModified": homepage.reportShell.fetchedAtLabel,
              "result": {
                "posture": postureLabel,
                "regime": publicRegimeLabel,
                "confidence": confidenceLabel,
                "provenance": {
                  "source": homepage.reportShell.treasurySource ?? "FRED",
                  "dataDate": homepage.reportShell.recordDateLabel,
                  "refreshedAt": homepage.reportShell.fetchedAtLabel,
                  "confidence": confidenceLabel,
                },
              },
          }),
            }}
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
