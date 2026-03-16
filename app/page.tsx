import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { BoundedRulesMatrix, WeeklyDecisionCard, WeeklyDecisionDiagnosticsLane } from "./components/weeklyDecisionCard";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { LiveDataFallbackAlert } from "./components/liveDataFallbackAlert";
import { buildHomeMetadata, type HomePageSearchParams } from "../lib/report/homeMetadata";
import {
  assembleHomePage,
  type ArtifactPayload,
  type HomePageAssembly,
} from "../lib/report/homePageAssembler";
import { ArtifactActionsFallback } from "./components/home/artifactActionsFallback";
import { HomePageStreamingFallback } from "./components/home/homePageStreamingFallback";
import { WeeklyDiagnosticsFallback } from "./components/home/weeklyDiagnosticsFallback";

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

type DiagnosticsLaneProps = {
  diagnosticsLanePromise: Promise<HomePageAssembly["diagnosticsLane"]>;
};

// Yield once so the canonical weekly call can stream before the heavier diagnostics lane.
const deferForStreaming = async <T,>(value: T): Promise<T> => {
  await Promise.resolve();
  return value;
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
    <CopyLeadershipArtifactsButtons
      weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
      weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
      boardSummary={artifactPayload.boardSummary}
      citation={artifactPayload.callCitation}
      fallbackActive={fallbackActive}
    />
  );
};

const DeferredWeeklyDiagnosticsLane = async ({ diagnosticsLanePromise }: DiagnosticsLaneProps) => {
  const diagnosticsLane = await diagnosticsLanePromise;

  return (
    <WeeklyDecisionDiagnosticsLane
      {...diagnosticsLane}
      renderBoundedRulesMatrix={({ decisionMatrix: matrix, decisionRules: rules }) => (
        <BoundedRulesMatrix decisionMatrix={matrix} decisionRules={rules} />
      )}
    />
  );
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomePageSearchParams>;
}) {
  return (
    <Suspense fallback={<HomePageStreamingFallback />}>
      <HomePageReportContent searchParams={searchParams} />
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
  const diagnosticsLanePromise = deferForStreaming(homepage.diagnosticsLane);
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
        href: "#citation-actions",
        label: "Prepare Weekly Operator Brief",
      }}
      secondaryCta={{
        href: "/operations",
        label: "Open Operations",
      }}
      nextStep={{
        href: "/signals",
        description: "Inspect evidence in Signals",
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
        diagnosticsLane={(
          <Suspense fallback={<WeeklyDiagnosticsFallback />}>
            <DeferredWeeklyDiagnosticsLane diagnosticsLanePromise={diagnosticsLanePromise} />
          </Suspense>
        )}
      />

      <section className="weather-panel space-y-4 px-5 py-4" aria-label="Secondary navigation">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Need deeper analysis?</p>
        <p className="text-sm text-slate-200">Keep this page your weekly call surface. Open detailed workflows only when you need diagnostics or role-specific plans.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Link href="/operations" className="weather-panel-static rounded-xl px-3 py-3 text-xs text-slate-100 transition-colors hover:border-sky-400/35">
            <span className="font-semibold">Operations</span>
            <span className="mt-1 block text-slate-300">Approve/hold/escalate plans by function.</span>
          </Link>
          <Link href="/signals" className="weather-panel-static rounded-xl px-3 py-3 text-xs text-slate-100 transition-colors hover:border-sky-400/35">
            <span className="font-semibold">Signals</span>
            <span className="mt-1 block text-slate-300">Inspect raw indicators, deltas, and provenance.</span>
          </Link>
          <Link href="/decide" className="weather-panel-static rounded-xl px-3 py-3 text-xs text-slate-100 transition-colors hover:border-sky-400/35">
            <span className="font-semibold">Decide</span>
            <span className="mt-1 block text-slate-300">Stress-test thresholds and reversal conditions.</span>
          </Link>
        </div>
      </section>

      {homepage.fallbackActive ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={lastCachedTimestamp}
          sourceLabel={fallbackTreasury.source}
          effectiveRecordDate={fallbackTreasury.record_date}
          fallbackReason={fallbackTreasury.fallback_reason}
          followUpLabel="Review live evidence"
        />
      ) : null}
    </ReportShell>
  );
};
