import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, createElement as h } from "react";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import type { Route } from "../../lib/navigation/routeType";
import { buildBreadcrumbList, organizationId, websiteId } from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
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
import { HistoricalBanner } from "../components/historicalBanner";
import { LiveDataFallbackAlert } from "../components/liveDataFallbackAlert";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { OperatorRequestsPanel } from "../components/appendix/ReferencePanels";
import { FinanceStrategyPanel } from "../components/appendix/financeStrategyPanel";
import { RulesBeforeCommit } from "./components/rulesBeforeCommit";
import type { ReportShellModel } from "../components/reportShell";
import { AreaTable } from "../components/ui/areaTable";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { buildAreaRows } from "./areaRows";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { PlanLinesForm } from "./components/planLinesForm";
import { buildCanonicalBoundedDecisionRules } from "../../lib/report/boundedDecisionRules";
import { planLinesFromRules } from "../../lib/alert/planLines";
import { BriefIslandPicker } from "../components/briefIslandPicker";
import { buildReadingLines } from "../../lib/export/briefBuilders";
import { previousScoresFromDynamics } from "../../lib/export/scoreReference";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { OperationsExecutionStepper } from "./components/planningExecutionStepper";
import { ReportSection } from "../components/reportSection";

export type PlanningSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};


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
  // `isPartOf` names the site node `graph` adds, where it was an inline WebSite with no id.
  const structuredData = graph([
    {
      "@type": "WebPage",
      name: "Whether Weekly Brief — Planning",
      url: `${siteUrl}/planning`,
      description:
        "Turn this week's guidance into a plan: the rules, your runway, and the brief to share.",
      inLanguage: "en",
      isPartOf: { "@id": websiteId },
      publisher: { "@id": organizationId },
    },
    buildBreadcrumbList(
      createBreadcrumbTrail([
        { path: "/" },
        { path: "/operate" },
      ]),
    ),
  ]);

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
    playbook,
    recordDateLabel,
    startItems,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  } = reportData;
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
  /* Freshness and confidence, once, under the h1 before anything asks the
     reader to act. The shell draws it in the intro (DD-040). */
  const trustStrip = {
    ...buildTrustStripProps({
      recordDateLabel,
      isFallback,
      isHistorical: Boolean(historicalSelection),
      degradedSourceCount: buildDegradedSourceRows(reportData.sourceHealth).length,
      confidenceLabel: snapshot.homeBriefModel.confidenceLabel,
      assessment,
    }),
    href: "/trust" as const,
  };

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
        pageSummary: "This week's guidance, turned into rules for hiring, spend and the roadmap.",
        sectionLinks: operationsSectionLinks.plan,
        activeStep: "plan",
      },
      trust: {
        trustStatusTone,
        showOfflineBadge: isFallback && !historicalSelection,
        strip: trustStrip,
      },
      actions: {
        // No hero Share. The Share step further down the same page owns
        // sharing here — on a phone the hero button and the step it opens were
        // two "Share the brief" actions in one viewport. The header's Brief tab
        // already covers the route the hero's neighbours used to point at.
        // The handoff to Resolve, in the shell's one predictable place. It used
        // to be a "Decision help" section of its own at the tail — a sentence,
        // this link, and a "Back to sharing options" link to a step on the same
        // page.
        nextStep: {
          href: "/resolve",
          description: "Still stuck on one decision? Get a yes or no for it.",
          label: "Resolve a decision",
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
            id: "ops-decision-shield",
            // First and open: the plan is the reader's own decisions, and this is
            // where one meets this week's lines. The page used to open on a copy of
            // the brief's area table and ladders, with this two sections down and closed.
            defaultOpen: true,
            label: "Test",
            title: "Test a decision",
            description: "Check one move against this week's lines before you commit to it: a hire, a price change, a roadmap bet or an acquisition.",
            hashAliases: ["ops-decision-shield-panel"],
            // The question this header used to ask now heads DecisionShieldPanel itself, so the
            // step reads "Test a decision" → "Is this move safe right now?" with nothing between.
            children: h(ReportSection, { variant: "split",
              hideHeader: true,
              id: "ops-decision-shield-panel",
              title: "Test a decision",
              children: h(DecisionShieldPanel, { assessment, recordDate: treasury.record_date }),
            }),
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
              /* The per-area rows are the weekly plan step's AreaTable now — the
                 consequence tier, in the one order every surface uses. What is
                 left here is what to read before committing. */
              h(RulesBeforeCommit, {
                playbook,
                stopItems,
                startItems,
                fenceItems,
                showAll: showAllActionLanes,
              }),
              ),
            }),
          },
          {
            id: "ops-monthly-action-summary",
            label: "Areas",
            title: "This week's rule for each area",
            description: "Each area's rule with its pause line and resume line, the reference the rules and tests above read from.",
            hashAliases: ["ops-monthly-action-summary-panel"],
            // The step header directly above already states this label, title, and description.
            children: h(ReportSection, {
              variant: "split",
              hideHeader: true,
              id: "ops-monthly-action-summary-panel",
              title: "This week's rule for each area",
              children: h(Fragment, null,
              /* The table only. This step drew the score rails and an Action now /
                 Pause if / Conditions change if list above it, both already on the
                 brief one click away; the table is what the rules and tests on this
                 page refer to, so it is what the page keeps. */
              h("section", { className: "space-y-4" },
                /* One row per area, in the order every surface uses, with the rule and
                   both its lines — the same table the brief prints. */
                h(AreaTable, { rows: buildAreaRows(actionStripItems), caption: "This week's rule for each decision area" }),
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  snapshot.homeBriefModel.revisitDecisions
                    ? "Items to revisit. Recheck last week's approvals before adding fixed cost or widening scope."
                    : `No items to revisit. Keep the current plan unless funding pressure crosses ${assessment.thresholds.tightnessRegime}.`,
                ),
              ),
              // The monthly call has one owner: the Monthly tab on the brief. A
              // second copy here, with its provenance and raw text, was method
              // exposition on the page that is supposed to turn the call into a plan.
              h("p", { className: "text-xs leading-5 text-slate-400" },
                "Planning a month, not a week? ",
                h("a", { href: "/?cadence=monthly", className: "font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200" }, "Open the monthly guidance"),
                ".",
              ),
              ),
            }),
          },
          /* The use the record fits: lines agreed once, and an email the day one is
             crossed. Live weeks only — lines started from a past month's rules
             would watch a reading nobody is planning against. */
          ...(historicalSelection
            ? []
            : [{
              id: "ops-plan-lines",
              label: "Lines",
              title: "Set this plan's lines",
              description: "Move the published pause and resume lines to fit your plan, and get an email the day one is crossed.",
              children: h(PlanLinesForm, {
                defaults: planLinesFromRules(buildCanonicalBoundedDecisionRules({
                  regime: assessment.regime,
                  thresholds: assessment.thresholds,
                  scores: assessment.scores,
                })),
              }),
            }]),
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
              // The planner has one owner, /operate/financial. The same 520-line
              // panel was mounted here as well, so two routes carried one form
              // and the URL a reader shared depended on which they had open.
              h("p", { className: "text-xs leading-5 text-slate-400" },
                "Enter your runway, burn and revenue in ",
                h("a", { href: "/operate/financial", className: "font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200" }, "the runway planner"),
                " to size this week's plan against your figures.",
              ),
              ),
            }),
          },
          {
            id: "ops-export-briefs",
            label: "Share",
            title: "Share the brief",
            description: "Copy or download the brief in the format you need.",
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
                h(BriefIslandPicker, {
                  scoreReferences: buildReadingLines(reportData.assessment, {
                    actionStripItems,
                    previousScores: previousScoresFromDynamics(reportData.reportDynamics, reportData.assessment.scores),
                  }),
                }),
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
        ],
      }),
      /* Boxed like the steps above it, though it has no Done box: it was the one
         section of the page drawn as loose text, and the disclosure after it had
         no edge to say it was a section of its own rather than part of this one. */
      h("section", { id: "ops-failure-patterns", className: "weather-panel mt-6 space-y-4 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5", "aria-labelledby": "ops-failure-patterns-title" },
        h("div", { className: "space-y-2" },
          h("p", { className: "type-eyebrow type-eyebrow-section" }, "Risk checks"),
          h("h2", { id: "ops-failure-patterns-title", className: "text-lg font-semibold text-slate-100" }, "Warnings to read before you approve"),
          h("p", { className: "text-sm text-slate-300" }, "Each one names an assumption the plan rests on and how to check it."),
        ),
        failureModes.length === 0
          ? h("div", { className: "weather-surface border px-4 py-4 text-sm text-slate-200" }, "No warning this week. Keep the rules above; look again if the data goes stale or confidence drops.")
          : h("div", { className: "grid gap-3 lg:grid-cols-2" },
            failureModes.map((warning) => h("article", { key: warning.id, className: "weather-surface border px-4 py-4" },
              h("p", { className: "text-sm font-semibold text-slate-100" }, warning.warning),
              h("p", { className: "mt-2 text-sm text-slate-300" }, warning.mitigationCheck),
            )),
          ),
        h("div", { className: "flex flex-wrap gap-2" },
          h(Link, { href: "#ops-playbook", className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold" }, "Recheck the rules"),
          h(Link, { href: "/trust#revisit-call", className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100" }, DECISION_CONTRACT_LABELS.watch.flipWatch),
        ),
      ),
      h("details", { className: "weather-panel weather-auto-chevron mt-6 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5" },
        h("summary", { className: "cursor-pointer list-none text-sm font-semibold text-sky-200" }, "Resource templates and guides"),
        h("div", { className: "mt-3 space-y-4" },
          h("p", { className: "text-sm text-slate-300" }, "Templates and operating guides you can fill in and share."),
          h("div", { className: "grid gap-3 md:grid-cols-3" },
            resourcePillarPages.map((pillar) => h(Link, {
              key: pillar.slug,
              href: `/resources/${pillar.slug}` as Route,
              className: "weather-surface border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70",
            },
              h("p", { className: "font-semibold text-slate-100" }, pillar.h1),
              h("p", { className: "mt-1.5 text-sm text-slate-300" }, pillar.description),
            )),
          ),
          h("div", { className: "flex flex-wrap gap-2 pt-1" },
            operationsResourceLibrary.map((resource) => h(Link, {
              key: resource.path,
              href: resource.path,
              className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100",
            }, resource.title)),
            h(Link, {
              href: canonicalCapitalDisciplinePath as Route,
              className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold",
            }, "Read the full guide"),
          ),
        ),
      ),
    ),
  };
}
