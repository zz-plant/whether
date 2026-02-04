import type { Metadata } from "next";
import type { ReactNode } from "react";
import { resolveTimeMachineSelection, parseTimeMachineRequest } from "../lib/timeMachine/timeMachineSelection";
import { loadReportData } from "../lib/report/reportData";
import { siteUrl } from "../lib/siteUrl";
import {
  ExecutiveSnapshotPanel,
  WeeklyActionSummaryPanel,
  RegimeSummaryPanel,
  RegimeAssessmentCard,
  RegimeChangeAlertPanel,
  SignalMatrixPanel,
  HistoricalBanner,
} from "./components/reportSections";
import { ChangeSinceLastReadPanel } from "./components/changeSinceLastReadPanel";
import { RegimeAlertsPanel } from "./components/regimeAlertsPanel";
import { ReportShell } from "./components/reportShell";
import { reportPageLinks } from "../lib/report/reportNavigation";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ReportGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section aria-label={title} className="space-y-6">
    <div className="sr-only">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="space-y-10">{children}</div>
  </section>
);

export const generateMetadata = ({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
}): Metadata => {
  const siteName = "Whether — Market Climate Station";
  const siteDescription =
    "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.";
  const selection = resolveTimeMachineSelection(searchParams);
  const requestedSelection = parseTimeMachineRequest(searchParams);
  const baseUrl = new URL("/api/og", siteUrl);

  if (selection) {
    baseUrl.searchParams.set("month", String(selection.month));
    baseUrl.searchParams.set("year", String(selection.year));
  } else if (requestedSelection) {
    baseUrl.searchParams.set("month", String(requestedSelection.month));
    baseUrl.searchParams.set("year", String(requestedSelection.year));
    baseUrl.searchParams.set("status", "invalid");
  }

  const titleSuffix = selection?.banner ?? (requestedSelection ? "Time Machine Preview" : "Live");
  const title = `Whether Report — ${titleSuffix}`;
  const imageUrl = baseUrl.toString();

  return {
    title,
    description: siteDescription,
    openGraph: {
      type: "website",
      url: siteUrl,
      title,
      description: siteDescription,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Whether Report ${titleSuffix} Open Graph`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: siteDescription,
      images: [imageUrl],
    },
  };
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const sectionLinks = [
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "#weekly-action-summary", label: "This week's actions" },
    { href: "#regime-summary", label: "Market climate summary" },
    { href: "#regime-alerts", label: "New alerts" },
    { href: "#regime-assessment", label: "What the scores mean" },
    { href: "#signal-matrix", label: "Signal breakdown" },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Whether — Market Climate Station",
    url: siteUrl,
    description:
      "Translate Treasury macro signals into plain-English operational constraints for product and engineering leaders.",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Whether"
    }
  };

  const {
    assessment,
    fetchedAtLabel,
    historicalSelection,
    recordDateLabel,
    regimeAlert,
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
    ? "Use for retrospectives only; avoid live planning calls until you return to current data."
    : isFallback
      ? "Pause irreversible decisions until the live feed returns or you confirm the cache."
      : "Safe to use for near-term planning; proceed with normal approval flow.";
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
      pageTitle="Weekly briefing"
      pageSummary="A quick pulse on the week’s regime and the moves it hints at."
      sidebarVariant="hidden"
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
    >
      <ReportGroup
        title="Leadership readout"
        description="Confirm the live signal health, then scan the executive snapshot for the week’s guardrails."
      >
        <ExecutiveSnapshotPanel
          treasury={treasury}
          assessment={assessment}
          provenance={treasuryProvenance}
        />

        <ChangeSinceLastReadPanel
          assessment={assessment}
          recordDate={treasury.record_date}
          provenance={treasuryProvenance}
        />
      </ReportGroup>

      <ReportGroup
        title="Action priorities"
        description="Lock posture, pick the weekly bet, and align on the constraints before you dig deeper."
      >
        <WeeklyActionSummaryPanel
          assessment={assessment}
          provenance={treasuryProvenance}
          recordDateLabel={recordDateLabel}
        />

        <RegimeSummaryPanel assessment={assessment} provenance={treasuryProvenance} />
      </ReportGroup>

      <ReportGroup
        title="Alert center"
        description="Review new regime alerts first, then scan the recent alert log for context."
      >
        <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

        <RegimeAlertsPanel />
      </ReportGroup>

      <ReportGroup
        title="Deep dive signals"
        description="Use these references when you need the full scoring detail and signal breakdown."
      >
        <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />

        <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
      </ReportGroup>
    </ReportShell>
  );
}
