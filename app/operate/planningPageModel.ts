import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, createElement as h } from "react";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, websiteName } from "../../lib/seo";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { operationsSectionLinks } from "../../lib/navigation/planningNavigation";
import {
  canonicalCapitalDisciplinePath,
  resourcePillarPages,
  resourceSupportingPages,
} from "../../lib/resourcesContent";
import { formatDateUTC } from "../../lib/formatters";
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
import { PlaybookPanel } from "../components/appendix/playbookPanel";
import { BoundedCorridorRails } from "../components/boundedCorridorRails";
import { ReportShell } from "../components/reportShell";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { SharePageFormats } from "../share/sharePageFormats";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { OperationsExecutionStepper } from "./components/planningExecutionStepper";
import { PremiumGate } from "./components/PremiumGate";
import { RunwayPlannerPanel } from "./components/runwayPlannerPanel";
import { ReportSection } from "../components/reportSection";

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
  return query ? `/operate?${query}#ops-playbook` : "/operate#ops-playbook";
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
        name: "Whether Weekly Brief — Planning",
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
          { path: "/operate" },
        ]),
      ),
    ],
  };

  const weeklySnapshotResult = await loadWeeklyBriefSnapshot(resolvedSearchParams, { route: "/operate" });
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
    ? buildTimeMachineHref("/operate", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/signals?advanced=1#time-machine";
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const { trustStatusTone } = snapshot.trustStatus;

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
        regime: assessment.regime,
        recordDateLabel,
        fetchedAtLabel,
      },
      page: {
        /* "Plan", matching `navigationLayers`, which declares both `label` and
           `navLabel` as "Plan". The H1 said "Planning" while the tab said "Plan" and
           the URL said /operate — three names for one section, which is the single
           most repeated inconsistency in this IA. The <title> keeps its longer
           descriptive form; only the on-page heading is the section's name. */
        pageTitle: "Plan",
        pageSummary: "Prepare for this week's conditions: set guardrails, check runway, brief the team.",
        sectionLinks: operationsSectionLinks.plan,
      },
      trust: {
        trustStatusTone,
        showOfflineBadge: isFallback && !historicalSelection,
      },
      actions: {
        // Share is the one hero action: it opens the global rail. The "Review
        // the weekly plan" button scrolled to the step directly beneath the
        // hero, and "Return to Weekly Brief" duplicated the header's Brief tab.
        showShare: true,
        // The handoff to Resolve, in the shell's one predictable place. It used
        // to be a "Decision help" section of its own at the tail — a sentence,
        // this link, and a "Back to sharing options" link to a step on the same
        // page.
        nextStep: {
          href: "/resolve",
          description: "One question still open? Resolve it",
        },
      },
      payloads: {
        structuredData,
        historicalBanner: historicalSelection
          ? h(HistoricalBanner, {
            year: historicalSelection.year,
            month: historicalSelection.month,
            asOfLabel: formatDateUTC(historicalSelection.asOf),
            liveHref: "/operate",
            previousHref: previousHistoricalHref,
            timeMachineHref: historicalTimeMachineHref,
          })
          : null,
      },
    },
    children: h(Fragment, null,
      h(OperatorWorkflowRouteTracker),
      // At the page root, not inside the Share step: that step is collapsed on
      // arrival, and the island has to exist before the nav block's Share
      // button or the picker can read it.
      h(BriefArtifactScript, { artifact: buildBriefArtifactFromSnapshot({ reportData, weeklyCall, title: "Whether Weekly Brief" }) }),
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
            // The step header directly above already states this label, title, and description.
            children: h(ReportSection, {
              variant: "split",
              hideHeader: true,
              id: "ops-monthly-action-summary-panel",
              title: "Weekly plan",
              children: h(Fragment, null,
              // A labelled group, not another box. `weather-surface` is the Surface tier —
              // the outermost radius, with its own elevation — and this sat two
              // containers deep inside the step card, wrapping three cells that are
              // bordered themselves. Three frames for one group, and the middle one
              // put the block on its own left edge. Same call the playbook panel
              // already records for its "Rules by area" group.
              // The corridor leads the plan. It is the graphic every rule on
              // this page refers to, and it sat 1,600px down inside a collapsed
              // step under a checklist and three text cards.
              h(BoundedCorridorRails, {
                items: actionStripItems,
                scores: { tightness: assessment.scores.tightness, riskAppetite: assessment.scores.riskAppetite },
                idPrefix: "plan-corridor",
                viewBoxWidth: 420,
              }),
              h("section", { className: "space-y-4" },
                h("div", { className: "space-y-2" },
                  h("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200" }, "Weekly approval boundary"),
                  h("p", { className: "text-sm text-slate-300" }, "Confirm this week's move first."),
                ),
                h("div", { className: "grid gap-3 md:grid-cols-3" },
                  h("article", { className: "rounded-md border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-sky-200" }, DECISION_CONTRACT_LABELS.action.actionNow),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.actionNow),
                  ),
                  h("article", { className: "rounded-md border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-amber-200" }, DECISION_CONTRACT_LABELS.threshold.pauseIf),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.pauseIf),
                  ),
                  h("article", { className: "rounded-md border border-slate-800/60 bg-slate-950/45 px-3 py-3" },
                    h("p", { className: "text-fluid-xs font-semibold uppercase tracking-[0.12em] text-violet-200" }, DECISION_CONTRACT_LABELS.reversal.changeCourseIf),
                    h("p", { className: "mt-2 text-sm font-semibold text-slate-100" }, weeklyCall.changeCourseIf),
                  ),
                ),
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  snapshot.homeBriefModel.revisitDecisions
                    ? "Items to revisit. Recheck last week's approvals before adding fixed cost or widening scope."
                    : "No items to revisit. Keep the current plan unless a watch line trips.",
                ),
              ),
              // The monthly call has one owner: the Monthly tab on the brief. A
              // second copy here, with its provenance and raw text, was method
              // exposition on the page that is supposed to turn the call into a plan.
              h("p", { className: "text-xs leading-5 text-slate-400" },
                "Planning a month, not a week? ",
                h("a", { href: "/?cadence=monthly", className: "font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200" }, "Open the monthly call"),
                ".",
              ),
              ),
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
            ],
            children: h("div", { className: "space-y-6" },
              // The step header above already reads Share / Share the brief, and the export
              // panel names the action in its own header; a third header between them restated both.
              h(ReportSection, { variant: "split",
                hideHeader: true,
                id: "ops-export-briefs-panel",
                title: "Share the brief",
                children: h(Fragment, null,
                // The same picker /share and the global rail use, reading the same
                // island — one artifact pipeline. The eleven-button export panel
                // that sat here built the brief a second way through its own lib.
                h(SharePageFormats),
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  "Email, meeting pack, role memos, calendar hold and the embed live on ",
                  h("a", { href: "/share", className: "font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200" }, "the share page"),
                  ".",
                ),
                ),
              }),
              h(ReportSection, { variant: "split",
                id: "ops-operator-requests-panel",
                label: "Coordinate",
                title: "Execution asks",
                description: "Current asks for the people driving execution.",
                children: h(OperatorRequestsPanel, { provenance: internalProvenance, showProvenance: false }),
              }),
            ),
          },
          {
            id: "ops-playbook",
            // Open on arrival: these are the per-area guardrails a reader has to
            // read before committing, and this page owns them. Behind a click
            // they were effectively unreachable, which is why the weekly brief
            // still carries its own copy.
            defaultOpen: true,
            label: "Rules",
            title: "Rules before you commit",
            description: "Do, don't, and limit rules for new commitments.",
            hashAliases: ["ops-playbook-panel"],
            // The step header above states this, and PlaybookPanel carries its own header below.
            children: h(ReportSection, { variant: "split",
              hideHeader: true,
              id: "ops-playbook-panel",
              title: "Rules before you commit",
              children: h(Fragment, null,
              h("div", { className: "flex flex-wrap items-center justify-between gap-3" },
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
            id: "ops-decision-shield",
            label: "Test",
            title: "Test a decision",
            description: "Check if a specific move is safe right now — hiring, pricing, roadmap, M&A.",
            hashAliases: ["ops-decision-shield-panel"],
            // The question this header used to ask now heads DecisionShieldPanel itself, so the
            // step reads "Test a decision" → "Is this move safe right now?" with nothing between.
            children: h(ReportSection, { variant: "split",
              hideHeader: true,
              id: "ops-decision-shield-panel",
              title: "Test a decision",
              children: h(DecisionShieldPanel, { assessment, provenance: treasuryProvenance, recordDate: treasury.record_date }),
            }),
          },
          {
            id: "ops-finance-strategy",
            label: "Finance",
            title: "Finance strategy",
            description: "Budget direction and cash timing for the quarter.",
            hashAliases: ["ops-finance-strategy-panel"],
            // The step header above and FinanceStrategyPanel's own header both state this already.
            children: h(ReportSection, { variant: "split",
              hideHeader: true,
              id: "ops-finance-strategy-panel",
              title: "Finance strategy",
              children: h(Fragment, null,
              h(FinanceStrategyPanel, {
                regime: assessment.regime,
                provenance: treasuryProvenance,
                showProvenance: false,
              }),
              h(PremiumGate, {
                source: "runway_planner",
                title: "Runway planner",
                description: "Model burn, revenue, and growth rate against the current regime to see how far your runway actually stretches.",
                children: h(RunwayPlannerPanel, { assessment, sensors, macroSeries, recordDateLabel }),
              }),
              ),
            }),
          },
        ],
      }),
      h("section", { id: "ops-failure-patterns", className: "weather-panel space-y-4 px-5 py-5", "aria-labelledby": "ops-failure-patterns-title" },
        h("div", { className: "space-y-2" },
          h("p", { className: "type-eyebrow type-eyebrow-section" }, "Risk checks"),
          h("h2", { id: "ops-failure-patterns-title", className: "text-lg font-semibold text-slate-100" }, "Pressure-test the plan before you approve it"),
          h("p", { className: "text-sm text-slate-300" }, "Use these warnings to catch weak assumptions before the plan goes out."),
        ),
        failureModes.length === 0
          ? h("div", { className: "weather-surface border px-4 py-4 text-sm text-slate-200" }, "No active warning right now. Hold standard guardrails and go deeper only if freshness drops or confidence weakens.")
          : h("div", { className: "grid gap-3 lg:grid-cols-2" },
            failureModes.map((warning) => h("article", { key: warning.id, className: "weather-surface border px-4 py-4" },
              h("p", { className: "text-sm font-semibold text-slate-100" }, warning.warning),
              h("p", { className: "mt-2 text-sm text-slate-300" }, warning.mitigationCheck),
            )),
          ),
        h("div", { className: "flex flex-wrap gap-2" },
          h(Link, { href: "#ops-playbook", className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]" }, "Recheck guardrails"),
          h(Link, { href: "/trust#revisit-call", className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100" }, "Trust risk checks"),
        ),
      ),
      h("details", { className: "weather-panel weather-auto-chevron space-y-3 px-5 py-5" },
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
              className: "weather-surface border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70",
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
