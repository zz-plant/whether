import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
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
          pageSummary: "This week's call, what to do now, and a summary you can share right away. Open other pages only if you need supporting evidence, planning details, or data status.",
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
          inlineTrustPlacement: "after-first-section",
          provenance: homepage.reportShell.provenance,
        },
        chrome: {
          sidebarVariant: "hidden",
          hideHeroChrome: true,
          pageNavVariant: "compact",
          showPageNavigation: false,
        },
        actions: {
          primaryCta: {
            href: "#approve-this-weeks-plan",
            label: "Open next-step plan",
          },
          secondaryCta: {
            href: "#audit-this-call",
            label: "See supporting evidence",
          },
          nextStep: {
            href: "/operations",
            description: "Open Planning next to approve this week's hiring, spending, roadmap, and finance moves",
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
      <HomeWhatChangedSection
        weeklyDecisionCardModel={homepage.weeklyDecisionCardModel}
        leadershipArtifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
        fallbackActive={homepage.fallbackActive}
        searchParams={resolvedSearchParams}
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
