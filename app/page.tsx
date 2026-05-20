import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { buildAgentInterfaceResponse, supportedAgentCadences, isAgentCadence } from "../lib/agentInterface";
import { isArtifactMode } from "../lib/shareArtifacts";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { HomeRoutePrefetch } from "./components/homeRoutePrefetch";
import { decisionTransmissionSummaryLine } from "../lib/report/decisionTransmissionCopy";
import { buildWeeklyTrustCueLine } from "../lib/report/trustStatus";
import { parseOperatorContextFromCookies } from "../lib/report/operatorContext";
import { OperatorContextWrapper } from "./components/home/operatorContextWrapper";
import {
  HomeDecisionSection,
  HomeWhatChangedSection,
  HomeKeyTermsDisclosure,
} from "./components/home/homeBriefSections";
import { FirstVisitBanner } from "./components/home/firstVisitBanner";
import { RitualComplete } from "./components/home/ritualComplete";
import { StayInTheLoop } from "./components/home/StayInTheLoop";
import { HowItWorks } from "./components/home/howItWorks";
import { DiscoverabilityStrip } from "./components/home/discoverabilityStrip";
import { StartupActivity } from "./components/home/startupActivity";
import { SaaSMultiplesIndicator } from "./components/home/saasMultiplesIndicator";
import { PageDeltaSummary } from "./components/home/pageDeltaSummary";
import { RegimeSuggestions } from "./components/home/regimeSuggestions";
import { CollapsibleGroup } from "./components/home/CollapsibleGroup";
import { GuidedSetup } from "./components/home/GuidedSetup";
import { TimeTravelTrigger } from "./components/home/TimeTravelTrigger";
import { BriefHero } from "./components/home/BriefHero";
import { CadenceSelector } from "./components/cadenceSelector";
import { ErrorBoundary } from "../lib/components/ErrorBoundary";

export const revalidate = 300;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <Suspense fallback={<HomePageStreamingFallback searchParams={resolvedSearchParams} />}>
      <HomePageReportContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
}

export const HomePageReportContent = async ({
  searchParams,
}: {
  searchParams?: HomePageSearchParams | Promise<HomePageSearchParams>;
}) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isScreenshot = resolvedSearchParams?.screenshot === "1";

  // Read operator context from cookies for personalization
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const operatorContext = parseOperatorContextFromCookies(cookieHeader);

  const activeCadence = resolvedSearchParams?.cadence && isAgentCadence(resolvedSearchParams.cadence)
    ? resolvedSearchParams.cadence
    : "weekly";

  const homepage = await assembleHomePage({
    searchParams: resolvedSearchParams,
    operatorContext,
  });

  const cadenceData = activeCadence !== "weekly"
    ? await buildAgentInterfaceResponse(activeCadence).catch(() => null)
    : null;
  const initialArtifactMode = isArtifactMode(resolvedSearchParams?.artifactMode)
    ? resolvedSearchParams.artifactMode
    : undefined;
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const postureLabel = homepage.weeklyDecisionCardModel.status.postureWithStageLabel;
  const confidenceLabel = homepage.weeklyDecisionCardModel.status.confidenceLabel;
  const actionItems = homepage.weeklyDecisionCardModel.decision.actionStripItems ?? [];
  const flipConditionLabels = homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels ?? [];
  const canonicalDecision = homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy;
  const regime = homepage.reportShell.regime;
  const isHistorical = Boolean(reportData.historicalSelection);

  /* Stage-specific action text — makes personalization visible */
  const stageActionOverrides: Record<string, string> = {
    "pre-seed": "Preserve runway · Gate small bets",
    seed: "Extend runway · Staged critical hires only",
    "series-a": "Gate team growth · Protect unit economics",
    "series-b-plus": "Scale proven channels · Milestone-check new bets",
    public: "Manage shareholder expectations · Optimize free cash flow",
  };
  const stageAction = operatorContext.companyStage && stageActionOverrides[operatorContext.companyStage]
    ? stageActionOverrides[operatorContext.companyStage]
    : null;

  const trustCue = buildWeeklyTrustCueLine({
    confidenceLabel,
    freshnessLabel: homepage.reportShell.fetchedAtLabel,
    transitionWatch: "OFF",
  });

  const structuredDecisionData = {
    "@context": "https://schema.org",
    "@type": ["Article", "Report"],
    "headline": `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    "name": `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    "about": "US Macro Operating Posture for Startup and Product Leaders",
    "datePublished": reportData.weeklyRecordDate,
    "dateModified": homepage.reportShell.fetchedAtLabel,
    "result": {
      "posture": postureLabel,
      "regime": regime,
      "confidence": confidenceLabel,
      "decisions": actionItems.map((item) => ({
        "action": item.areaActionNow,
        "threshold": item.triggerThreshold,
        "reversal": item.reversalCondition,
      })),
      "canonicalDecisionCopy": canonicalDecision,
      "provenance": {
        "source": homepage.reportShell.treasurySource,
        "dataDate": homepage.reportShell.recordDateLabel,
        "refreshedAt": homepage.reportShell.fetchedAtLabel,
        "confidence": confidenceLabel,
        "trustStatus": homepage.reportShell.trustStatusLabel,
        "trustDetail": homepage.reportShell.trustStatusDetail ?? "",
      },
      "trustCue": trustCue,
      "briefMdUrl": "/brief.md",
      "agentApiUrl": "/api/agent?cadence=weekly",
    },
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Weekly Brief",
      "item": "https://whether.work",
    }],
  };

  const scoresDataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Whether Weekly Scores",
    "description": `Credit conditions: ${homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}, Investor sentiment: ${homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}. Regime: ${regime}. Confidence: ${confidenceLabel}.`,
    "dateModified": homepage.reportShell.fetchedAtLabel,
  };

  return (
    <ReportShell
      model={{
        status: {
          regime: homepage.reportShell.regime,
          statusLabel: homepage.reportShell.statusLabel,
          recordDateLabel: homepage.reportShell.recordDateLabel,
          fetchedAtLabel: homepage.reportShell.fetchedAtLabel,
          treasurySource: homepage.reportShell.treasurySource,
        },
        page: {
          pageTitle: "Weekly Brief",
          pageSummary: decisionTransmissionSummaryLine,
          sectionLinks: homepage.reportShell.sectionLinks,
          currentPath: "/",
        },
        trust: {
          trustStatusLabel: homepage.reportShell.trustStatusLabel,
          trustStatusDetail: homepage.reportShell.trustStatusDetail,
          trustStatusAction: homepage.reportShell.trustStatusAction,
          trustStatusTone: homepage.reportShell.trustStatusTone,
          outageType: homepage.reportShell.outageType,
          outageSeverity: homepage.reportShell.outageSeverity,
          decisionImpactWindow: homepage.reportShell.decisionImpactWindow,
          approvalBuckets: homepage.reportShell.approvalBuckets,
          recoveryPlan: homepage.reportShell.recoveryPlan,
          outageExitGate: homepage.reportShell.outageExitGate,
          degradedSourceRows: homepage.reportShell.degradedSourceRows,
          showOfflineBadge: homepage.reportShell.showOfflineBadge,
          inlineTrustPlacement: "hidden",
          provenance: homepage.reportShell.provenance,
        },
        chrome: {
          sidebarVariant: "full",
          hideHeroChrome: true,
          heroVariant: "compact",
          ambientMode: "standard",
        },
        actions: {
          nextStep: {
            href: "/planning",
            description: "Turn this into a weekly plan",
          },
        },
        payloads: {
          structuredData: homepage.reportShell.structuredData,
          commandBar: undefined,
          historicalBanner: homepage.reportShell.historicalBanner ? (
            <HistoricalBanner
              banner={homepage.reportShell.historicalBanner.banner}
              liveHref={homepage.reportShell.historicalBanner.liveHref}
              previousHref={homepage.reportShell.historicalBanner.previousHref}
              timeMachineHref={homepage.reportShell.historicalBanner.timeMachineHref}
            />
          ) : null,
        },
      }}
    >
      <h1 className="sr-only">Weekly Brief</h1>
      <script
        type="application/ld+json"
        id="whether-structured-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDecisionData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scoresDataset) }}
      />
      {cadenceData && activeCadence !== "weekly" ? (
        <div className="mb-3 rounded-lg border border-sky-500/20 bg-sky-500/8 px-4 py-3">
          <p className="text-fluid-micro font-semibold uppercase tracking-[0.12em] text-sky-200">
            {activeCadence === "monthly" ? "Monthly" : activeCadence === "quarterly" ? "Quarterly" : "Yearly"} summary
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-200">
            {cadenceData && typeof cadenceData === "object" ? (
              <>
                {(cadenceData as any).summary?.regime ? <span>Regime: <strong>{(cadenceData as any).summary.regime}</strong></span> : null}
                {(cadenceData as any).summary?.action ? <span>Action: <strong>{(cadenceData as any).summary.action}</strong></span> : null}
                {(cadenceData as any).recordDateLabel ? <span className="text-slate-500">As of {(cadenceData as any).recordDateLabel}</span> : null}
              </>
            ) : <span>Viewing the {activeCadence} brief.</span>}
          </div>
        </div>
      ) : null}
      <div className="-mt-4 space-y-3" data-screenshot={isScreenshot ? "true" : undefined}>
        <BriefHero
          regime={regime}
          postureLabel={homepage.weeklyDecisionCardModel.status.postureWithStageLabel ?? homepage.weeklyDecisionCardModel.status.postureLabel}
          decision={canonicalDecision?.doNowLines?.[0] ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? homepage.weeklyDecisionCardModel.decision.immediateDecision}
          tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
          riskAppetite={homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}
          tightnessDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0}
          riskAppetiteDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "riskAppetite")?.delta ?? 0}
          confidenceLabel={homepage.weeklyDecisionCardModel.status.confidenceLabel}
          recordDate={homepage.reportShell.recordDateLabel}
          fetchedAt={homepage.reportShell.fetchedAtLabel}
        />

        <ErrorBoundary label="Weekly decision card">
          <div data-share-section="decision">
            <HomeWhatChangedSection
              weeklyDecisionCardModel={homepage.weeklyDecisionCardModel}
              leadershipArtifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
              fallbackActive={homepage.fallbackActive}
              searchParams={resolvedSearchParams}
              initialArtifactMode={initialArtifactMode}
            />
          </div>
        </ErrorBoundary>

        {isHistorical ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-amber-200">
              Historical snapshot — {reportData.recordDateLabel}
            </span>
            <a href="/" className="rounded-full border border-amber-400/40 px-3 py-1 text-fluid-micro font-medium text-amber-200 hover:bg-amber-500/10 transition-colors no-underline">
              ← Back to present
            </a>
          </div>
        ) : (
          <TimeTravelTrigger />
        )}

        {!isHistorical ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400 justify-between">
              <CadenceSelector />
              <div className="flex items-center gap-x-2">
                <span className="text-slate-400">View</span>
                <a href="/" className={`${!resolvedSearchParams?.view || resolvedSearchParams.view === "default" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="Standard operating brief">Default</a>
                <a href="/?view=sector" className={`${resolvedSearchParams?.view === "sector" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="View through your sector's lens">Sector</a>
                <a href="/?view=company" className={`${resolvedSearchParams?.view === "company" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="View for your company stage">Company</a>
                <a href="/?view=financial" className={`${resolvedSearchParams?.view === "financial" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="CFO and finance lens">Financial</a>
                <a href="/?view=forecast" className={`${resolvedSearchParams?.view === "forecast" ? "text-sky-200" : "text-slate-400 hover:text-slate-300"} no-underline`} title="Posture-focused forecast view">Posture</a>
              </div>
            </div>

            <CollapsibleGroup storageKey="whether_tailor_open" label="Customize" defaultOpen={!operatorContext.companyStage} summary={operatorContext.companyStage ? `${operatorContext.companyStage === "pre-seed" ? "Pre-seed" : operatorContext.companyStage === "seed" ? "Seed" : operatorContext.companyStage === "series-a" ? "Series A" : operatorContext.companyStage === "series-b-plus" ? "Series B+" : operatorContext.companyStage === "public" ? "Public" : operatorContext.companyStage}${operatorContext.rateSensitivity ? ` · ${operatorContext.rateSensitivity === "high" ? "High" : operatorContext.rateSensitivity === "medium" ? "Medium" : "Low"} sensitivity` : ""}` : undefined}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-micro text-slate-400">
                <span className="text-slate-400">Stage</span>
                {operatorContext.companyStage ? (
                  <span className="rounded-full bg-slate-800/50 px-3 py-1 font-medium text-slate-300">
                    {operatorContext.companyStage === "pre-seed" ? "Pre-seed" :
                     operatorContext.companyStage === "seed" ? "Seed" :
                     operatorContext.companyStage === "series-a" ? "Series A" :
                     operatorContext.companyStage === "series-b-plus" ? "Series B+" :
                     operatorContext.companyStage === "public" ? "Public" : operatorContext.companyStage}
                  </span>
                ) : (
                <a href="/settings" className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
                  Select your stage
                </a>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">Rate</span>
                {operatorContext.rateSensitivity ? (
                  <span className="rounded-full bg-slate-800/50 px-3 py-1 font-medium text-slate-300">
                    {operatorContext.rateSensitivity === "high" ? "High" :
                     operatorContext.rateSensitivity === "medium" ? "Medium" : "Low"}
                  </span>
                ) : (
                <a href="/settings" className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
                  Set sensitivity
                </a>
                )}
              </div>
              <OperatorContextWrapper />
            </CollapsibleGroup>
          </>
        ) : null}

        <FirstVisitBanner />

        <PageDeltaSummary
        regimeKey={homepage.weeklyDecisionCardModel.status.regimeKey}
        tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
        riskAppetite={homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}
        tightnessDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "tightness")?.delta ?? 0}
        riskAppetiteDelta={homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals.find((s) => s.key === "riskAppetite")?.delta ?? 0}
        actionShort={stageAction ?? homepage.weeklyDecisionCardModel.decision.actionNowShort ?? undefined}
        postureLabel={homepage.weeklyDecisionCardModel.status.postureWithStageLabel}
        recordDate={homepage.reportShell.recordDateLabel}
        companyStage={operatorContext.companyStage}
        rateSensitivity={operatorContext.rateSensitivity}
        confidenceLabel={homepage.weeklyDecisionCardModel.status.confidenceLabel}
        freshnessLabel={homepage.reportShell.fetchedAtLabel}
        sourceLabel={homepage.reportShell.treasurySource}
        tightnessThreshold={reportData.assessment?.thresholds?.tightnessRegime ?? 70}
        riskAppetiteThreshold={reportData.assessment?.thresholds?.riskAppetiteRegime ?? 50}
        directionLabel={homepage.weeklyDecisionCardModel.decision.reportDynamics.directionLabel}
        regimeDistance={homepage.weeklyDecisionCardModel.diagnostics.regimeDistance}
      />

        <HowItWorks />

        <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-slate-950/30" />}>
          <HomeKeyTermsDisclosure />
        </Suspense>

        {!isHistorical ? (
          <CollapsibleGroup storageKey="whether_act_open" label="Take action" forceOpen={true}>
            <RegimeSuggestions regimeKey={homepage.weeklyDecisionCardModel.status.regimeKey} />
          </CollapsibleGroup>
        ) : null}

        <RitualComplete recordDate={homepage.reportShell.recordDateLabel} />

        {!isHistorical ? (
          <div className="flex items-center gap-2 text-fluid-micro">
            <a href="/planning" className="rounded-full border border-slate-700/70 px-3 py-1.5 font-medium text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
              Open planning →
            </a>
            <a href="/share" className="rounded-full border border-slate-700/70 px-3 py-1.5 font-medium text-slate-400 hover:border-sky-500/40 hover:text-sky-200 transition-colors no-underline">
              Share brief →
            </a>
          </div>
        ) : null}

        {!isHistorical ? (
          <StayInTheLoop />
        ) : null}
        <StartupActivity />
        <SaaSMultiplesIndicator />
      </div>

      <DiscoverabilityStrip />
      <HomeRoutePrefetch />
      <ErrorBoundary label="Workspace bands">
        <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />
      </ErrorBoundary>
    </ReportShell>
  );
};
