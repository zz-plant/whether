import type { Metadata } from "next";
import { SectionedReportPanel } from "../components/sectionedReportPanel";
import { loadReportData } from "../../../lib/report/reportData";
import { siteUrl } from "../../../lib/siteUrl";
import { ReportShell } from "../../components/reportShell";
import { ExecutiveBriefingPanel } from "../components/executiveBriefingPanel";
import { ExportBriefPanel } from "../components/exportBriefPanel";
import { StrategyBriefPanel } from "../components/strategyBriefPanel";
import { reportPageLinks } from "../../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../../lib/navigation/operationsNavigation";
import { OperationsWorkstreamNav } from "../components/operationsWorkstreamNav";
import { OperationsWorkflowProgress } from "../components/operationsWorkflowProgress";
import { CxoFunctionPanel, HistoricalBanner } from "../../components/reportSections";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Action playbook: Briefings",
  description:
    "Strategy narratives, export briefs, and CXO-ready outputs aligned to the current regime.",
};

export default async function OperationsBriefingsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Action playbook: Briefings",
    url: `${siteUrl}/operations/briefings`,
    description:
      "Strategy narratives, export briefs, and CXO-ready outputs aligned to the current regime.",
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
    fetchedAtLabel,
    historicalSelection,
    internalProvenance,
    macroSeries,
    recordDateLabel,
    sensors,
    statusLabel,
    treasury,
    treasuryProvenance,
  } = await loadReportData(searchParams);
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const trustStatusLabel = historicalSelection
    ? "Historical snapshot"
    : isFallback
      ? "Fallback mode"
      : "Verified live feed";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? treasury.fallback_reason ?? "Using cached Treasury snapshot due to upstream outage."
      : "Treasury API responding normally; live signals verified.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives; avoid approving new bets until live signals return."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm playbook moves and decision shields.";
  const trustStatusTone = historicalSelection ? "historical" : isFallback ? "warning" : "stable";

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
      pageTitle="Action playbook · Briefings"
      currentPath="/operations/briefings"
      pageSummary="Draft strategy narratives and export leadership-ready briefing kits."
      pageSummaryLink={{ href: "#ops-strategy-brief", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.briefings}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations/briefings" />
        ) : null
      }
    >
      <OperationsWorkflowProgress currentPath="/operations/briefings" />
      <OperationsWorkstreamNav currentPath="/operations/briefings" />

      <SectionedReportPanel
        id="ops-strategy-brief"
        title="Strategy brief"
        description="Board-ready narrative to align leaders on the regime shift."
      >
        <StrategyBriefPanel
          assessment={assessment}
          recordDateLabel={recordDateLabel}
          provenance={treasuryProvenance}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-export-briefs"
        title="Export briefs"
        description="Downloadable briefs for leadership and planning cycles."
      >
        <ExportBriefPanel
          assessment={assessment}
          treasury={treasury}
          sensors={sensors}
          macroSeries={macroSeries}
          provenance={treasuryProvenance}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-executive-briefing"
        title="Executive briefing"
        description="One-page readout for exec leadership syncs."
      >
        <ExecutiveBriefingPanel
          assessment={assessment}
          recordDateLabel={recordDateLabel}
          provenance={treasuryProvenance}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-cxo-functions"
        title="CXO outputs"
        description="Functional deliverables by executive leader."
      >
        <CxoFunctionPanel provenance={internalProvenance} />
      </SectionedReportPanel>
    </ReportShell>
  );
}
