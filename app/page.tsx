import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import { Shell } from "./components/Shell";
import { DecisionHero } from "./components/DecisionHero";
import { DeltaTrustStrip } from "./components/DeltaTrustStrip";
import { ActionCard } from "./components/ActionCard";
import { RegimeHistory } from "./components/RegimeHistory";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { RitualCheck } from "./components/RitualCheck";
import { ToolsPanel } from "./components/ToolsPanel";
import { SubscribeForm } from "./components/SubscribeForm";
import { StickyCallStrip } from "./components/StickyCallStrip";
import { CompareStrip } from "./components/CompareStrip";
import { FreshnessDot } from "./components/FreshnessDot";
import { SwipeableWeek } from "./components/SwipeableWeek";
import { CadenceCallCard } from "./components/CadenceCallCard";
import dynamic from "next/dynamic";
import { computeTransitionProbability } from "./components/home/RegimeTransitionProbability";
import { buildAgentInterfaceResponse, isAgentCadence } from "../lib/agentInterface";
import { summarizeSourceHealthCoverage } from "../lib/report/sourceHealth";
import { getRegimePublicLabel } from "../lib/regimePresentation";
import {
  computeReliabilityScore,
  DIRECTION_ARROW,
  REGIME_DISPLAY,
  buildV2HeroSignalData,
  type SignalDirection,
} from "./viewModel";
import { formatDateUTC, formatSignedDelta } from "../lib/formatters";

const EvidenceTools = dynamic(
  () => import("./components/EvidenceTools").then((mod) => mod.EvidenceTools),
  {
    ssr: true,
    loading: () => <div className="weather-card h-24 animate-pulse" />,
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

  return (
    <Suspense fallback={<Shell loading />}>
      <PageContent searchParams={resolved} />
    </Suspense>
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
  // Map internal codes to human-readable labels; fall back to "—" for unmapped values
  const memoryItems = rawItems.map((label) => REGIME_DISPLAY[label] ?? label ?? "—");
  const shouldRevisit = model.decision.revisitDecisions;
  const revisitQueue = model.decision.revisitQueue.slice(0, 3);
  const guardrailRows = [
    {
      trigger: model.decision.guardrailThreshold ?? model.decision.guardrail,
      consequence: model.decision.actionNowShort ?? model.decision.immediateDecision,
      reversal: model.decision.reversalTrigger,
    },
    {
      trigger: model.decision.flipThreshold ?? model.decision.compactFlipConditionLabels?.[0] ?? model.diagnostics.flipRiskMeter.triggerLabel,
      consequence: model.decision.netConstraintSummary,
      reversal: model.decision.canonicalDecisionCopy?.flipTrigger ?? model.decision.reversalTrigger,
    },
  ].filter((row) => row.trigger && row.consequence && row.reversal).slice(0, 1);

  return (
    <section
      data-testid="weekly-top-fold"
      aria-label="Weekly operating contract"
      className="weather-card grid gap-4 lg:grid-cols-12"
    >
      <div className="space-y-2 lg:col-span-7">
        <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/60">WEEKLY POSTURE</p>
        <div className="grid gap-2 text-fluid-micro text-white/65 grid-cols-2 xl:grid-cols-4">
          <span>Posture shift: {weeklySummary.notchShiftLabel}</span>
          <span>Hiring: {weeklySummary.hiringWindow}</span>
          <span>Expansion: {weeklySummary.expansionWindow}</span>
          <span>Fundraising: {weeklySummary.raiseWindow}</span>
        </div>
        <p className="text-fluid-micro font-medium text-sky-200/80">{weeklySummary.shorthandLine}</p>
      </div>

      <div className="space-y-2 lg:col-span-5">
        <div className="flex items-center gap-2">
          <p className="text-fluid-nano font-semibold tracking-[0.08em] text-white/60">Revisit</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-fluid-nano font-bold tracking-[0.06em] uppercase ${
              shouldRevisit
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
            }`}
          >
            {shouldRevisit ? "REVISIT" : "ON TRACK"}
          </span>
        </div>
        {revisitQueue.length ? (
          <ul className="space-y-1.5 text-fluid-micro text-white/60">
            {revisitQueue.map((item) => (
              <li key={item.id}>
                <span className="font-medium text-white/65">{item.label}:</span>{" "}
                {compactSentence(item.action, 96)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-1 border-t border-white/[0.06] pt-2 text-fluid-micro text-white/60">
          {guardrailRows.map((row, index) => (
            <p key={index}>
              <span className="text-white/60">Watch:</span> {compactSentence(row.trigger, 84)}
            </p>
          ))}
        </div>
        {memoryItems.length ? (
          <p className="text-fluid-micro text-white/60">{memoryItems.join(" → ")}</p>
        ) : null}
      </div>
    </section>
  );
}

async function PageContent({ searchParams }: { searchParams?: HomePageSearchParams }) {
  const activeCadence = searchParams?.cadence && isAgentCadence(searchParams.cadence) ? searchParams.cadence : "weekly";

  let data: Awaited<ReturnType<typeof loadHomePageAssembly>>;
  let cadenceData: Awaited<ReturnType<typeof buildAgentInterfaceResponse>> | null = null;

  try {
    [data, cadenceData] = await Promise.all([
      loadHomePageAssembly(searchParams),
      activeCadence !== "weekly"
        ? buildAgentInterfaceResponse(activeCadence).catch(() => null)
        : Promise.resolve(null),
    ]);
  } catch {
    return (
      <Shell regime="EXPANSION">
        <div className="text-center py-16 space-y-3">
          <p className="text-white/60 text-sm">Couldn&apos;t load this week&apos;s brief.</p>
          <p className="text-white/50 text-fluid-micro">Data may be temporarily unavailable. Please try again shortly.</p>
        </div>
      </Shell>
    );
  }

  const { homepage, reportData, regimeHistory, operatorContext } = data;
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

  const reliabilityScore = computeReliabilityScore({
    confidenceLabel,
    showOfflineBadge: homepage.reportShell.showOfflineBadge,
    degradedCount: homepage.reportShell.degradedSourceRows?.length ?? 0,
  });

  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const primaryCall = canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? weeklyLeadershipSummary.shorthandLine;
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];

  const sourceHealthSummary = summarizeSourceHealthCoverage(data.reportData?.sourceHealth);
  const v2HeroSignalData = buildV2HeroSignalData(reportData);

  const transition = computeTransitionProbability(regime);
  const toolHighlight = transition.probability > 50 ? "Transition" : Math.abs(tightnessDelta) > 3 ? "Simulator" : undefined;

  return (
    <Shell regime={regime}>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <div className="space-y-6 min-w-0">
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
            {activeCadence !== "weekly" && cadenceData ? (
              <CadenceCallCard cadence={activeCadence} data={cadenceData} />
            ) : null}
           <DecisionHero
               tightness={tightness}
               tightnessDelta={tightnessDelta}
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
             />
 
           <WeeklyTopFoldContract
             model={homepage.weeklyDecisionCardModel}
             memoryRegimes={macroTrendline}
           />
 
            <CompareStrip
              currentRegime={regime}
              currentTightness={tightness}
              tightnessDelta={tightnessDelta}
              serverPrevious={macroTrendline.length >= 2 ? { regime: macroTrendline[macroTrendline.length - 2].regime, recordDate: macroTrendline[macroTrendline.length - 2].record_date } : null}
              autoExpand={Math.abs(tightnessDelta) >= 3 || (macroTrendline.length >= 2 && macroTrendline[macroTrendline.length - 2].regime !== regime)}
            />
 
           <ActionCard
             call={primaryCall}
             actionNow={homepage.weeklyDecisionCardModel.decision.actionNowShort}
             guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
               ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
               : undefined}
             flipConditions={flipConditionLabels.length ? flipConditionLabels : undefined}
             tightness={tightness}
             boldnessScore={weeklyLeadershipSummary.boldnessScore}
             boldnessDelta={weeklyLeadershipSummary.boldnessDelta}
             direction={signalDirection}
             recordDate={homepage.reportShell.recordDateLabel}
             pauseThreshold={homepage.weeklyDecisionCardModel.decision.guardrailThreshold ?? undefined}
           />
 
           </SwipeableWeek>
 
           <EvidenceDrawer highlight={toolHighlight}>
             <ToolsPanel>
               <EvidenceTools
                 currentTightness={tightness}
                 currentRiskAppetite={riskAppetite}
                 currentRegime={homepage.weeklyDecisionCardModel.status.postureLabel}
                 regimes={macroTrendline}
                 companyStage={operatorContext.companyStage ?? undefined}
                 tightnessDelta={tightnessDelta}
                 riskAppetiteDelta={riskAppetiteDelta}
               />
             </ToolsPanel>
           </EvidenceDrawer>
 
           <RitualCheck
             recordDate={homepage.reportShell.recordDateLabel}
             recentRecordDates={macroTrendline.slice(-4).map((entry) => formatDateUTC(entry.record_date))}
           />
 
           <Link
             href="/planning"
             className="weather-card flex items-center justify-between hover:border-sky-500/30 transition-colors no-underline group"
           >
             <div>
                <p className="text-fluid-xs font-semibold tracking-[0.04em] text-white/70 group-hover:text-white/90">Build this week&apos;s plan</p>
                <p className="text-fluid-micro text-white/60 mt-0.5">Convert the brief into an action plan</p>
             </div>
             <span className="text-white/50 group-hover:text-white/60 transition-colors">→</span>
           </Link>
 
           <SubscribeForm />
 
           {activeCadence !== "weekly" && cadenceData ? (
             <CadenceCallCard cadence={activeCadence} data={cadenceData} />
           ) : null}
         </div>
 
         <div className="space-y-4 lg:col-start-2">
           <DeltaTrustStrip
             tightnessDelta={tightnessDelta}
             riskAppetiteDelta={riskAppetiteDelta}
             confidenceLabel={confidenceLabel}
             reliabilityScore={reliabilityScore}
             sourceHealthSummary={sourceHealthSummary}
             direction={signalDirection}
           />
            <RegimeHistory regimes={macroTrendline} />
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
         guardrail={homepage.weeklyDecisionCardModel.decision.guardrailThreshold
           ? `tightness crosses ${homepage.weeklyDecisionCardModel.decision.guardrailThreshold}`
           : undefined}
       />
     </Shell>
   );
}
