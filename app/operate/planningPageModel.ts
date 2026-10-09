import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment, createElement as h } from "react";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { buildBreadcrumbList, organizationId, websiteId } from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
import { buildGroupBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import { operationsSectionLinks } from "../../lib/navigation/planningNavigation";
import { formatDateUTC } from "../../lib/formatters";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { siteUrl } from "../../lib/siteUrl";
import { HistoricalBanner } from "../components/historicalBanner";
import { LiveDataFallbackAlert } from "../components/liveDataFallbackAlert";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { FinanceStrategyPanel, financeStrategyFor } from "../components/appendix/financeStrategyPanel";
import { RulesBeforeCommit } from "./components/rulesBeforeCommit";
import type { ReportShellModel } from "../components/reportShell";
import { AreaTable } from "../components/ui/areaTable";
import { buildTrustStripProps } from "../../lib/report/evidenceReaderModel";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { buildAreaRows } from "./areaRows";
import { DecisionShieldPanel } from "./components/decisionShieldPanel";
import { PlanLinesForm } from "./components/planLinesForm";
import { buildCanonicalBoundedDecisionRules, decisionAreaLabel } from "../../lib/report/boundedDecisionRules";
import { planLinesFromRules } from "../../lib/alert/planLines";
import { SHARE_OR_EMBED_NEXT_STEP } from "../components/shareOrEmbedLink";
import { BriefArtifactScript } from "../components/briefArtifactScript";
import { buildBriefArtifactFromSnapshot } from "../../lib/report/homeBrief/briefArtifactBuilder";
import { OperationsExecutionStepper } from "./components/planningExecutionStepper";
import { ReportSection } from "../components/reportSection";
import { isSavedCopy } from "../../lib/report/provenanceStatus";

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
    buildBreadcrumbList(buildGroupBreadcrumbs("/operate")),
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
    playbook,
    recordDateLabel,
    startItems,
    statusLabel,
    stopItems,
    treasury,
  } = reportData;
  const isFallback = isSavedCopy(treasury);
  const { trustStatusTone } = snapshot.trustStatus;

  const showAllActionLanes = resolvedSearchParams?.actions === "all";
  const actionStripItems = snapshot.homeBriefModel.actionStripItems;
  const weeklyCall = snapshot.weeklyCall;
  const failureModes = snapshot.homeBriefModel.failureModes ?? [];
  /* What each closed step holds, said on the closed step (§XII: "a summary that
     shows the current values"). Until 2026-10-07 the three read "Move the
     published pause and resume lines…", "Budget direction and cash timing for
     the quarter." and "Copy or download the brief in the format you need." —
     a title and a sentence about the gesture, which read as empty boxes. */
  const planLineDefaults = planLinesFromRules(buildCanonicalBoundedDecisionRules({
    regime: assessment.regime,
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  }));
  const listOf = (items: readonly string[], type: "conjunction" | "disjunction") =>
    new Intl.ListFormat("en-GB", { style: "long", type }).format(items);
  const planLinesSummary = `Start from the published pause and resume lines for ${listOf(
    planLineDefaults.map((line) => decisionAreaLabel(line.area)),
    "conjunction",
  )}, then move the ones your plan needs. You get an email the day one is crossed.`;
  const financeSummary =
    financeStrategyFor(assessment.regime)?.runwayPosture ?? "Budget direction and cash timing for the quarter.";
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
      scoringBasis: reportData.scoringBasis,
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
        /* "Decide", the group's name in the header (`navigationGroups`). The H1
           said "Planning" while the tab said "Plan" and the URL said /operate —
           three names for one section, the single most repeated inconsistency in
           this IA; on 2026-10-08 the tab became the Decide group and the heading
           follows it. The <title> keeps its longer descriptive form; only the
           on-page heading is the section's name. */
        pageTitle: "Decide",
        pageSummary: "This week's guidance, turned into rules for hiring, spend and the roadmap.",
        sectionLinks: operationsSectionLinks.plan,
        currentPath: "/operate",
        tabsQuery: new URLSearchParams(
          Object.entries(resolvedSearchParams ?? {}).flatMap(([key, value]) => (value ? [[key, value]] : [])),
        ).toString() || undefined,
      },
      trust: {
        trustStatusTone,
        showOfflineBadge: isFallback && !historicalSelection,
        strip: trustStrip,
      },
      actions: {
        // No hero Share, and no Share step: until 2026-10-08 this page carried
        // the brief picker as its last step, one of five places the site
        // offered to share the same week. Every format, the embed, the
        // citation and the API live on /share; this is the one link to it, in
        // the shell's one predictable place. It replaced the handoff to
        // Resolve, which folded into this page's Test step and into Guides.
        nextStep: SHARE_OR_EMBED_NEXT_STEP,
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
            id: "ops-monthly-action-summary",
            /* First and open (2026-10-07): the page's job is this week's rules, and
               the pause and resume lines are what a reader acts on (§XII never
               collapses them). From 2026-10-06 the page opened on an empty
               decision form instead, with this table closed three steps down —
               on a phone the form was all a reader saw after the intro. This is
               the AreaTable the brief prints, read from the same rows, not a
               second build of it. */
            defaultOpen: true,
            label: "Areas",
            title: "This week's rule for each area",
            description: "Each area's rule this week, with the line that pauses it and the line that resumes it.",
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
                // "/": the "Line set by" links name the brief's score anchors, which
                // this page does not draw; in-page they went nowhere.
                h(AreaTable, { rows: buildAreaRows(actionStripItems), caption: "This week's rule for each decision area", signalLinkBase: "/" }),
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  snapshot.homeBriefModel.revisitDecisions
                    ? "To revisit: recheck last week's approvals before adding fixed cost or widening scope."
                    : `Nothing to revisit: keep the current plan unless funding pressure crosses ${assessment.thresholds.tightnessRegime}.`,
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
          {
            id: "ops-playbook",
            // Open on arrival: these are the per-area guardrails a reader has to
            // read before committing, and this page owns them. Behind a click
            // they were effectively unreachable, which is why the weekly brief
            // still carries its own copy.
            defaultOpen: true,
            label: "Rules",
            title: "Rules before you commit",
            description: "The work to stop, start and keep limited this week.",
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
            id: "ops-decision-shield",
            // Open, after the rules it tests against. It opens as one field and the
            // mode switch; the figures and the verdict appear once a plan is typed,
            // so the step no longer greets a reader with an empty form.
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
              children: h(Fragment, null,
                h(DecisionShieldPanel, { assessment, recordDate: treasury.record_date }),
                // Resolve's direct answers live on Guides since 2026-10-08, grouped
                // by decision area with this week's standing beside each.
                h("p", { className: "text-xs leading-5 text-slate-400" },
                  h("a", { href: "/resources#answers", className: "font-medium text-sky-300 underline decoration-slate-600 underline-offset-4 hover:text-sky-200" }, "Guides"),
                  " answers the most common decisions and says where each stands this week.",
                ),
              ),
            }),
          },
          /* The use the record fits: lines agreed once, and an email the day one is
             crossed. Live weeks only — lines started from a past month's rules
             would watch a reading nobody is planning against. */
          ...(historicalSelection || planLineDefaults.length === 0
            ? []
            : [{
              id: "ops-plan-lines",
              label: "Lines",
              title: "Set this plan's lines",
              description: planLinesSummary,
              children: h(PlanLinesForm, { defaults: planLineDefaults }),
            }]),
          {
            id: "ops-finance-strategy",
            label: "Finance",
            title: "Finance strategy",
            // The runway target, the stance's headline; the panel draws the rest.
            description: financeSummary,
            hashAliases: ["ops-finance-strategy-panel"],
            // The step header above states this; FinanceStrategyPanel has no header of its own.
            children: h(ReportSection, { variant: "split",
              hideHeader: true,
              id: "ops-finance-strategy-panel",
              title: "Finance strategy",
              children: h(Fragment, null,
              h(FinanceStrategyPanel, { regime: assessment.regime }),
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
        ],
      }),
      /* Boxed like the steps above it. It used to carry `weather-panel`, whose
         padding the report row zeroes for an unboxed section, so its border sat
         against its own text; and a `weather-surface` slab inside it said "No
         warning this week" in a box heavier than the section holding it. A week
         with no warning is one line now, and "Recheck the rules" waits for a
         warning to recheck them against. */
      h("section", { id: "ops-failure-patterns", className: "mt-6 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-slate-950/[0.05] p-4 sm:p-5", "aria-labelledby": "ops-failure-patterns-title" },
        h("div", { className: "space-y-1" },
          h("p", { className: "type-eyebrow type-eyebrow-section" }, "Risk checks"),
          h("h2", { id: "ops-failure-patterns-title", className: "text-lg font-semibold text-slate-100" }, "Warnings to read before you approve"),
          failureModes.length > 0
            ? h("p", { className: "text-sm text-slate-300" }, "Each one names an assumption the plan rests on and how to check it.")
            : null,
        ),
        failureModes.length === 0
          ? h("p", { className: "text-sm text-slate-200" }, "No warning this week. Keep the rules above; look again if the data goes stale or a score nears its change line.")
          /* Rule segments inside the section, like the Stop and Start lists: the
             data tier, no lift of their own (§XIII, §XIV). */
          : h("ul", { className: "grid gap-3 lg:grid-cols-2" },
            failureModes.map((warning) => h("li", { key: warning.id, className: "rounded-md border border-l-4 border-amber-500/25 border-l-amber-400/70 p-4" },
              h("p", { className: "text-sm font-semibold text-slate-100" }, warning.warning),
              h("p", { className: "mt-2 text-sm text-slate-300" }, warning.mitigationCheck),
            )),
          ),
        h("div", { className: "flex flex-wrap gap-2" },
          failureModes.length > 0
            ? h(Link, { href: "#ops-playbook", className: "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold" }, "Recheck the rules")
            : null,
          h(Link, { href: "/trust#revisit-call", className: "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100" }, DECISION_CONTRACT_LABELS.watch.flipWatch),
        ),
      ),
    ),
  };
}
