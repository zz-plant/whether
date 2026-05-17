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
} from "../../lib/navigation/planningNavigation";
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
import { OperationsExecutionStepper } from "./components/planningExecutionStepper";
import { canonicalCapitalDisciplinePath, resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { RegimeAlertsPanel } from "../components/regimeAlertsPanel";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Planning",
  description:
    "Approve the weekly plan, guardrails, finance direction, and share-ready brief for the current market backdrop.",
  path: "/planning",
  imageAlt: "Whether planning view",
  imagePath: "/social/planning.svg",
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
  return query ? `/planning?${query}#ops-playbook` : "/planning#ops-playbook";
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
        url: `${siteUrl}/planning`,
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
          { path: "/planning" },
        ]),
      ),
    ],
  };

  const weeklySnapshotResult = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/planning" });
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
    treasury,
    treasuryProvenance,
  } = reportData;
  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/planning", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/evidence?advanced=1#time-machine";
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const {
    trustStatusLabel,
    trustStatusDetail,
    trustStatusAction,
    trustStatusTone,
  } = snapshot.trustStatus;

  const showAllActionLanes = resolvedSearchParams?.actions === "all";
  const actionStripItems = snapshot.homeBriefModel.actionStripItems;
  const weeklyCall = snapshot.weeklyCall;
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
      currentPath="/planning"
      pageSummary="Prepare for this week's conditions: set guardrails, check runway, brief the team."
      pageSummaryLink={{ href: "#ops-monthly-action-summary", label: "Open weekly plan ↓" }}
      primaryCta={{
        href: "#ops-monthly-action-summary",
        label: "Review the weekly plan",
      }}
      secondaryCta={{ href: "/", label: "Return to Weekly Brief" }}
      decisionBanner={{
        label: "Review",
        decision: "Approve the plan, keep the stop line visible, then package the update.",
        horizon: "This week + month",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      commandBar={{
        regime: assessment.regime,
        call: weeklyCall.currentCall,
        doNow: weeklyCall.doNowBullets,
        flipConditions: [weeklyCall.changeCourseIf, ...weeklyCall.flipConditionLabels].slice(0, 4),
        updatedAt: fetchedAtLabel,
      }}
      sectionLinks={operationsSectionLinks.plan}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/planning"
            previousHref={previousHistoricalHref}
            timeMachineHref={historicalTimeMachineHref}
          />
        ) : null
      }
    >
      <OperatorWorkflowRouteTracker />
      <p className="rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-fluid-xs leading-5 text-slate-400">
        This page turns the weekly call from the{" "}
        <Link href="/" className="font-semibold text-sky-200 hover:text-sky-100">homepage brief</Link>{" "}
        into a plan with guardrails, finance direction, and share-ready formats.
      </p>
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
            description: "What to approve, hold, or revisit this cycle.",
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
                      Confirm this week&apos;s move first. Open the monthly roll-up for broader context.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <article className="rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-sky-200">Action now</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{weeklyCall.actionNow}</p>
                    </article>
                    <article className="rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-amber-200">Pause if</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">
                        {weeklyCall.pauseIf}
                      </p>
                    </article>
                    <article className="rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3">
                      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-violet-200">Change course if</p>
                      <p className="mt-2 text-sm font-semibold text-slate-100">{weeklyCall.changeCourseIf}</p>
                    </article>
                  </div>
                  <p className="text-xs leading-5 text-slate-400">
                    {snapshot.homeBriefModel.revisitDecisions
                      ? "Items to revisit. Recheck last week's approvals before adding fixed cost or widening scope."
                      : "No items to revisit. Keep the current plan unless a watch line trips."}
                  </p>
                </section>

                <details className="weather-auto-chevron rounded border border-slate-800/60 bg-slate-950/28 px-4 py-3">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-left">
                    <span className="min-w-0">
                      <span className="block text-fluid-xs font-medium text-slate-300">Monthly roll-up</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-100">Monthly planning context.</span>
                    </span>
                    <span className="rounded-sm border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">
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
            description: "Do, don't, and limit rules for new commitments.",
            hashAliases: ["ops-playbook-panel"],
            children: (
              <SectionedReportPanel
                id="ops-playbook-panel"
                label="Rules"
                title="Approve or hold moves"
                description="Do, don't, and limit rules for new commitments."
                defaultOpen={true}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 weather-surface px-4 py-3">
                  <p className="text-xs text-slate-300">
                    {showAllActionLanes
                      ? "Full rule list."
                      : "Top 3 rules per area."}
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
            description: "Budget direction and cash timing for the quarter.",
            hashAliases: ["ops-finance-strategy-panel"],
            children: (
              <SectionedReportPanel
                id="ops-finance-strategy-panel"
                label="Verify"
                title="Finance strategy"
                description="Budget direction and cash timing for the quarter."
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
            description: "Leadership team brief, plain-English brief, or board-ready version.",
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
                  title="Send this brief"
                  description="Leadership team brief for the default audience. Use the plain-English brief when people want market terms translated."
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
          <div className="weather-surface rounded-md border px-4 py-4 text-sm text-slate-200">
            No active warning right now. Hold standard guardrails and go deeper only if freshness drops or confidence weakens.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {failureModes.map((warning) => (
              <article key={warning.id} className="weather-surface rounded-md border px-4 py-4">
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
          <Link href="/trust#revisit-call" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Trust risk checks
          </Link>
        </div>
      </section>

      <section id="ops-edge-case-gate" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="ops-edge-case-gate-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Escalate only if one question remains</p>
          <h2 id="ops-edge-case-gate-title" className="text-lg font-semibold text-slate-100">Decision help</h2>
          <p className="text-sm text-slate-300">Open decision help when one specific question still needs an answer after this review.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/resolve" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Open decision help
          </Link>
          <Link href="/planning#ops-export-briefs" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Back to sharing options
          </Link>
        </div>
      </section>

      <details className="weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-5 py-5">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Board-ready templates
        </summary>
        <div className="mt-4 space-y-4 rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resources</p>
            <h2 className="text-lg font-semibold text-slate-100">Board-ready templates</h2>
            <p className="text-sm text-slate-300">Templates for board and leadership reviews.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {resourcePillarPages.map((pillar) => (
              <Link
                key={pillar.slug}
                href={`/resources/${pillar.slug}` as Route}
                className="weather-surface rounded-md border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70"
              >
                <p className="text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Governance pillar</p>
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
