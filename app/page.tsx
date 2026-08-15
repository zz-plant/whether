import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { STEADY_WEEK_CONSEQUENCE, STEADY_WEEK_LABEL } from "../lib/report/reportCopy";
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
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import dynamic from "next/dynamic";
import { computeTransitionProbability } from "./components/home/RegimeTransitionProbability";
import { buildAgentInterfaceResponse, isAgentCadence, type AgentCadence } from "../lib/agentInterface";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import {
  DIRECTION_ARROW,
  REGIME_DISPLAY,
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC } from "../lib/formatters";
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

function compactSentence(value: string | undefined, maxLength = 132) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function WeeklyTopFoldContract({
  model,
  memoryRegimes,
}: {
  model: Awaited<ReturnType<typeof loadHomePageAssembly>>["homepage"]["weeklyDecisionCardModel"];
  memoryRegimes: Array<{ record_date: string; regime: string }>;
}) {
  const weeklySummary = model.decision.weeklyLeadershipSummary;
  const memoryRailItems = model.history.memoryRail.slice(-4).map((item) => item.posture);
  const memoryFallbackItems = memoryRegimes.slice(-4).map((item) => item.regime);
  const rawItems = (memoryRailItems.length >= 4 ? memoryRailItems : memoryFallbackItems).slice(-4);
  const memoryItems = rawItems.map((label) => REGIME_DISPLAY[label] ?? label ?? "—");
  const isSteadyWeek = weeklySummary.steadyWeek;
  const shouldRevisit = model.decision.revisitDecisions;
  const revisitQueue = model.decision.revisitQueue.slice(0, 3);
  // One signal can queue up to three areas, so the driver sentence is identical
  // across items more often than not. Hoist it when it is shared; otherwise each
  // item carries its own composed reason.
  const revisitDrivers = [...new Set(revisitQueue.map((item) => item.driver).filter(Boolean))];
  const sharedDriver = revisitDrivers.length === 1 ? revisitDrivers[0] : null;

   return (
    <section
      data-testid="weekly-top-fold"
      aria-label="Weekly posture delta and revisit queue"
      className="weather-section-border rounded-xl border border-slate-800/70 bg-slate-950/40 p-4 grid gap-4 md:grid-cols-12 md:items-start backdrop-blur-sm"
    >
      <div className="space-y-2 md:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-fluid-micro font-mono type-eyebrow">Weekly Posture Delta</p>
          <span className="text-fluid-micro font-medium text-sky-300/90">
            {isSteadyWeek ? STEADY_WEEK_LABEL : weeklySummary.notchShiftLabel}
          </span>
        </div>
        {isSteadyWeek ? (
          <p className="text-fluid-xs text-slate-300">{STEADY_WEEK_CONSEQUENCE}</p>
        ) : null}
        {memoryItems.length ? (
          <div className="rounded-md border border-slate-800/60 bg-slate-900/50 px-3 py-2 text-fluid-xs text-white/60">
            <span className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">Last 4 weeks · posture</span>
            <span className="font-mono text-slate-200">{memoryItems.join(" → ")}</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 md:col-span-7 border-t border-slate-800/60 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-fluid-micro font-mono type-eyebrow">Revisit Queue</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-fluid-micro font-mono font-semibold ${
            shouldRevisit ? "border border-amber-500/40 bg-amber-500/10 text-amber-300" : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          }`}>
            <span className={`size-1.5 rounded-full ${shouldRevisit ? "bg-amber-400" : "bg-emerald-400"}`} aria-hidden="true" />
            {shouldRevisit ? "Revisit active" : "Plan on track"}
          </span>
        </div>
        {revisitQueue.length ? (
          <>
            {sharedDriver ? (
              <p className="text-fluid-xs text-slate-300">{compactSentence(sharedDriver, 96)}</p>
            ) : null}
            <ul className="space-y-1.5 text-fluid-xs text-white/70">
              {revisitQueue.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <span className="font-semibold text-slate-200 shrink-0">{item.label}:</span>
                  <span className="text-slate-300">
                    {compactSentence(sharedDriver ? item.recheck : item.reason, 96)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-fluid-xs text-slate-400 italic">No decisions require re-checking this week.</p>
        )}
      </div>
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
  regimes: RegimeEntry[];
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
            regimes={props.regimes}
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
      <FirstVisitExplainer />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
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
               boldnessShorthand={weeklyLeadershipSummary.shorthandLine}
               weeklyCall={primaryCall}
               actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
               regime={regime}
               postureLabel={postureLabel}
               signalDirection={signalDirection}
               recordDate={homepage.reportShell.recordDateLabel}
               fetchedAt={homepage.reportShell.fetchedAtLabel}
               operatorContext={operatorContext}
               confidenceLabel={confidenceLabel}
               trustStatusLabel={homepage.reportShell.trustStatusLabel}
               treasurySource={homepage.reportShell.treasurySource}
               degradedCount={homepage.reportShell.degradedSourceRows?.length ?? 0}
                isFallback={homepage.reportShell.showOfflineBadge}
                signalData={v2HeroSignalData}
                flipConditions={flipConditionLabels}
                transitionProbability={transition.probability}
                guardrail={guardrailLabel}
                reversalTrigger={reversalTriggerLabel}
                shareLines={briefShareLines}
               />

            <WeeklyTopFoldContract
               model={homepage.weeklyDecisionCardModel}
               memoryRegimes={macroTrendline}
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
          </SwipeableWeek>

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
              regimes={macroTrendline}
              companyStage={operatorContext.companyStage ?? undefined}
              tightnessDelta={tightnessDelta}
              riskAppetiteDelta={riskAppetiteDelta}
              recordDate={homepage.reportShell.recordDateLabel}
              recentRecordDates={macroTrendline.slice(-4).map((entry) => formatDateUTC(entry.record_date))}
            />
          </Suspense>
        </div>

          <div className="space-y-4 lg:col-start-2 lg:sticky lg:top-24 lg:self-start">
          <Suspense fallback={<div className="weather-card h-48 animate-pulse" />}>
            <BelowTheFoldHistory
              regimes={macroTrendline}
            />
          </Suspense>
          <SubscribeForm />
          <CanonicalWeekPermalink />
         </div>
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
          arrow={DIRECTION_ARROW[signalDirection]}
          boldnessScore={weeklyLeadershipSummary.boldnessScore}
          boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
          shareLines={briefShareLines}
        />
    </>
  );
}
