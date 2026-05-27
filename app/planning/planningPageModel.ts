import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, createElement as h } from "react";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, websiteName } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { operationsSectionLinks } from "../../lib/navigation/planningNavigation";
import {
  canonicalCapitalDisciplinePath,
  resourcePillarPages,
  resourceSupportingPages,
} from "../../lib/resourcesContent";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../../lib/timeMachine/timeMachineSelection";
import { HistoricalBanner } from "../components/historicalBanner";
import { LiveDataFallbackAlert } from "../components/liveDataFallbackAlert";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { OperatorRequestsPanel } from "../components/appendix/ReferencePanels";
import { FinanceStrategyPanel } from "../components/appendix/financeStrategyPanel";
import { MonthlyActionSummaryPanel } from "../components/appendix/monthlyActionSummaryPanel";
import { PlaybookPanel } from "../components/appendix/playbookPanel";
import { RegimeAlertsPanel } from "../components/regimeAlertsPanel";
import { ReportShell } from "../components/reportShell";
import { DecisionMemoryPanel } from "./components/decisionMemoryPanel";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { ExecutiveBriefingPanel } from "./components/executiveBriefingPanel";
import { ExportBriefPanel } from "./components/exportBriefPanel";
import { OperationsExecutionStepper } from "./components/planningExecutionStepper";
import { RunwayPlannerPanel } from "./components/runwayPlannerPanel";
import { SectionedReportPanel } from "./components/sectionedReportPanel";

export type PlanningSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

type ReportShellModel = Parameters<typeof ReportShell>[0] extends infer Props
  ? Props extends { model: infer Model }
    ? Model
    : never
  : never;

type PlanningPageModel = {
  reportShellModel: ReportShellModel;
  children: ReactNode;
};

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

export async function buildPlanningPageModel(
  searchParams?: Promise<PlanningSearchParams>,
): Promise<PlanningPageModel> {
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

  return {
    reportShellModel: {
      status: {
        statusLabel,
        recordDateLabel,
        fetchedAtLabel,
        treasurySource: treasury.source,
      },
      page: {
        pageTitle: "Planning",
        currentPath: "/planning",
        pageSummary: "Prepare for this week's conditions: set guardrails, check runway, brief the team.",
        pageSummaryLink: { href: "#ops-monthly-action-summary", label: "Open weekly plan ↓" },
        sectionLinks: operationsSectionLinks.plan,
      },
      trust: {
        trustStatusLabel,
        trustStatusDetail,
        trustStatusAction,
        trustStatusTone,
        showOfflineBadge: isFallback && !historicalSelection,
      },
      actions: {
        primaryCta: {
          href: "#ops-monthly-action-summary",
          label: "Review the weekly plan",
        },
        secondaryCta: { href: "/", label: "Return to Weekly Brief" },
      },
      payloads: {
        decisionBanner: {
          label: "Review",
          decision: "Approve the plan, keep the stop line visible, then package the update.",
          horizon: "This week + month",
          confidence: trustStatusLabel,
          effectiveDate: recordDateLabel,
          evidenceHref: "#ops-monthly-action-summary",
        },
        commandBar: {
          regime: assessment.regime,
          call: weeklyCall.currentCall,
          doNow: weeklyCall.doNowBullets,
          flipConditions: [weeklyCall.changeCourseIf, ...weeklyCall.flipConditionLabels].slice(0, 4),
          updatedAt: fetchedAtLabel,
        },
        structuredData,
        historicalBanner: historicalSelection
          ? h(HistoricalBanner, {
            banner: historicalSelection.banner,
            liveHref: "/planning",
            previousHref: previousHistoricalHref,
            timeMachineHref: historicalTimeMachineHref,
          })
          : null,
      },
    },
    children: h(Fragment, null,
      h(OperatorWorkflowRouteTracker),
      h("p", { className: "rounded-lg border border-slate-800/70 bg-slate-950/55 px-3 py-2 text-fluid-xs leading-5 text-slate-400" },
        "This page turns the weekly call from the ",
        h(Link, { href: "/", className: "font-semibold text-sky-200 hover:text-sky-100" }, "homepage brief"),
        " into a plan with guardrails, finance direction, and share-ready formats.",
      ),
      !historicalSelection && isFallback
        ? h(LiveDataFallbackAlert, {
          lastCachedTimestamp: reportResult.ok ? treasury.fetched_at : reportResult.fallback.lastCachedTimestamp,
          sourceLabel: treasury.source,
          effectiveRecordDate: treasury.record_date,
          fallbackReason: treasury.fallback_reason,
        })
        : null,
      h(OperationsExecutionStepper, {
        steps: [
          {
            id: "ops-monthly-action-summary",
            label: "Plan",
            title: "Weekly plan",
            description: "What to approve, hold, or revisit this cycle.",
            hashAliases: ["ops-monthly-action-summary-panel"],
              children: h(SectionedReportPanel, {
                id: "ops-operator-requests-panel",
                label: "Coordinate",
                title: "Execution asks",
                description: "Current asks for the people driving execution.",
                defaultOpen: false,
              children: h(Fragment, null,
              h("section", { className: "weather-surface space-y-4 px-4 py-4" },
                h("div", { className: "space-y-2" },
                  h("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200" }, "Weekly approval boundary"),
                  h("p", { className: "text-sm text-slate-300" }, "Confirm this week's move first. Open the monthly roll-up for broader context."),
                ),
                h("div", { className: "grid gap-3 md:grid-cols-3" },
                  h("article", { className: "rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-sky-200" }, "Action now"),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.actionNow),
                  ),
                  h("article", { className: "rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-amber-200" }, "Pause if"),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.pauseIf),
                  ),
                  h("article", { className: "rounded-sm border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-violet-200" }, "Change course if"),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.changeCourseIf),
                  ),
                ),
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  snapshot.homeBriefModel.revisitDecisions
                    ? "Items to revisit. Recheck last week's approvals before adding fixed cost or widening scope."
                    : "No items to revisit. Keep the current plan unless a watch line trips.",
                ),
              ),
              h("details", { className: "weather-auto-chevron rounded border border-slate-800/60 bg-slate-950/28 px-4 py-3" },
                h("summary", { className: "flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-left" },
                  h("span", { className: "min-w-0" },
                    h("span", { className: "block text-fluid-xs font-medium text-slate-300" }, "Monthly roll-up"),
                    h("span", { className: "mt-1 block text-sm font-semibold text-slate-100" }, "Monthly planning context."),
                  ),
                  h("span", { className: "rounded-sm border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400" }, "Optional"),
                ),
                h("div", { className: "mt-4" },
                  h(MonthlyActionSummaryPanel, {
                    assessment,
                    provenance: treasuryProvenance,
                    recordDateLabel,
                    weeklyRecordDateLabel,
                  }),
                ),
              ),
              ),
            }),
          },
          {
            id: "ops-playbook",
            label: "Rules",
            title: "Rules before you commit",
            description: "Do, don't, and limit rules for new commitments.",
            hashAliases: ["ops-playbook-panel"],
            children: h(SectionedReportPanel, {
              id: "ops-playbook-panel",
              label: "Rules",
              title: "Approve or hold moves",
              description: "Do, don't, and limit rules for new commitments.",
              defaultOpen: false,
              children: h(Fragment, null,
              h("div", { className: "flex flex-wrap items-start justify-between gap-3 weather-surface px-4 py-3" },
                h("p", { className: "text-xs text-slate-300" }, showAllActionLanes ? "Full rule list." : "Top 3 rules per area."),
                h("a", {
                  href: buildActionsExpansionHref(resolvedSearchParams, !showAllActionLanes),
                  className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100",
                }, showAllActionLanes ? "Show top 3 only" : "Show all rules"),
              ),
              h(PlaybookPanel, {
                playbook,
                stopItems,
                startItems,
                fenceItems,
                provenance: treasuryProvenance,
                showProvenance: false,
                actionStripItems,
                showAllActionLanes,
              }),
              ),
            }),
          },
          {
            id: "ops-finance-strategy",
            label: "Finance",
            title: "Finance strategy",
            description: "Budget direction and cash timing for the quarter.",
            hashAliases: ["ops-finance-strategy-panel"],
            children: h(SectionedReportPanel, {
              id: "ops-finance-strategy-panel",
              label: "Verify",
              title: "Finance strategy",
              description: "Budget direction and cash timing for the quarter.",
              defaultOpen: false,
              children: h(Fragment, null,
              h(FinanceStrategyPanel, {
                regime: assessment.regime,
                provenance: treasuryProvenance,
                showProvenance: false,
              }),
              h(RunwayPlannerPanel, { assessment, sensors, macroSeries, recordDateLabel }),
              ),
            }),
          },
          {
            id: "ops-decision-shield",
            label: "Test",
            title: "Test a decision",
            description: "Check if a specific move is safe right now — hiring, pricing, roadmap, M&A.",
            hashAliases: ["ops-decision-shield-panel"],
            children: h(SectionedReportPanel, {
              id: "ops-decision-shield-panel",
              label: "Test",
              title: "Is this move safe right now?",
              description: "Rate a specific business decision against current macro conditions.",
              defaultOpen: false,
              children: h(DecisionShieldPanel, { assessment, provenance: treasuryProvenance }),
            }),
          },
          {
            id: "ops-executive-briefing",
            label: "Brief",
            title: "Brief your team",
            description: "Role-specific memos for CFO, COO, CTO/CPO tailored to current conditions.",
            hashAliases: ["ops-executive-briefing-panel"],
            children: h(SectionedReportPanel, {
              id: "ops-executive-briefing-panel",
              label: "Brief",
              title: "Brief your leadership team",
              description: "Generate role-specific guidance for each executive function.",
              defaultOpen: false,
              children: h(ExecutiveBriefingPanel, { assessment, recordDateLabel, provenance: treasuryProvenance, showProvenance: false }),
            }),
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
            children: h("div", { className: "space-y-6" },
              h(SectionedReportPanel, {
                id: "ops-export-briefs-panel",
                label: "Share",
                title: "Send this brief",
                description: "Leadership team brief for the default audience. Use the plain-English brief when people want market terms translated.",
                defaultOpen: false,
                children: h(Fragment, null,
                h(ExportBriefPanel, {
                  assessment,
                  treasury,
                  sensors,
                  macroSeries,
                  decisionModel: {
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
                  },
                  provenance: treasuryProvenance,
                  showProvenance: false,
                }),
                h(RegimeAlertsPanel),
                h(DecisionMemoryPanel),
                ),
              }),
              h(SectionedReportPanel, {
                id: "ops-operator-requests-panel",
                label: "Coordinate",
                title: "Execution asks",
                description: "Current asks for the people driving execution.",
                defaultOpen: true,
                children: h(OperatorRequestsPanel, { provenance: internalProvenance, showProvenance: false }),
              }),
            ),
          },
        ],
      }),
      h("section", { id: "ops-failure-patterns", className: "weather-panel scroll-mt-28 space-y-4 px-5 py-5", "aria-labelledby": "ops-failure-patterns-title" },
        h("div", { className: "space-y-2" },
          h("p", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" }, "Risk checks"),
          h("h2", { id: "ops-failure-patterns-title", className: "text-lg font-semibold text-slate-100" }, "Pressure-test the plan before you approve it"),
          h("p", { className: "text-sm text-slate-300" }, "Use these warnings to catch weak assumptions before the plan goes out."),
        ),
        failureModes.length === 0
          ? h("div", { className: "weather-surface rounded-md border px-4 py-4 text-sm text-slate-200" }, "No active warning right now. Hold standard guardrails and go deeper only if freshness drops or confidence weakens.")
          : h("div", { className: "grid gap-3 lg:grid-cols-2" },
            failureModes.map((warning) => h("article", { key: warning.id, className: "weather-surface rounded-md border px-4 py-4" },
              h("p", { className: "text-sm font-semibold text-slate-100" }, warning.warning),
              h("p", { className: "mt-2 text-sm text-slate-300" }, warning.mitigationCheck),
            )),
          ),
        h("div", { className: "flex flex-wrap gap-2" },
          h(Link, { href: "#ops-playbook", className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]" }, "Recheck guardrails"),
          h(Link, { href: "/trust#revisit-call", className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100" }, "Readiness risk checks"),
        ),
      ),
      h("section", { id: "ops-edge-case-gate", className: "weather-panel scroll-mt-28 space-y-4 px-5 py-5", "aria-labelledby": "ops-edge-case-gate-title" },
        h("div", { className: "space-y-2" },
          h("p", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" }, "Escalate only if one question remains"),
          h("h2", { id: "ops-edge-case-gate-title", className: "text-lg font-semibold text-slate-100" }, "Decision help"),
          h("p", { className: "text-sm text-slate-300" }, "Open decision help when one specific question still needs an answer after this review."),
        ),
        h("div", { className: "flex flex-wrap gap-2" },
          h(Link, { href: "/resolve", className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]" }, "Open decision help"),
          h(Link, { href: "/planning#ops-export-briefs", className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100" }, "Back to sharing options"),
        ),
      ),
      h("details", { className: "weather-panel weather-auto-chevron scroll-mt-28 space-y-3 px-5 py-5" },
        h("summary", { className: "cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200" }, "Board-ready templates"),
        h("div", { className: "mt-4 space-y-4 rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-4" },
          h("div", { className: "space-y-1" },
            h("p", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400" }, "Resources"),
            h("h2", { className: "text-lg font-semibold text-slate-100" }, "Board-ready templates"),
            h("p", { className: "text-sm text-slate-300" }, "Templates for board and leadership reviews."),
          ),
          h("div", { className: "grid gap-3 md:grid-cols-3" },
            resourcePillarPages.map((pillar) => h(Link, {
              key: pillar.slug,
              href: `/resources/${pillar.slug}` as Route,
              className: "weather-surface rounded-md border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70",
            },
              h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.14em] text-slate-400" }, "Governance pillar"),
              h("p", { className: "mt-2 font-semibold text-slate-100" }, pillar.h1),
              h("p", { className: "mt-2 text-sm text-slate-300" }, pillar.description),
            )),
          ),
          h("div", { className: "flex flex-wrap gap-2" },
            operationsResourceLibrary.map((resource) => h(Link, {
              key: resource.path,
              href: resource.path,
              className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100",
            }, resource.title)),
            h(Link, {
              href: canonicalCapitalDisciplinePath as Route,
              className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]",
            }, "Open governance pillar"),
          ),
        ),
      ),
    ),
  };
}
