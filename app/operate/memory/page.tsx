import type { Metadata } from "next";
import { Suspense } from "react";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { DecisionMemoryPanel } from "../components/decisionMemoryPanel";
import { OperationsWorkstreamNav } from "../components/planningWorkstreamNav";
import { WorkstreamNavFallback } from "../../components/suspenseFallbacks";
import { operationsSectionLinks } from "../../../lib/navigation/planningNavigation";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Memory Ledger — What We Decided and Why",
  description: "Immutable board-ready record of all macro posture decisions and overrides.",
  path: "/planning/memory",
  imageAlt: "Whether decision memory view",
  imagePath: "/social/planning.svg",
});

export default async function DecisionMemoryPage({
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
          pageTitle: "Decision Memory",
          currentPath: "/planning/memory",
          pageSummary: "Review saved weekly posture decisions, override notes, and print board-ready exports.",
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
            label: "Audit Ledger",
            decision: "Check previous posture commitments, download audit logs, and justify overrides to the board.",
            horizon: "Historical Archive",
            confidence: trustStatusLabel,
            effectiveDate: recordDateLabel,
            evidenceHref: "#ops-decision-memory",
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
          This audit ledger displays saved operating postures and overrides, stamped with exact macro signals at evaluation time. Use it to maintain governance compliance.
        </p>
        <div id="ops-decision-memory">
          <DecisionMemoryPanel />
        </div>
        <Suspense fallback={<WorkstreamNavFallback />}>
          <OperationsWorkstreamNav currentPath="/planning/memory" />
        </Suspense>
      </div>
    </ReportShell>
  );
}
