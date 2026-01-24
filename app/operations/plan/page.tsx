import type { Metadata } from "next";
import { SectionedReportPanel } from "../../components/sectionedReportPanel";
import { loadReportData } from "../../../lib/reportData";
import { siteUrl } from "../../../lib/siteUrl";
import { ReportShell } from "../../components/reportShell";
import {
  FinanceStrategyPanel,
  HistoricalBanner,
  InsightDatabasePanel,
  MonthlyActionSummaryPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../../components/reportSections";
import { reportPageLinks } from "../../../lib/reportNavigation";
import { operationsSectionLinks } from "../../../lib/operationsNavigation";
import { OperationsWorkstreamNav } from "../../components/operationsWorkstreamNav";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Operations plan",
  description:
    "Playbook moves, finance posture, and operator requests tuned to the current regime.",
};

export default async function OperationsPlanPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Operations plan",
    url: `${siteUrl}/operations/plan`,
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
    playbook,
    recordDateLabel,
    startItems,
    statusLabel,
    stopItems,
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
      pageTitle="What to do next"
      pageSummary="Workstream: plan. Translate the regime into quarterly posture, playbook moves, and operator requests."
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.plan}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations/plan" />
        ) : null
      }
    >
      <OperationsWorkstreamNav currentPath="/operations/plan" />

      <SectionedReportPanel
        id="ops-monthly-action-summary"
        title="Monthly action summary"
        description="What moves the regime recommends this month."
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
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-finance-strategy"
        title="Finance strategy"
        description="Budget posture and cash timing guidance for the quarter."
      >
        <FinanceStrategyPanel regime={assessment.regime} provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-insight-database"
        title="Insight database"
        description="Capture what the regime implies for product signals and experiments."
      >
        <InsightDatabasePanel regime={assessment.regime} provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-operator-requests"
        title="Operator requests"
        description="Current asks for operators driving execution."
      >
        <OperatorRequestsPanel provenance={internalProvenance} />
      </SectionedReportPanel>
    </ReportShell>
  );
}
