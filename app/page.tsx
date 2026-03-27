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
          pageTitle: "Weekly Operating Posture Brief",
          pageSummary: "Whether translates macro conditions into operating decisions for companies. Action, guardrail, and flip condition for this planning cycle; scores stay contextual.",
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
            label: "Open execution guardrails",
          },
          secondaryCta: {
            href: "#audit-this-call",
            label: "See why this call changed",
          },
          nextStep: {
            href: "/signals",
            description: "Open Signals only when the home workspace needs deeper evidence",
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
      statusLabel={homepage.reportShell.statusLabel}
      recordDateLabel={homepage.reportShell.recordDateLabel}
      fetchedAtLabel={homepage.reportShell.fetchedAtLabel}
      treasurySource={homepage.reportShell.treasurySource}
      pageTitle="Weekly Operating Posture Brief"
      pageSummary="Whether translates macro conditions into operating decisions for companies. Action, guardrail, and flip condition for this planning cycle; scores stay contextual."
      pageLinks={reportPageLinks}
      sectionLinks={homepage.reportShell.sectionLinks}
      trustStatusLabel={homepage.reportShell.trustStatusLabel}
      trustStatusDetail={homepage.reportShell.trustStatusDetail}
      trustStatusAction={homepage.reportShell.trustStatusAction}
      trustStatusTone={homepage.reportShell.trustStatusTone}
      outageType={homepage.reportShell.outageType}
      outageSeverity={homepage.reportShell.outageSeverity}
      decisionImpactWindow={homepage.reportShell.decisionImpactWindow}
      approvalBuckets={homepage.reportShell.approvalBuckets}
      recoveryPlan={homepage.reportShell.recoveryPlan}
      outageExitGate={homepage.reportShell.outageExitGate}
      degradedSourceRows={homepage.reportShell.degradedSourceRows}
      currentPath="/"
    >
      <HomeWhatChangedSection
        weeklyDecisionCardModel={homepage.weeklyDecisionCardModel}
        interpretationSearchParams={homepage.interpretationSearchParams}
        leadershipArtifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
        fallbackActive={homepage.fallbackActive}
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
