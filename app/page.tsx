import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HistoricalBanner } from "./components/historicalBanner";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";
import { BoundedRulesMatrix, WeeklyDecisionCard, WeeklyDecisionDiagnosticsLane } from "./components/weeklyDecisionCard";
import { CopyLeadershipArtifactsButtons } from "./components/copyLeadershipArtifactsButtons";
import { LiveDataFallbackAlert } from "./components/liveDataFallbackAlert";
import { StagedReveal } from "./components/stagedReveal";
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

type WeeklyDecisionDiagnosticsLaneDeferredProps = HomePageAssembly["diagnosticsLane"];

const WeeklyDecisionDiagnosticsLaneDeferred = async ({
  weeklyMemoLines,
  immediateDecision,
  revisitDecisions,
  guardrail,
  regimeDistance,
  postureWithStageLabel,
  statusLabel,
  trendLabel,
  confidencePercent,
  decisionMatrix,
  decisionRules,
  roleAwareTemplates,
  evidenceItems,
  reportDynamics,
  weeklyMovement,
  transitionProbabilities,
  failureModes,
  historicalTimeline,
}: WeeklyDecisionDiagnosticsLaneDeferredProps) => {
  await Promise.resolve();

  return (
    <WeeklyDecisionDiagnosticsLane
      weeklyMemoLines={weeklyMemoLines}
      immediateDecision={immediateDecision}
      revisitDecisions={revisitDecisions}
      guardrail={guardrail}
      regimeDistance={regimeDistance}
      postureWithStageLabel={postureWithStageLabel}
      statusLabel={statusLabel}
      trendLabel={trendLabel}
      confidencePercent={confidencePercent}
      decisionMatrix={decisionMatrix}
      decisionRules={decisionRules}
      roleAwareTemplates={roleAwareTemplates}
      evidenceItems={evidenceItems}
      reportDynamics={reportDynamics}
      weeklyMovement={weeklyMovement}
      transitionProbabilities={transitionProbabilities}
      failureModes={failureModes}
      historicalTimeline={historicalTimeline}
      renderBoundedRulesMatrix={({ decisionMatrix: matrix, decisionRules: rules }) => (
        <BoundedRulesMatrix decisionMatrix={matrix} decisionRules={rules} />
      )}
    />
  );
};

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
    <CopyLeadershipArtifactsButtons
      weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
      weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
      boardSummary={artifactPayload.boardSummary}
      citation={artifactPayload.callCitation}
      fallbackActive={fallbackActive}
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

  return (
    <ReportShell
      regime={homepage.reportShell.regime}
      statusLabel={homepage.reportShell.statusLabel}
      recordDateLabel={homepage.reportShell.recordDateLabel}
      fetchedAtLabel={homepage.reportShell.fetchedAtLabel}
      freshnessLine={homepage.reportShell.freshnessLine}
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
        label: "View action playbook",
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
          <StagedReveal
            delayMs={220}
            placeholder={<div className="h-[98px] rounded-lg border border-slate-800/60 bg-slate-950/35" aria-hidden="true" />}
          >
            <Suspense fallback={<ArtifactActionsFallback />}>
              <LeadershipArtifactActions
                artifactPayloadPromise={homepage.leadershipArtifactPayloadPromise}
                fallbackActive={homepage.fallbackActive}
              />
            </Suspense>
          </StagedReveal>
        )}
        diagnosticsLane={(
          <StagedReveal
            delayMs={520}
            placeholder={<div className="h-[238px] rounded-xl border border-slate-800/60 bg-slate-950/35" aria-hidden="true" />}
          >
            <Suspense fallback={<WeeklyDiagnosticsFallback />}>
              <WeeklyDecisionDiagnosticsLaneDeferred {...homepage.diagnosticsLane} />
            </Suspense>
          </StagedReveal>
        )}
      />

      <section className="weather-panel space-y-4 px-5 py-4" aria-label="Secondary navigation">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Need deeper analysis?</p>
        <p className="text-sm text-slate-200">Keep this page your weekly call surface. Open detailed workflows only when you need diagnostics or role-specific plans.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Link prefetch={false} href="/operations" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Execution playbook</span>
            <span className="mt-1 block text-slate-300">Approve/hold/escalate plans by function.</span>
          </Link>
          <Link prefetch={false} href="/signals" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Evidence + drivers</span>
            <span className="mt-1 block text-slate-300">Inspect raw indicators, deltas, and provenance.</span>
          </Link>
          <Link prefetch={false} href="/decide" className="rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 hover:border-slate-500/80">
            <span className="font-semibold">Decision scenarios</span>
            <span className="mt-1 block text-slate-300">Stress-test thresholds and reversal conditions.</span>
          </Link>
        </div>
      </section>

      {!homepage.reportResult.ok ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={homepage.reportResult.fallback.lastCachedTimestamp}
          followUpLabel="Review live evidence"
        />
      ) : null}
    </ReportShell>
  );
};
