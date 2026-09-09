import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import { loadWeeklyBriefSnapshot } from "../../../lib/report/weeklyBriefSnapshot";
import { DecisionMemoryPanel } from "../../operate/components/decisionMemoryPanel";

export const runtime = "edge";

/*
 * Moved from /operate/memory. The ledger is a record of what was decided, which
 * is history, not planning: /operate answers "what do we do this week" and its
 * other sub-routes (financial, scenarios) are tools for deciding that. A record
 * sitting under the planning hub read as one more tool, and the planning
 * workstream nav offered it beside the scenario studio as if it were. Decision
 * memory still has its weekly slice on `/` — the staleness panel and the
 * closeout — this is the full archive.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Decision Ledger — What We Decided and Why",
  description: "Board-ready record of every saved posture decision and override, stamped with the readings at the time.",
  path: "/history/decisions",
  imageAlt: "Whether decision ledger",
  imagePath: "/social/planning.svg",
});

export default async function DecisionLedgerPage({
  searchParams,
}: {
  searchParams?: Promise<any>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const weeklySnapshotResult = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/history" });
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
          pageTitle: "Decision ledger",
          currentPath: "/history/decisions",
          pageSummary: "Every saved posture decision and override, with the readings that were true when it was made.",
          sectionLinks: [],
        },
        trust: {
          trustStatusLabel,
          trustStatusDetail,
          trustStatusAction,
          trustStatusTone,
          showOfflineBadge: isFallback && !reportData.historicalSelection,
        },
        actions: {
          primaryCta: { href: "/history", label: "Regime history" },
          secondaryCta: { href: "/", label: "Weekly Brief" },
        },
        payloads: {
          decisionBanner: {
            label: "Audit ledger",
            decision: "Check previous posture commitments, download audit logs, and justify overrides to the board.",
            horizon: "Historical archive",
            confidence: trustStatusLabel,
            effectiveDate: recordDateLabel,
            evidenceHref: "#decision-ledger",
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
          Saved operating postures and overrides, stamped with the macro readings at evaluation time.
          Decisions are recorded from the weekly brief and the plan stress test, and stay in this
          browser.
        </p>
        <div id="decision-ledger">
          <DecisionMemoryPanel
            currentTightness={assessment.scores.tightness}
            currentRiskAppetite={assessment.scores.riskAppetite}
          />
        </div>
      </div>
    </ReportShell>
  );
}
