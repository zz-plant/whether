import type { Metadata } from "next";
import { loadReportData } from "../../lib/reportData";
import { ReportShell } from "../components/reportShell";
import { AssumptionLockPanel } from "../components/assumptionLockPanel";
import { CounterfactualPanel } from "../components/counterfactualPanel";
import { DecisionMemoryPanel } from "../components/decisionMemoryPanel";
import { DecisionShieldPanel } from "../components/decisionShieldPanel";
import { ExecutiveBriefingPanel } from "../components/executiveBriefingPanel";
import { ExportBriefPanel } from "../components/exportBriefPanel";
import { StrategyBriefPanel } from "../components/strategyBriefPanel";
import {
  CxoFunctionPanel,
  DecisionShieldTemplatesPanel,
  FinanceStrategyPanel,
  HistoricalBanner,
  InsightDatabasePanel,
  MonthlyActionSummaryPanel,
  OperatorRequestsPanel,
  PlaybookPanel,
} from "../components/reportSections";

export const metadata: Metadata = {
  title: "Whether Report — What to do next",
  description:
    "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
};

export default async function OperationsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const pageLinks = [
    {
      href: "/",
      label: "Quick start",
      description: "What to do this week, plus the current climate in plain English.",
    },
    {
      href: "/signals",
      label: "Why we believe this",
      description: "See the data sources and how each signal is scored.",
    },
    {
      href: "/operations",
      label: "What to do next",
      description: "Concrete actions and decision safeguards for your team.",
    },
  ];
  const sectionLinks = [
    { href: "#monthly-action-summary", label: "Monthly summary" },
    { href: "#playbook", label: "Playbook" },
    { href: "#finance-strategy", label: "Finance strategy" },
    { href: "#strategy-brief", label: "Strategy brief" },
    { href: "#assumption-locking", label: "Assumption locking" },
    { href: "#insight-database", label: "Insight database" },
    { href: "#decision-memory", label: "Decision memory" },
    { href: "#decision-shield", label: "Decision shield" },
    { href: "#decision-shield-templates", label: "Decision templates" },
    { href: "#counterfactuals", label: "Counterfactual view" },
    { href: "#export-briefs", label: "Export briefs" },
    { href: "#executive-briefing", label: "Executive briefing" },
    { href: "#cxo-functions", label: "CXO outputs" },
    { href: "#operator-requests", label: "Operator requests" },
  ];

  const {
    assessment,
    fetchedAtLabel,
    fenceItems,
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
  const trustStatusTone = historicalSelection ? "historical" : isFallback ? "warning" : "stable";

  return (
    <ReportShell
      statusLabel={statusLabel}
      recordDateLabel={recordDateLabel}
      fetchedAtLabel={fetchedAtLabel}
      treasurySource={treasury.source}
      trustStatusLabel={trustStatusLabel}
      trustStatusDetail={trustStatusDetail}
      trustStatusTone={trustStatusTone}
      pageTitle="What to do next"
      pageSummary="Translate the market climate into action: decision shields, playbook moves, and export-ready briefs for leadership review."
      pageLinks={pageLinks}
      sectionLinks={sectionLinks}
      historicalBanner={
        historicalSelection ? <HistoricalBanner banner={historicalSelection.banner} /> : null
      }
    >
      <MonthlyActionSummaryPanel
        assessment={assessment}
        provenance={treasuryProvenance}
        recordDateLabel={recordDateLabel}
      />

      <PlaybookPanel
        playbook={playbook}
        stopItems={stopItems}
        startItems={startItems}
        fenceItems={fenceItems}
        provenance={treasuryProvenance}
      />

      <FinanceStrategyPanel regime={assessment.regime} provenance={treasuryProvenance} />

      <StrategyBriefPanel
        assessment={assessment}
        recordDateLabel={recordDateLabel}
        provenance={treasuryProvenance}
      />

      <AssumptionLockPanel />

      <InsightDatabasePanel regime={assessment.regime} provenance={treasuryProvenance} />

      <DecisionMemoryPanel
        assessment={assessment}
        provenance={treasuryProvenance}
        recordDateLabel={recordDateLabel}
      />

      <DecisionShieldPanel assessment={assessment} provenance={treasuryProvenance} />

      <DecisionShieldTemplatesPanel provenance={treasuryProvenance} />

      <CounterfactualPanel assessment={assessment} provenance={treasuryProvenance} />

      <ExportBriefPanel
        assessment={assessment}
        treasury={treasury}
        sensors={sensors}
        macroSeries={macroSeries}
        provenance={treasuryProvenance}
      />

      <ExecutiveBriefingPanel
        assessment={assessment}
        recordDateLabel={recordDateLabel}
        provenance={treasuryProvenance}
      />

      <CxoFunctionPanel provenance={internalProvenance} />

      <OperatorRequestsPanel provenance={internalProvenance} />
    </ReportShell>
  );
}
