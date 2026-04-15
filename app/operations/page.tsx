import Link from "next/link";
import type { Metadata } from "next";
import type { Route } from "../../lib/navigation/routeType";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { siteUrl } from "../../lib/siteUrl";
import { buildBreadcrumbList, buildPageMetadata, websiteName } from "../../lib/seo";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../../lib/timeMachine/timeMachineSelection";
import { ReportShell } from "../components/reportShell";
import { HistoricalBanner } from "../components/historicalBanner";
import {
  operationsSectionLinks,
} from "../../lib/navigation/operationsNavigation";
import {
  OperatorRequestsPanel,
} from "../components/appendix/ReferencePanels";
import { MonthlyActionSummaryPanel } from "../components/appendix/monthlyActionSummaryPanel";
import { PlaybookPanel } from "../components/appendix/playbookPanel";
import { FinanceStrategyPanel } from "../components/appendix/financeStrategyPanel";
import { DecisionMemoryPanel } from "./components/decisionMemoryPanel";
import { ExportBriefPanel } from "./components/exportBriefPanel";
import { RunwayPlannerPanel } from "./components/runwayPlannerPanel";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { LiveDataFallbackAlert } from "../components/liveDataFallbackAlert";
import { buildCanonicalBoundedDecisionRules } from "../../lib/report/boundedDecisionRules";
import { buildActionStripItems } from "../../lib/report/operatingCalls";
import { OperationsExecutionStepper } from "./components/operationsExecutionStepper";
import { canonicalCapitalDisciplinePath, resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { RegimeAlertsPanel } from "../components/regimeAlertsPanel";
import { buildDecisionReadinessState } from "../../lib/report/trustStatus";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Planning",
  description:
    "Approve the weekly plan, guardrails, finance direction, and share-ready brief for the current market backdrop.",
  path: "/operations",
  imageAlt: "Whether planning view",
  imagePath: "/social/operations.svg",
});

export function buildActionsExpansionHref(
  searchParams: Record<string, string | undefined> | undefined,
  showAll: boolean,
) {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== "actions") {
        params.set(key, value);
      }
    });
  }
  if (showAll) {
    params.set("actions", "all");
  }
  const query = params.toString();
  return query ? `/operations?${query}#ops-playbook` : "/operations#ops-playbook";
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Whether Report — Planning",
        url: `${siteUrl}/operations`,
        description:
          "Approve the weekly plan, guardrails, finance direction, and share-ready brief for the current market backdrop.",
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          name: websiteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: "Whether",
        },
      },
      buildBreadcrumbList(
        createBreadcrumbTrail([
          { path: "/" },
          { path: "/operations" },
        ]),
      ),
    ],
  };

  const weeklySnapshotResult = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/operations" });
  const reportResult = weeklySnapshotResult.reportResult;
  const reportData = weeklySnapshotResult.reportData;
  const { snapshot } = weeklySnapshotResult;
  const {
    assessment,
    fenceItems,
    fetchedAtLabel,
    historicalSelection,
    internalProvenance,
    macroSeries,
    playbook,
    recordDateLabel,
    weeklyRecordDateLabel,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    actionNowShort,
    flipThreshold,
    treasury,
    treasuryProvenance,
  } = reportData;
  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/operations", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/signals?advanced=1#time-machine";
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const decisionReadiness = buildDecisionReadinessState({
    confidenceLabel: snapshot.homeBriefModel.confidenceLabel,
    freshnessLabel: fetchedAtLabel,
    isFallbackSnapshot: isFallback,
    isHistoricalSelection: Boolean(historicalSelection),
  });
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using last verified snapshot"
      : decisionReadiness.label === "Act with caution"
        ? "Live, but approvals staged"
        : "Live and current";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Live refresh pending. Using last verified snapshot.")
      : decisionReadiness.label === "Act with caution"
        ? decisionReadiness.detail
        : "The live refresh is healthy. Next expected update: 15m.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives; switch back to live data before approving anything new."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : decisionReadiness.label === "Act with caution"
        ? "Keep decisions reversible until confidence improves or a stronger live refresh lands."
        : "Carry the plan forward and keep the stop lines visible.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback || decisionReadiness.tone === "warning"
      ? "warning"
      : "stable";

  const showAllActionLanes = resolvedSearchParams?.actions === "all";
  const actionStripItems = buildActionStripItems(
    buildCanonicalBoundedDecisionRules({
      regime: assessment.regime,
      thresholds: assessment.thresholds,
      scores: assessment.scores,
    }),
  );
  const operationsResourceLibrary = [
    resourceSupportingPages.capitalPostureTemplate,
    resourceSupportingPages.reversalTriggerChecklist,
    resourceSupportingPages.quarterlyCapitalPostureMemoExample,
    resourceSupportingPages.decisionShieldOverview,
  ] as const;
  const failureModes = snapshot.homeBriefModel.failureModes ?? [];
  return (
    <ReportShell
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      treasurySource={treasury.source}
      trustStatusLabel={trustStatusLabel}
      trustStatusDetail={trustStatusDetail}
      trustStatusAction={trustStatusAction}
      trustStatusTone={trustStatusTone}
      showOfflineBadge={isFallback && !historicalSelection}
      pageTitle="Planning"
      currentPath="/operations"
      pageSummary="Turn this week's recommendation into a clear plan, visible stop lines, and a brief you can share."
      pageSummaryLink={{ href: "#ops-monthly-action-summary", label: "Open weekly plan ↓" }}
      primaryCta={{
        href: "#ops-monthly-action-summary",
        label: "Review the weekly plan",
      }}
      secondaryCta={{ href: "/", label: "Return to Weekly Brief" }}
      decisionBanner={{
        label: "Start here",
        decision: "Approve the plan, keep the stop line visible, then package the brief.",
        horizon: "This week + month",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      commandBar={{
        regime: assessment.regime,
        call: "Turn this week's call into a few explicit decisions and keep the stop lines visible.",
        doNow: [
          actionNowShort,
          actionStripItems[0]?.actionNow ?? startItems[0] ?? "Apply the highest-priority start move for this week's backdrop.",
        ],
        flipConditions: [
          flipThreshold,
          stopItems[0] ?? "Escalate to leadership if a stop trigger is hit.",
        ],
        updatedAt: fetchedAtLabel,
      }}
      sectionLinks={operationsSectionLinks.plan}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/operations"
            previousHref={previousHistoricalHref}
            timeMachineHref={historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <OperatorWorkflowRouteTracker />
      {!historicalSelection && isFallback ? (
        <LiveDataFallbackAlert
          lastCachedTimestamp={reportResult.ok ? treasury.fetched_at : reportResult.fallback.lastCachedTimestamp}
          sourceLabel={treasury.source}
          effectiveRecordDate={treasury.record_date}
          fallbackReason={treasury.fallback_reason}
        />
      ) : null}

      <OperationsExecutionStepper
        steps={[
          {
            id: "ops-monthly-action-summary",
            label: "Plan",
            title: "Weekly plan",
            description: "Review this before changing team pace, spend, or priorities.",
            summary: "Confirm what you should approve, hold, or revisit for this cycle.",
            owner: "CEO / COO",
            approvalStatus: "Approve this week's plan",
            changeSignal: "The current call or priority posture changes",
            hashAliases: ["ops-monthly-action-summary-panel"],
            children: (
              <SectionedReportPanel
                id="ops-monthly-action-summary-panel"
                label="Start"
                title="Weekly plan"
                description="Review this before changing team pace, spend, or priorities."
                defaultOpen={true}
              >
                <section className="weather-surface space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                      Weekly approval boundary
                    </p>
                    <p className="text-sm text-slate-300">
                      Confirm the bounded weekly move first. Open the monthly roll-up only if you need the broader planning language or export payload.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <article className="rounded-[0.95rem] border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-200">Action now</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{actionNowShort}</p>
                    </article>
                    <article className="rounded-[0.95rem] border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">Pause if</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {stopItems[0] ?? "Pause new fixed-cost approvals if the guardrail is hit."}
                      </p>
                    </article>
                    <article className="rounded-[0.95rem] border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">Change course if</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{flipThreshold}</p>
                    </article>
                  </div>
                  <p className="text-xs leading-5 text-slate-400">
                    {snapshot.homeBriefModel.revisitDecisions
                      ? "This week still has reopen pressure. Recheck last week’s approvals before adding fixed cost or widening scope."
                      : "No reopen queue is active right now. Keep the current weekly plan unless one of the watch lines trips."}
                  </p>
                </section>

                <details className="weather-auto-chevron rounded-[1rem] border border-slate-800/60 bg-slate-950/28 px-4 py-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-slate-300">Monthly roll-up</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-100">Open the broader monthly planning language only if you need it.</span>
                    </span>
                    <span className="rounded-[0.65rem] border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Optional
                    </span>
                  </summary>
                  <div className="mt-4">
                    <MonthlyActionSummaryPanel
                      assessment={assessment}
                      provenance={treasuryProvenance}
                      recordDateLabel={recordDateLabel}
                      weeklyRecordDateLabel={weeklyRecordDateLabel}
                    />
                  </div>
                </details>
              </SectionedReportPanel>
            ),
          },
          {
            id: "ops-playbook",
            label: "Rules",
            title: "Rules before you commit",
            description: "Use do, don't, and limit rules before you commit new work.",
            summary: "Apply the main rules before approving new commitments.",
            owner: "Function leads",
            approvalStatus: "Set stop lines",
            changeSignal: "A pause-if or change-course condition is hit",
            hashAliases: ["ops-playbook-panel"],
            children: (
              <SectionedReportPanel
                id="ops-playbook-panel"
                label="Rules"
                title="Approve or hold moves"
                description="Use do, don't, and limit rules before you commit new work."
                defaultOpen={true}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 weather-surface px-4 py-3">
                  <p className="text-xs text-slate-300">
                    {showAllActionLanes
                      ? "Showing the full rule list for a deeper review."
                      : "Showing the top 3 rules in each area for the default weekly scan."}
                  </p>
                  <a
                    href={buildActionsExpansionHref(resolvedSearchParams, !showAllActionLanes)}
                    className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
                  >
                    {showAllActionLanes ? "Show top 3 only" : "Show all rules"}
                  </a>
                </div>
                <PlaybookPanel
                  playbook={playbook}
                  stopItems={stopItems}
                  startItems={startItems}
                  fenceItems={fenceItems}
                  provenance={treasuryProvenance}
                  showProvenance={false}
                  actionStripItems={actionStripItems}
                  showAllActionLanes={showAllActionLanes}
                />
              </SectionedReportPanel>
            ),
          },
          {
            id: "ops-finance-strategy",
            label: "Finance",
            title: "Finance strategy",
            description: "Budget posture and cash timing guidance for the quarter.",
            summary: "Validate runway timing and budget posture before sharing the brief.",
            owner: "CFO / finance lead",
            approvalStatus: "Validate cash posture",
            changeSignal: "Runway assumptions or financing windows move",
            hashAliases: ["ops-finance-strategy-panel"],
            children: (
              <SectionedReportPanel
                id="ops-finance-strategy-panel"
                label="Verify"
                title="Finance strategy"
                description="Budget posture and cash timing guidance for the quarter."
                defaultOpen={true}
              >
                <FinanceStrategyPanel
                  regime={assessment.regime}
                  provenance={treasuryProvenance}
                  showProvenance={false}
                />
                <RunwayPlannerPanel assessment={assessment} />
              </SectionedReportPanel>
            ),
          },
          {
            id: "ops-export-briefs",
            label: "Share",
            title: "Share the brief",
            description: "Choose the default U.S. leadership update, a plain-English explainer, or a board-ready version.",
            summary: "Start with the leadership update for U.S. exec rooms, then switch to the plain-English version when people want the market terms translated.",
            owner: "Chief of staff / exec comms",
            approvalStatus: "Ready to circulate",
            changeSignal: "The room needs an explainer or governance pack",
            hashAliases: [
              "ops-export-briefs-panel",
              "ops-operator-requests",
              "ops-operator-requests-panel",
              "regime-alert-log",
              "decision-memory",
            ],
            children: (
              <div className="space-y-6">
                <SectionedReportPanel
                  id="ops-export-briefs-panel"
                  label="Share"
                  title="Share-ready brief"
                  description="Start with the leadership update for the default U.S. exec room. Use the plain-English version when people want the market terms translated."
                  defaultOpen={true}
                >
                  <ExportBriefPanel
                    assessment={assessment}
                    treasury={treasury}
                    sensors={sensors}
                    macroSeries={macroSeries}
                    decisionModel={{
                      postureWithStageLabel: snapshot.homeBriefModel.postureWithStageLabel,
                      currentCall: snapshot.canonicalDecisionCopy?.operatingCall ?? snapshot.homeBriefModel.operatingStanceLine,
                      actionNow:
                        snapshot.canonicalDecisionCopy?.doNowLines[0]
                        ?? snapshot.homeBriefModel.actionNowShort
                        ?? snapshot.homeBriefModel.operatingStanceLine,
                      operatingStanceLine: snapshot.homeBriefModel.operatingStanceLine,
                      guardrailThreshold: snapshot.homeBriefModel.guardrailThreshold,
                      reversalTrigger: snapshot.homeBriefModel.reversalTrigger,
                      actionStripItems: snapshot.homeBriefModel.actionStripItems,
                      confidenceLabel: snapshot.homeBriefModel.confidenceLabel,
                      confidencePercent: snapshot.homeBriefModel.confidencePercent,
                      compactFlipConditionLabels: snapshot.homeBriefModel.compactFlipConditionLabels,
                      canonicalDecisionCopy: snapshot.canonicalDecisionCopy ?? undefined,
                      decisionShiftSummary: snapshot.homeBriefModel.decisionShiftSummary,
                      trendLabel: snapshot.homeBriefModel.trendLabel,
                    }}
                    provenance={treasuryProvenance}
                    showProvenance={false}
                  />
                  <RegimeAlertsPanel />
                  <DecisionMemoryPanel />
                </SectionedReportPanel>
                <SectionedReportPanel
                  id="ops-operator-requests-panel"
                  label="Coordinate"
                  title="Execution asks"
                  description="Current asks for the people driving execution."
                  defaultOpen={true}
                >
                  <OperatorRequestsPanel provenance={internalProvenance} showProvenance={false} />
                </SectionedReportPanel>
              </div>
            ),
          },
        ]}
      />

      <section id="ops-failure-patterns" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="ops-failure-patterns-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Risk checks</p>
          <h2 id="ops-failure-patterns-title" className="text-lg font-semibold text-slate-100">Pressure-test the plan before you approve it</h2>
          <p className="text-sm text-slate-300">Use these warnings to catch weak assumptions before the plan goes out.</p>
        </div>
        {failureModes.length === 0 ? (
          <div className="weather-surface rounded-xl border px-4 py-4 text-sm text-slate-200">
            No active warning right now. Keep the standard guardrails in place and go deeper only if freshness drops or confidence weakens.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {failureModes.map((warning) => (
              <article key={warning.id} className="weather-surface rounded-xl border px-4 py-4">
                <p className="text-sm font-semibold text-slate-100">{warning.warning}</p>
                <p className="mt-2 text-sm text-slate-300">{warning.mitigationCheck}</p>
              </article>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="#ops-playbook" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Recheck guardrails
          </Link>
          <Link href="/method#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Trust risk checks
          </Link>
        </div>
      </section>

      <section id="ops-edge-case-gate" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="ops-edge-case-gate-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Only escalate if one clear question remains</p>
          <h2 id="ops-edge-case-gate-title" className="text-lg font-semibold text-slate-100">Open decision help only after the plan is clear</h2>
          <p className="text-sm text-slate-300">Stay in Planning for approvals, guardrails, finance decisions, execution asks, and sharing. Open decision help only when one owner-specific or situation-specific question still needs a clear answer after this review.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/decide" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Open decision help
          </Link>
          <Link href="/operations#ops-export-briefs" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Back to sharing options
          </Link>
        </div>
      </section>

      <details className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-5 py-5">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Need more board or governance detail?
        </summary>
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Governance library</p>
            <h2 className="text-lg font-semibold text-slate-100">Board and governance resources</h2>
            <p className="text-sm text-slate-300">Planning should cover the weekly approval flow. Open these resources when you need a fuller board or governance version of the same work.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {resourcePillarPages.map((pillar) => (
              <Link
                key={pillar.slug}
                href={`/resources/${pillar.slug}` as Route}
                className="weather-surface rounded-xl border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Governance pillar</p>
                <p className="mt-2 font-semibold text-slate-100">{pillar.h1}</p>
                <p className="mt-2 text-sm text-slate-300">{pillar.description}</p>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {operationsResourceLibrary.map((resource) => (
              <Link
                key={resource.path}
                href={resource.path}
                className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
              >
                {resource.title}
              </Link>
            ))}
            <Link href={canonicalCapitalDisciplinePath as Route} className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Open governance pillar
            </Link>
          </div>
        </div>
      </details>
    </ReportShell>
  );
}
