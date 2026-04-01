import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { isArtifactMode } from "../lib/shareArtifacts";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { HomeRoutePrefetch } from "./components/homeRoutePrefetch";
import { buildWeeklyDecisionPresentation } from "./components/weekly-card/presentationAdapter";
import {
  HomeDecisionSection,
  HomeRevisitFlipSection,
  HomeWhatChangedSection,
} from "./components/home/homeBriefSections";

export const revalidate = 900;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

const buildHeaderWeeklyBriefCopy = ({
  reportShell,
  weeklyDecisionCardModel,
  searchParams,
}: {
  reportShell: Awaited<ReturnType<typeof assembleHomePage>>["reportShell"];
  weeklyDecisionCardModel: Awaited<ReturnType<typeof assembleHomePage>>["weeklyDecisionCardModel"];
  searchParams?: HomePageSearchParams;
}) => {
  const postureLabel =
    weeklyDecisionCardModel.status.postureWithStageLabel ?? weeklyDecisionCardModel.status.statusLabel;
  const confidenceLabel = `${weeklyDecisionCardModel.status.confidenceLabel} (${Math.round(
    weeklyDecisionCardModel.status.confidencePercent,
  )}%)`;
  const { snapshotGuardrail, snapshotWatch, citationMetaLine } = buildWeeklyDecisionPresentation({
    model: weeklyDecisionCardModel,
    searchParams,
  });

  return [
    "WEEKLY BRIEF",
    `Posture: ${postureLabel}`,
    `Confidence: ${confidenceLabel}`,
    `Decision as-of: ${reportShell.recordDateLabel}`,
    `Data refreshed: ${reportShell.fetchedAtLabel}`,
    `Source: ${reportShell.treasurySource}`,
    "",
    `Action: ${weeklyDecisionCardModel.decision.immediateDecision}`,
    `Threshold: ${snapshotGuardrail}`,
    `Flip condition: ${snapshotWatch}`,
    "",
    `Trust: ${citationMetaLine}`,
    "",
    "Citation",
    weeklyDecisionCardModel.artifact.citation,
  ].join("\n");
};

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
  const homepage = await assembleHomePage({ searchParams: resolvedSearchParams });
  const initialArtifactMode = isArtifactMode(resolvedSearchParams?.artifactMode)
    ? resolvedSearchParams.artifactMode
    : undefined;
  const headerWeeklyBriefCopy = buildHeaderWeeklyBriefCopy({
    reportShell: homepage.reportShell,
    weeklyDecisionCardModel: homepage.weeklyDecisionCardModel,
    searchParams: resolvedSearchParams,
  });

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
          pageSummary: "One weekly call, one operating move, and one shareable brief.",
          pageLinks: reportPageLinks,
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
          sidebarVariant: "hidden",
          hideHeroChrome: true,
          pageNavVariant: "compact",
          showPageNavigation: false,
        },
        actions: {
          exportCta: {
            href: "#share-ready-artifact",
            label: "Copy operator brief",
            copyText: headerWeeklyBriefCopy,
            copyTarget: "Weekly brief",
            telemetryEvent: {
              pagePath: "/",
              cluster: "tool",
              intent: "board",
              ctaId: "homepage_overview_copy_weekly_brief",
            },
          },
          nextStep: {
            href: "/operations",
            description: "Open Planning next to approve or hold this week's moves",
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
      <HomeRoutePrefetch />
      <HomeWhatChangedSection
        weeklyDecisionCardModel={homepage.weeklyDecisionCardModel}
        leadershipArtifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
        fallbackActive={homepage.fallbackActive}
        searchParams={resolvedSearchParams}
        initialArtifactMode={initialArtifactMode}
      />

      <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />

      <HomeRevisitFlipSection
        interpretationLayer={homepage.interpretationLayer}
        interpretationSearchParams={homepage.interpretationSearchParams}
        fallbackAlert={homepage.fallbackAlert}
      />
    </ReportShell>
  );
};
