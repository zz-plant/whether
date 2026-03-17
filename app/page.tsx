import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { WeeklyDecisionCard } from "./components/weeklyDecisionCard";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { LiveDataFallbackAlert } from "./components/liveDataFallbackAlert";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import {
  assembleHomePage,
  type ArtifactPayload,
} from "../lib/report/homePageAssembler";
import { ArtifactActionsFallback } from "./components/home/artifactActionsFallback";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { WeeklyDiagnosticsFallback } from "./components/home/weeklyDiagnosticsFallback";
import { StreamedSectionReveal } from "./components/streamedSectionReveal";
import { HomeWorkspaceBands } from "./components/home/homeWorkspaceBands";

export const revalidate = 900;
export const runtime = "edge";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}): Promise<Metadata> => buildHomeMetadata(searchParams);

type ArtifactActionsProps = {
  artifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
};

const LeadershipArtifactActions = async ({ artifactPayloadPromise, fallbackActive }: ArtifactActionsProps) => {
  const artifactPayload = await artifactPayloadPromise;

  if (!artifactPayload) {
    return (
      <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
        Artifact export is temporarily unavailable. Use the weekly call card for source-of-truth guidance while we recover.
      </p>
    );
  }

  return (
    <StreamedSectionReveal delay="medium">
      <CopyLeadershipArtifactsButtons
        boardSnippet={artifactPayload.boardSnippetText}
        weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
        weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
        boardSummary={artifactPayload.boardSummary}
        citation={artifactPayload.callCitation}
        fallbackActive={fallbackActive}
      />
    </StreamedSectionReveal>
  );
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
  const fallbackTreasury = homepage.reportResult.ok
    ? homepage.reportResult.data.treasury
    : homepage.reportResult.fallback.treasury;
  const lastCachedTimestamp = homepage.reportResult.ok
    ? fallbackTreasury.fetched_at
    : homepage.reportResult.fallback.lastCachedTimestamp;

  return (
    <ReportShell
      regime={homepage.reportShell.regime}
      statusLabel={homepage.reportShell.statusLabel}
      recordDateLabel={homepage.reportShell.recordDateLabel}
      fetchedAtLabel={homepage.reportShell.fetchedAtLabel}
      treasurySource={homepage.reportShell.treasurySource}
      trustStatusLabel={homepage.reportShell.trustStatusLabel}
      trustStatusDetail={homepage.reportShell.trustStatusDetail}
      trustStatusAction={homepage.reportShell.trustStatusAction}
      trustStatusTone={homepage.reportShell.trustStatusTone}
      provenance={homepage.reportShell.provenance}
      showOfflineBadge={homepage.reportShell.showOfflineBadge}
      pageTitle="Weekly Operating Posture Brief"
      currentPath="/"
      pageSummary="Whether translates macro conditions into operating decisions for companies. Action, guardrail, and flip condition for this planning cycle; scores stay contextual."
      primaryCta={{
        href: "#approve-this-weeks-plan",
        label: "Open execution guardrails",
      }}
      secondaryCta={{
        href: "#audit-this-call",
        label: "See why this call changed",
      }}
      nextStep={{
        href: "/signals",
        description: "Open Signals only when the home workspace needs deeper evidence",
      }}
      sidebarVariant="hidden"
      hideHeroChrome={true}
      pageNavVariant="compact"
      showPageNavigation={false}
      inlineTrustPlacement="after-first-section"
      pageLinks={reportPageLinks}
      sectionLinks={homepage.reportShell.sectionLinks}
      structuredData={homepage.reportShell.structuredData}
      commandBar={homepage.reportShell.commandBar}
      historicalBanner={
        homepage.reportShell.historicalBanner ? (
          <HistoricalBanner
            banner={homepage.reportShell.historicalBanner.banner}
            liveHref={homepage.reportShell.historicalBanner.liveHref}
            previousHref={homepage.reportShell.historicalBanner.previousHref}
            timeMachineHref={homepage.reportShell.historicalBanner.timeMachineHref}
          />
        ) : null
      }
    >
      <WeeklyDecisionCard
        model={homepage.weeklyDecisionCardModel}
        actions={(
          <Suspense fallback={<ArtifactActionsFallback />}>
            <LeadershipArtifactActions
              artifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
              fallbackActive={homepage.fallbackActive}
            />
          </Suspense>
        )}
        diagnosticsLane={<></>}
      />

      <Suspense fallback={<WeeklyDiagnosticsFallback />}>
        <StreamedSectionReveal delay="short">
          <HomeWorkspaceBands
            workspaceModelPromise={homepage.workspaceModelPromise}
          />
        </StreamedSectionReveal>
      </Suspense>

      {homepage.fallbackActive ? (
        <StreamedSectionReveal delay="medium">
          <LiveDataFallbackAlert
            lastCachedTimestamp={lastCachedTimestamp}
            sourceLabel={fallbackTreasury.source}
            effectiveRecordDate={fallbackTreasury.record_date}
            fallbackReason={fallbackTreasury.fallback_reason}
            followUpLabel="Review live evidence"
          />
        </StreamedSectionReveal>
      ) : null}
    </ReportShell>
  );
};
