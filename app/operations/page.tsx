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
  operationsDeveloperReferenceLinks,
  operationsSectionLinks,
} from "../../lib/navigation/operationsNavigation";
import {
  FinanceStrategyPanel,
  MonthlyActionSummaryPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../components/appendixSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { ExportBriefPanel } from "./components/exportBriefPanel";
import { RunwayPlannerPanel } from "./components/runwayPlannerPanel";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { LiveDataFallbackAlert } from "../components/liveDataFallbackAlert";
import { buildCanonicalBoundedDecisionRules } from "../../lib/report/boundedDecisionRules";
import { buildActionStripItems } from "../../lib/report/operatingCalls";
import { OperationsExecutionStepper } from "./components/operationsExecutionStepper";
import { operationsScrollPlan } from "../../lib/navigation/scrollPlans";
import { PageFlowNav } from "../components/pageFlowNav";
import { resourcePillarPages, resourceSupportingPages } from "../../lib/resourcesContent";


export const runtime = "edge";
export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Planning",
  description:
    "Approve the weekly plan, guardrails, finance posture, and final brief for the current regime.",
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
          "Approve the weekly plan, guardrails, finance posture, and final brief for the current regime.",
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
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Using last verified snapshot"
      : "Live • Treasury verified";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Live refresh pending. Using last verified snapshot.")
      : "Live refresh healthy. Next expected update: 15m.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Evidence feed is live; use it to confirm playbook moves and decision shields.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
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
      pageSummary="Approve the weekly operating plan, then confirm guardrails, finance posture, and the final aligned brief."
      pageSummaryLink={{ href: "#ops-monthly-action-summary", label: "Open planning flow ↓" }}
      primaryCta={{
        href: "/",
        label: "Return to Weekly Brief",
      }}
      secondaryCta={{ href: "#ops-monthly-action-summary", label: "Open planning flow" }}
      exportCta={{ href: "#ops-export-briefs", label: "Open final brief" }}
      nextStep={{
        href: "/",
        description: "Return to Weekly Brief when the planning review is complete",
      }}
      pageNavVariant="compact"
      showPageNavigation={true}
      decisionBanner={{
        label: "Start here",
        decision: "Approve or hold the week's hiring, spend, and roadmap moves.",
        horizon: "This week + month",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      commandBar={{
        regime: assessment.regime,
        call: "Turn the weekly posture into a few explicit operating decisions and keep each move reversible.",
        doNow: [
          actionNowShort,
          actionStripItems[0]?.actionNow ?? startItems[0] ?? "Apply the highest-priority start move for this regime.",
        ],
        flipConditions: [
          flipThreshold,
          stopItems[0] ?? "Escalate to leadership if a stop trigger is hit.",
        ],
        updatedAt: fetchedAtLabel,
      }}
      pageLinks={reportPageLinks}
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
      <PageFlowNav
        eyebrow={operationsScrollPlan.eyebrow}
        title={operationsScrollPlan.title}
        description={operationsScrollPlan.description}
        items={operationsScrollPlan.items}
      />

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
            description: "Read this before changing team pace, spend, or priorities.",
            summary: "Confirm what you should approve, hold, or revisit for this cycle.",
            hashAliases: ["ops-monthly-action-summary-panel"],
            children: (
              <SectionedReportPanel
                id="ops-monthly-action-summary-panel"
                label="Start"
                title="Weekly plan"
                description="Read this before changing team pace, spend, or priorities."
                defaultOpen={true}
              >
                <MonthlyActionSummaryPanel
                  assessment={assessment}
                  provenance={treasuryProvenance}
                  recordDateLabel={recordDateLabel}
                  weeklyRecordDateLabel={weeklyRecordDateLabel}
                />
              </SectionedReportPanel>
            ),
          },
          {
            id: "ops-playbook",
            label: "Guardrails",
            title: "Guardrails",
            description: "Use start, stop, and fence rules before you commit new work.",
            summary: "Apply the top guardrails before approving new commitments.",
            hashAliases: ["ops-playbook-panel"],
            children: (
              <SectionedReportPanel
                id="ops-playbook-panel"
                label="Guardrails"
                title="Approve or hold moves"
                description="Use start, stop, and fence rules before you commit new work."
                defaultOpen={true}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 weather-surface px-4 py-3">
                  <p className="text-xs text-slate-300">
                    {showAllActionLanes
                      ? "Showing full action lanes for deep execution checks."
                      : "Showing top 3 items per lane for the default weekly execution scan."}
                  </p>
                  <a
                    href={buildActionsExpansionHref(resolvedSearchParams, !showAllActionLanes)}
                    className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
                  >
                    {showAllActionLanes ? "Show top 3 only" : "Show full action lanes"}
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
            title: "Share brief",
            description: "Copy-ready narratives for leadership updates and stakeholder syncs.",
            summary: "Copy or export the aligned brief after plan and finance review are complete.",
            hashAliases: ["ops-export-briefs-panel", "ops-operator-requests", "ops-operator-requests-panel"],
            children: (
              <div className="space-y-6">
                <SectionedReportPanel
                  id="ops-export-briefs-panel"
                  label="Share"
                  title="Aligned brief"
                  description="Copy-ready narratives for leadership updates and stakeholder syncs."
                  defaultOpen={true}
                >
                  <ExportBriefPanel
                    assessment={assessment}
                    treasury={treasury}
                    sensors={sensors}
                    macroSeries={macroSeries}
                    decisionModel={{
                      postureWithStageLabel: snapshot.homeBriefModel.postureWithStageLabel,
                      operatingStanceLine: snapshot.homeBriefModel.operatingStanceLine,
                      guardrailThreshold: snapshot.homeBriefModel.guardrailThreshold,
                      reversalTrigger: snapshot.homeBriefModel.reversalTrigger,
                      actionStripItems: snapshot.homeBriefModel.actionStripItems,
                      confidenceLabel: snapshot.homeBriefModel.confidenceLabel,
                      compactFlipConditionLabels: snapshot.homeBriefModel.compactFlipConditionLabels,
                      canonicalDecisionCopy: snapshot.canonicalDecisionCopy ?? undefined,
                    }}
                    provenance={treasuryProvenance}
                    showProvenance={false}
                  />
                </SectionedReportPanel>
                <SectionedReportPanel
                  id="ops-operator-requests-panel"
                  label="Coordinate"
                  title="Operator requests"
                  description="Current asks for operators driving execution."
                  defaultOpen={true}
                >
                  <OperatorRequestsPanel provenance={internalProvenance} showProvenance={false} />
                </SectionedReportPanel>
              </div>
            ),
          },
        ]}
      />

      <section id="ops-edge-case-gate" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="ops-edge-case-gate-title">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Stop here unless one bounded question remains</p>
          <h2 id="ops-edge-case-gate-title" className="text-lg font-semibold text-slate-100">Escalate only when the weekly plan is already clear</h2>
          <p className="text-sm text-slate-300">Stay in Planning for approvals, guardrails, finance posture, operator asks, and sharing. Open Decision Tools only when one owner-specific or situation-specific call still needs a bounded answer after this review.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/decide" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
            Open Decision Tools
          </Link>
          <Link href="/operations#ops-export-briefs" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">
            Return to share brief
          </Link>
        </div>
      </section>

      <details className="weather-panel scroll-mt-28 space-y-3 px-5 py-5">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.12em] text-sky-200">
          Need deeper board or governance artifacts?
        </summary>
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Governance library</p>
            <h2 className="text-lg font-semibold text-slate-100">Board-ready artifacts and deeper planning resources</h2>
            <p className="text-sm text-slate-300">Stay in Planning for the live weekly approval flow. Open these deeper artifacts only when leadership needs more governance depth than the in-page brief already provides.</p>
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
            <Link href="/resources" className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
              Open resources library
            </Link>
          </div>
        </div>
      </details>

      <section id="ops-implementation-handoffs" className="weather-panel scroll-mt-28 space-y-4 px-5 py-5" aria-labelledby="ops-developer-reference-title">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Developer reference</p>
          <h2 id="ops-developer-reference-title" className="text-lg font-semibold text-slate-100">Endpoint, terminal, and integration handoffs</h2>
          <p className="text-sm text-slate-300">Use these docs when you need implementation depth after the weekly plan is approved.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {operationsDeveloperReferenceLinks
            .map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="weather-surface rounded-xl border px-4 py-4 text-sm text-slate-100 transition-colors hover:border-sky-400/70"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{link.label}</p>
                <p className="mt-2 text-sm text-slate-300">{link.description}</p>
              </a>
            ))}
        </div>
      </section>
    </ReportShell>
  );
}
