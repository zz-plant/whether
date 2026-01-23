import type { Metadata } from "next";
import { SectionedReportPanel } from "../components/sectionedReportPanel";
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
import { reportPageLinks } from "../../lib/reportNavigation";

export const runtime = "edge";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — What to do next",
    url: `${siteUrl}/operations`,
    description:
      "Execution-ready guidance, decision shield validation, and export briefs for the Whether Report.",
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
  const sectionLinks = [
    { href: "#ops-monthly-action-summary", label: "Monthly summary" },
    { href: "#ops-playbook", label: "Playbook" },
    { href: "#ops-finance-strategy", label: "Finance strategy" },
    { href: "#ops-strategy-brief", label: "Strategy brief" },
    { href: "#ops-assumption-locking", label: "Assumption locking" },
    { href: "#ops-insight-database", label: "Insight database" },
    { href: "#ops-decision-memory", label: "Decision memory" },
    { href: "#ops-decision-shield", label: "Decision shield" },
    { href: "#ops-decision-shield-templates", label: "Decision templates" },
    { href: "#ops-counterfactuals", label: "Counterfactual view" },
    { href: "#ops-export-briefs", label: "Export briefs" },
    { href: "#ops-executive-briefing", label: "Executive briefing" },
    { href: "#ops-cxo-functions", label: "CXO outputs" },
    { href: "#ops-operator-requests", label: "Operator requests" },
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
      pageSummary="Translate the market climate into action: decision shields, playbook moves, and export-ready briefs for leadership review."
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations" />
        ) : null
      }
    >
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
        id="ops-assumption-locking"
        title="Assumption locking"
        description="Document the operating assumptions behind major bets."
      >
        <AssumptionLockPanel />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-insight-database"
        title="Insight database"
        description="Capture what the regime implies for product signals and experiments."
      >
        <InsightDatabasePanel regime={assessment.regime} provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-decision-memory"
        title="Decision memory"
        description="Maintain a living log of decisions and their outcomes."
      >
        <DecisionMemoryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-decision-shield"
        title="Decision shield"
        description="Validate decisions against regime-specific guardrails."
      >
        <DecisionShieldPanel assessment={assessment} provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-decision-shield-templates"
        title="Decision templates"
        description="Copy-ready templates for decision shield reviews."
      >
        <DecisionShieldTemplatesPanel provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-counterfactuals"
        title="Counterfactual view"
        description="Stress-test priorities against alternate macro regimes."
      >
        <CounterfactualPanel assessment={assessment} provenance={treasuryProvenance} />
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
