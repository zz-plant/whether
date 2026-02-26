import type { Metadata } from "next";
import { SectionedReportPanel } from "./components/sectionedReportPanel";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { buildPageMetadata } from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import {
  FinanceStrategyPanel,
  HistoricalBanner,
  InsightDatabasePanel,
  MonthlyActionSummaryPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../components/reportSections";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../lib/navigation/operationsNavigation";
import { OperationsWorkstreamNav } from "./components/operationsWorkstreamNav";
import { OperationsWorkflowProgress } from "./components/operationsWorkflowProgress";
import { ExportBriefPanel } from "./components/exportBriefPanel";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook",
  description:
    "Playbook moves, finance posture, and operator requests tuned to the current regime.",
  path: "/operations",
  imageAlt: "Whether action playbook plan view",
  imageParams: {
    template: "operations",
    eyebrow: "Action playbook · Plan",
    title: "Set priorities and resource posture",
    subtitle:
      "Translate regime context into playbook moves, finance posture, and operator requests.",
    kicker: "Plan workstream · Whether",
  },
});

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
    "@type": "WebPage",
    name: "Whether Report — Action playbook",
    url: `${siteUrl}/operations`,
    description:
      "Playbook moves, finance posture, and operator requests tuned to the current regime.",
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: "Whether — Market Climate Station",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Whether",
    },
  };

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
  } = await loadReportData(resolvedSearchParams);
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
      : "Live refresh healthy. Next expected update: 48h.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm playbook moves and decision shields.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";

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
      pageTitle="Action playbook"
      currentPath="/operations"
      pageSummary="Review the monthly summary and align the execution playbook for this cycle."
      pageSummaryLink={{ href: "#ops-playbook", label: "Jump to playbook section ↓" }}
      primaryCta={{
        href: "#ops-monthly-action-summary",
        label: "Review monthly summary",
      }}
      secondaryCta={{ href: "#ops-playbook", label: "Open execution playbook" }}
      decisionBanner={{
        label: "Align now",
        decision: "Translate the regime into an execution-ready monthly plan.",
        horizon: "This month",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-monthly-action-summary",
      }}
      actionSequence={{
        title: "Planning sequence",
        items: [
          {
            title: "Review monthly summary",
            detail: "Confirm posture and priorities for this cycle.",
            href: "#ops-monthly-action-summary",
            cta: "Open summary",
          },
          {
            title: "Apply playbook moves",
            detail: "Choose start, stop, and fence actions.",
            href: "#ops-playbook",
            cta: "Open playbook",
          },
          {
            title: "Sync finance strategy",
            detail: "Check funding signals before commitments.",
            href: "#ops-finance-strategy",
            cta: "Open finance strategy",
          },
        ],
      }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.plan}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/operations"
          />
        ) : null
      }
    >
      <OperationsWorkflowProgress currentPath="/operations" />
      <OperationsWorkstreamNav currentPath="/operations" />

      <SectionedReportPanel
        id="ops-monthly-action-summary"
        title="Monthly action summary"
        description="The moves the regime recommends this month."
      >
        <MonthlyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-playbook"
        title="Playbook"
        description="Start, stop, and fence actions tuned to the current regime."
      >
        <PlaybookPanel
          playbook={playbook}
          stopItems={stopItems}
          startItems={startItems}
          fenceItems={fenceItems}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-finance-strategy"
        title="Finance strategy"
        description="Budget posture and cash timing guidance for the quarter."
      >
        <FinanceStrategyPanel
          regime={assessment.regime}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-insight-database"
        title="Insight database"
        description="Capture what the regime implies for product signals and experiments."
      >
        <InsightDatabasePanel
          regime={assessment.regime}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-export-briefs"
        title="Export briefs"
        description="Copy-ready narratives for leadership updates and stakeholder syncs."
      >
        <ExportBriefPanel
          assessment={assessment}
          treasury={treasury}
          sensors={sensors}
          macroSeries={macroSeries}
          provenance={treasuryProvenance}
          showProvenance={false}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-operator-requests"
        title="Operator requests"
        description="Current asks for operators driving execution."
      >
        <OperatorRequestsPanel provenance={internalProvenance} showProvenance={false} />
      </SectionedReportPanel>
    </ReportShell>
  );
}
