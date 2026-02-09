import type { Metadata } from "next";
import { SectionedReportPanel } from "../components/sectionedReportPanel";
import { loadReportData } from "../../../lib/report/reportData";
import { siteUrl } from "../../../lib/siteUrl";
import { ReportShell } from "../../components/reportShell";
import { AssumptionLockPanel } from "../components/assumptionLockPanel";
import { CounterfactualPanel } from "../components/counterfactualPanel";
import { DecisionMemoryPanel } from "../components/decisionMemoryPanel";
import { DecisionShieldPanel } from "../components/decisionShieldPanel";
import {
  DecisionShieldTemplatesPanel,
  HistoricalBanner,
} from "../../components/reportSections";
import { reportPageLinks } from "../../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../../lib/navigation/operationsNavigation";
import { OperationsWorkstreamNav } from "../components/operationsWorkstreamNav";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Action playbook: Decisions",
  description:
    "Assumption locking, decision shields, and counterfactual pressure tests for major bets.",
};

export default async function OperationsDecisionsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Action playbook: Decisions",
    url: `${siteUrl}/operations/decisions`,
    description:
      "Assumption locking, decision shields, and counterfactual pressure tests for major bets.",
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
    recordDateLabel,
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
      pageTitle="Action playbook · Decisions"
      pageSummary="First action: run decision-shield checks before locking assumptions."
      pageSummaryLink={{ href: "#ops-decision-shield", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.decisions}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations/decisions" />
        ) : null
      }
    >
      <OperationsWorkstreamNav currentPath="/operations/decisions" />

      <section className="weather-panel space-y-2 px-6 py-5">
        <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">First action</p>
        <p className="text-sm text-slate-200">
          Run decision-shield guardrails first, then capture assumptions and counterfactual stress tests before commit.
        </p>
      </section>

      <SectionedReportPanel
        id="ops-decision-shield"
        title="Decision shield"
        description="Validate decisions against regime-specific guardrails."
      >
        <DecisionShieldPanel assessment={assessment} provenance={treasuryProvenance} />
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-assumption-locking"
        title="Assumption locking"
        description="Document the operating assumptions behind major bets."
      >
        <AssumptionLockPanel />
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
    </ReportShell>
  );
}
