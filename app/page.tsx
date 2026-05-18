import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
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
import { HomeDeltaStrip } from "./components/home/deltaStrip";
import { PageDeltaSummary } from "./components/home/pageDeltaSummary";
import { BriefConfigureStrip } from "./components/home/briefConfigureStrip";
import { ErrorBoundary } from "../lib/components/ErrorBoundary";

export const revalidate = 900;
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

  const homepage = await assembleHomePage({
    searchParams: resolvedSearchParams,
    operatorContext,
  });
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
          inlineTrustPlacement: "before-content",
          provenance: homepage.reportShell.provenance,
        },
        chrome: {
          sidebarVariant: "hidden",
          hideHeroChrome: false,
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
          commandBar: homepage.reportShell.commandBar,
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
      <OperatorContextWrapper />
      <BriefConfigureStrip />
      <PageDeltaSummary
        regimeKey={homepage.weeklyDecisionCardModel.status.regimeKey}
        tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
        riskAppetite={homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}
        tightnessDelta={
          homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals
            .find((s) => s.key === "tightness")?.delta ?? 0
        }
        riskAppetiteDelta={
          homepage.weeklyDecisionCardModel.decision.reportDynamics.changedSignals
            .find((s) => s.key === "riskAppetite")?.delta ?? 0
        }
        actionShort={homepage.weeklyDecisionCardModel.decision.actionNowShort ?? undefined}
        postureLabel={homepage.weeklyDecisionCardModel.status.postureWithStageLabel}
        recordDate={homepage.reportShell.recordDateLabel}
        companyStage={operatorContext.companyStage}
        rateSensitivity={operatorContext.rateSensitivity}
        confidenceLabel={homepage.weeklyDecisionCardModel.status.confidenceLabel}
        freshnessLabel={homepage.reportShell.fetchedAtLabel}
        sourceLabel={homepage.reportShell.treasurySource}
        tightnessThreshold={reportData.assessment?.thresholds?.tightnessRegime ?? 70}
        riskAppetiteThreshold={reportData.assessment?.thresholds?.riskAppetiteRegime ?? 50}
      />
      <FirstVisitBanner />
      <HomeDeltaStrip
        tightness={homepage.weeklyDecisionCardModel.diagnostics.currentScores.tightness}
        riskAppetite={homepage.weeklyDecisionCardModel.diagnostics.currentScores.riskAppetite}
        recordDate={homepage.reportShell.recordDateLabel}
      />
      <HomeRoutePrefetch />
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
