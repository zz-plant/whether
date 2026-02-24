import type { Metadata } from "next";
import { SectionedReportPanel } from "../components/sectionedReportPanel";
import { loadReportData } from "../../../lib/report/reportData";
import { siteUrl } from "../../../lib/siteUrl";
import { buildPageMetadata } from "../../../lib/seo";
import { ReportShell } from "../../components/reportShell";
import {
  DecisionShieldTemplatesPanel,
  HistoricalBanner,
} from "../../components/reportSections";
import { reportPageLinks } from "../../../lib/report/reportNavigation";
import { operationsSectionLinks } from "../../../lib/navigation/operationsNavigation";
import { OperationsWorkstreamNav } from "../components/operationsWorkstreamNav";
import { OperationsWorkflowProgress } from "../components/operationsWorkflowProgress";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Action playbook: Decisions",
  description:
    "Premium decisions workstream preview with default guidance paths available now.",
  path: "/operations/decisions",
  imageAlt: "Whether action playbook decisions view",
  imageParams: {
    view: "operations-decisions",
  },
});

export default async function OperationsDecisionsPage({
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
    name: "Whether Report — Action playbook: Decisions",
    url: `${siteUrl}/operations/decisions`,
    description:
      "Premium decisions workstream preview with default guidance paths available now.",
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
      ? "Using last verified snapshot"
      : "Live • Treasury verified";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Live refresh pending. Using last verified snapshot.")
      : "Live refresh healthy. Next expected update: 48h.";
  const trustStatusAction = historicalSelection
    ? "Use historical data for retrospectives and scenario drills; finalize approvals after confirming live signals."
    : isFallback
      ? "Hold irreversible decisions until live signals return or you validate the cache."
      : "Signals are live; proceed with this cycle's approvals using plan, decision, and briefing workflows.";
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
      pageTitle="Action playbook · Decisions"
      currentPath="/operations/decisions"
      pageSummary="Premium decisions tools are marked coming soon; use current plan and briefing guidance now."
      pageSummaryLink={{
        href: "#ops-decisions-availability",
        label: "See availability",
      }}
      primaryCta={{
        href: "/operations/plan",
        label: "Use plan workstream",
      }}
      secondaryCta={{
        href: "/operations/briefings",
        label: "Use briefing workstream",
      }}
      decisionBanner={{
        label: "Coming soon",
        decision: "Premium decision tooling is not enabled in the current release.",
        horizon: "Current release",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#ops-decisions-availability",
      }}
      actionSequence={{
        title: "What to do now",
        items: [
          {
            title: "Plan commitments",
            detail: "Use Plan to align roadmap moves with current regime constraints.",
            href: "/operations/plan",
            cta: "Open plan",
          },
          {
            title: "Generate leadership output",
            detail: "Use Briefings for export-ready leadership narratives.",
            href: "/operations/briefings",
            cta: "Open briefings",
          },
          {
            title: "Track release status",
            detail: "Decisions workstream remains visible as a premium coming-soon preview.",
            href: "#ops-decisions-availability",
            cta: "View status",
          },
        ],
      }}
      pageLinks={reportPageLinks}
      sectionLinks={operationsSectionLinks.decisions}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/operations/decisions"
          />
        ) : null
      }
    >
      <OperationsWorkflowProgress currentPath="/operations/decisions" />
      <OperationsWorkstreamNav currentPath="/operations/decisions" />

      <SectionedReportPanel
        id="ops-decisions-availability"
        title="Decisions workstream availability"
        description="The decision input and decision-memory modules are sunset for the current release."
      >
        <div className="weather-surface space-y-3 p-5 text-sm text-slate-200">
          <p>
            Decision input flows, assumption locking, counterfactual controls, and decision memory
            tracking are not active in this release.
          </p>
          <p>
            Use <strong>Plan</strong> for execution posture and <strong>Briefings</strong> for
            export-ready narratives while this premium module is in coming-soon status.
          </p>
        </div>
      </SectionedReportPanel>

      <SectionedReportPanel
        id="ops-decision-templates"
        title="Decision templates"
        description="Reference templates remain available for async review notes."
      >
        <DecisionShieldTemplatesPanel provenance={treasuryProvenance} />
      </SectionedReportPanel>
    </ReportShell>
  );
}
