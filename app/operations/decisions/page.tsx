import type { Metadata } from "next";
import { SectionedReportPanel } from "../components/sectionedReportPanel";
import { loadReportData } from "../../../lib/report/reportData";
import { siteUrl } from "../../../lib/siteUrl";
import { ReportShell } from "../../components/reportShell";
import { AssumptionLockPanel } from "../components/assumptionLockPanel";
import { CounterfactualPanel } from "../components/counterfactualPanel";
import { DecisionShieldPanel } from "../components/decisionShieldPanel";
import {
  DecisionShieldTemplatesPanel,
  HistoricalBanner,
} from "../../components/reportSections";
import { reportPageLinks } from "../../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../../lib/navigation/operationsNavigation";
import { OperationsWorkstreamNav } from "../components/operationsWorkstreamNav";
import { OperationsWorkflowProgress } from "../components/operationsWorkflowProgress";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Action playbook: Decisions",
  description:
    "Assumption locking, decision shields, and counterfactual pressure tests for major bets.",
};

export default async function OperationsDecisionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string; [key: string]: string | undefined }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
  } = await loadReportData(resolvedSearchParams);
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
      currentPath="/operations/decisions"
      pageSummary="Run decision guardrails, lock assumptions, and capture counterfactuals."
      pageSummaryLink={{ href: "#ops-decision-shield", label: "Explore details →" }}
      primaryCta={{ href: "#ops-decision-shield", label: "Run decision shield" }}
      secondaryCta={{ href: "#ops-assumption-locking", label: "Lock assumptions" }}
      decisionBanner={{
        label: "Validate now",
        decision: "Pressure-test this week's commitments before execution.",
        horizon: "This week",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-decision-shield",
      }}
      actionSequence={{
        title: "Decision sequence",
        items: [
          {
            title: "Run decision shield",
            detail: "Check each move against regime guardrails.",
            href: "#ops-decision-shield",
            cta: "Open shield",
          },
          {
            title: "Lock assumptions",
            detail: "Document risk stance, tolerance, and posture.",
            href: "#ops-assumption-locking",
            cta: "Open assumptions",
          },
          {
            title: "Run counterfactual view",
            detail: "Stress-test priorities against alternate macro regimes.",
            href: "#ops-counterfactuals",
            cta: "Open counterfactuals",
          },
        ],
      }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.decisions}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/operations/decisions" />
        ) : null
      }
    >
      <OperationsWorkflowProgress currentPath="/operations/decisions" />
      <OperationsWorkstreamNav currentPath="/operations/decisions" />

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
