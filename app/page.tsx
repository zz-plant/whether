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
  HomeRevisitFlipSection,
  HomeWhatChangedSection,
  HomeKeyTermsDisclosure,
} from "./components/home/homeBriefSections";
import { FirstVisitBanner } from "./components/home/firstVisitBanner";
import { DecisionTracker } from "./components/home/decisionTracker";
import { RitualComplete } from "./components/home/ritualComplete";
import { InlineSubscribe } from "./components/home/inlineSubscribe";
import { HowItWorks } from "./components/home/howItWorks";
import { DiscoverabilityStrip } from "./components/home/discoverabilityStrip";
import { StartupActivity } from "./components/home/startupActivity";
import { SaaSMultiplesIndicator } from "./components/home/saasMultiplesIndicator";
import { PageDeltaSummary } from "./components/home/pageDeltaSummary";
import { RegimeSuggestions } from "./components/home/regimeSuggestions";
import { CadenceSelector } from "./components/cadenceSelector";
import { BriefConfigureStrip } from "./components/home/briefConfigureStrip";
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
    "@type": "Report",
    "name": `Whether Weekly Brief — ${reportData.weeklyRecordDate}`,
    "about": "US Macro Operating Posture for Startup and Product Leaders",
    "datePublished": reportData.weeklyRecordDate,
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
      <div className="-mt-4 space-y-3">
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

        <div className="flex items-center justify-between gap-3">
          <CadenceSelector />
        </div>
        <DecisionTracker
          action={stageAction ?? homepage.weeklyDecisionCardModel.decision.actionNowShort}
          regime={homepage.weeklyDecisionCardModel.status.regimeKey}
          recordDate={homepage.reportShell.recordDateLabel}
          confidence={homepage.weeklyDecisionCardModel.status.confidenceLabel}
        />
        <OperatorContextWrapper />
        <FirstVisitBanner />
        <BriefConfigureStrip />

        <HowItWorks />

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

        <RegimeSuggestions regimeKey={homepage.weeklyDecisionCardModel.status.regimeKey} />
        <RitualComplete recordDate={homepage.reportShell.recordDateLabel} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 py-3">
          <div>
            <p className="text-fluid-micro text-slate-500">
              Next brief: Monday &middot; <a href="/share" className="underline decoration-slate-600 hover:decoration-sky-400">Share with your team</a>
            </p>
            <StartupActivity />
            <SaaSMultiplesIndicator />
          </div>
          <InlineSubscribe />
        </div>
      </div>

      <DiscoverabilityStrip />
      <HomeRoutePrefetch />
      <HomeRevisitFlipSection
        interpretationLayer={homepage.interpretationLayer}
        interpretationSearchParams={homepage.interpretationSearchParams}
        fallbackAlert={homepage.fallbackAlert}
      />
      <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-slate-950/30" />}>
        <HomeKeyTermsDisclosure />
      </Suspense>
      <ErrorBoundary label="Workspace bands">
        <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />
      </ErrorBoundary>
    </ReportShell>
  );
};
