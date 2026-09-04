import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { ScenarioStudioSimulator } from "../components/scenarioStudioSimulator";
import { OperationsWorkstreamNav } from "../components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../../components/suspenseFallbacks";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Scenario Studio — Counterfactual Macro Simulator",
  description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios against live posture.",
  path: "/operate/scenarios",
  imageAlt: "Whether scenario studio counterfactual simulator view",
  imagePath: "/social/planning.svg",
});

export default async function ScenarioStudioPage({
  searchParams,
}: {
  searchParams?: Promise<any>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const weeklySnapshotResult = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/operate" });
  const reportData = weeklySnapshotResult.reportData;
  const { snapshot } = weeklySnapshotResult;
  const {
    assessment,
    recordDateLabel,
    fetchedAtLabel,
    statusLabel,
    treasury,
  } = reportData;

  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const {
    trustStatusLabel,
    trustStatusDetail,
    trustStatusAction,
    trustStatusTone,
  } = snapshot.trustStatus;

  const weeklyCall = snapshot.weeklyCall;

  return (
    <ReportShell
      model={{
        status: {
          statusLabel,
          recordDateLabel,
          fetchedAtLabel,
          treasurySource: treasury.source,
        },
        page: {
          pageTitle: "Scenario studio",
          currentPath: "/operate/scenarios",
          pageSummary: "Simulate counterfactual macro conditions, rate cuts, or deeper inversions to stress-test your operating plan.",
          sectionLinks: operationsSectionLinks.plan,
        },
        trust: {
          trustStatusLabel,
          trustStatusDetail,
          trustStatusAction,
          trustStatusTone,
          showOfflineBadge: isFallback && !reportData.historicalSelection,
        },
        actions: {
          primaryCta: { href: "/operate", label: "Operations Checklists" },
          secondaryCta: { href: "/", label: "Weekly Brief" },
        },
        payloads: {
          decisionBanner: {
            label: "Scenario Studio",
            decision: "Simulate policy rate and curve slope shifts to test how your operating commitments hold under stress.",
            horizon: "Counterfactual Model",
            confidence: "Hypothetical",
            effectiveDate: recordDateLabel,
            evidenceHref: "#sliders-controls-heading",
          },
          commandBar: {
            regime: assessment.regime,
            call: weeklyCall.currentCall,
            doNow: weeklyCall.doNowBullets,
            flipConditions: [weeklyCall.changeCourseIf, ...weeklyCall.flipConditionLabels].slice(0, 4),
            updatedAt: fetchedAtLabel,
          },
        },
      }}
    >
      <div className="space-y-6">
        <Suspense fallback={null}>
          <ScenarioStudioSimulator
            liveTreasury={treasury}
            liveAssessment={assessment}
          />
        </Suspense>
        <Suspense fallback={<WorkstreamNavFallback />}>
          <OperationsWorkstreamNav currentPath="/operate/scenarios" />
        </Suspense>
      </div>
    </ReportShell>
  );
}
