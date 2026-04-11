import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { isArtifactMode } from "../lib/shareArtifacts";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { HomeRoutePrefetch } from "./components/homeRoutePrefetch";
import { decisionTransmissionSummaryLine, homeDecisionFaqItems } from "../lib/report/decisionTransmissionCopy";
import { buildWeeklyOperatorBriefCopyText } from "../lib/report/home/artifactPayload";
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
  const initialArtifactMode = isArtifactMode(resolvedSearchParams?.artifactMode)
    ? resolvedSearchParams.artifactMode
    : undefined;
  const reportData = homepage.reportResult.ok ? homepage.reportResult.data : homepage.reportResult.fallback;
  const operatorBriefPostureState = {
    currentState: {
      confidenceLabel: homepage.weeklyDecisionCardModel.status.confidenceLabel,
    },
  } as Parameters<typeof buildWeeklyOperatorBriefCopyText>[0]["postureState"];
  const headerOperatorBriefCopy = buildWeeklyOperatorBriefCopyText({
    assessment: reportData.assessment,
    treasury: reportData.treasury,
    date: reportData.weeklyRecordDate,
    postureWithStageLabel: homepage.weeklyDecisionCardModel.status.postureWithStageLabel,
    confidenceLabel: homepage.weeklyDecisionCardModel.status.confidenceLabel,
    actionStripItems: homepage.weeklyDecisionCardModel.decision.actionStripItems,
    flipConditionLabels: homepage.weeklyDecisionCardModel.decision.compactFlipConditionLabels,
    postureState: operatorBriefPostureState,
    canonicalDecisionCopy: homepage.weeklyDecisionCardModel.decision.canonicalDecisionCopy,
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
          sidebarVariant: "hidden",
          hideHeroChrome: true,
        },
        actions: {
          exportCta: {
            href: "#share-ready-artifact",
            label: "Copy operator brief",
            copyText: headerOperatorBriefCopy,
            copyTarget: "Operator brief",
            telemetryEvent: {
              pagePath: "/",
              cluster: "tool",
              intent: "board",
              ctaId: "homepage_overview_copy_weekly_brief",
            },
          },
          nextStep: {
            href: "/operations",
            description: "Planning for approval and hold lines",
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
      {homepage.interpretationLayer.view !== "default" || Boolean(homepage.fallbackAlert) ? (
        <HomeRevisitFlipSection
          interpretationLayer={homepage.interpretationLayer}
          interpretationSearchParams={homepage.interpretationSearchParams}
          fallbackAlert={homepage.fallbackAlert}
        />
      ) : null}
      <HomeDecisionSection workspaceModelPromise={homepage.workspaceModelPromise} />
      <section className="weather-panel space-y-3 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6" aria-labelledby="weekly-decision-faq-title">
        <p className="weather-hub-section-eyebrow">Weekly decision FAQ</p>
        <h2 id="weekly-decision-faq-title" className="text-lg font-semibold text-slate-100">
          Leadership shorthand for this week
        </h2>
        <dl className="space-y-3 text-sm text-slate-200">
          {homeDecisionFaqItems.map((item) => (
            <div key={item.question} className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
              <dt className="font-semibold text-slate-100">{item.question}</dt>
              <dd className="mt-1 text-slate-300">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </ReportShell>
  );
};
