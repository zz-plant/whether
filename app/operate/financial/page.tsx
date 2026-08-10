import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { RunwayPlannerPanel } from "../components/runwayPlannerPanel";
import { OperationsWorkstreamNav } from "../components/planningWorkstreamNav";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Financial Strategy — Capital Posture This Week",
  description: "CFO and financial operating guardrails aligned with current interest rates and credit conditions.",
  path: "/planning/financial",
  imageAlt: "Whether financial strategy view",
  imagePath: "/social/planning.svg",
});

export default async function FinancialStrategyPage({
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
    sensors,
    macroSeries,
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
          pageTitle: "Financial Strategy",
          currentPath: "/planning/financial",
          pageSummary: "CFO runway planning and capital efficiency settings for the current macro regime.",
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
            label: "CFO Align",
            decision: "Set capital allocation discipline, test runway limits, and export aligned board updates.",
            horizon: "This quarter",
            confidence: trustStatusLabel,
            effectiveDate: recordDateLabel,
            evidenceHref: "#ops-runway-planner",
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
      <div className="space-y-4">
        <p className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-fluid-xs leading-5 text-slate-400">
          This financial workspace lets you run scenario planning based on your startup stage and sector sensitivity, and export macro-aligned budget planning memos for your board.
        </p>
        <div id="ops-runway-planner">
          <RunwayPlannerPanel
            assessment={assessment}
            sensors={sensors}
            macroSeries={macroSeries}
            recordDateLabel={recordDateLabel}
          />
        </div>
        <Suspense fallback={null}>
          <OperationsWorkstreamNav currentPath="/planning/financial" />
        </Suspense>
      </div>
    </ReportShell>
  );
}
