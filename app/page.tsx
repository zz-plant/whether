import type { Metadata } from "next";
import { resolveTimeMachineSelection, parseTimeMachineRequest } from "../lib/timeMachineSelection";
import { loadReportData } from "../lib/reportData";
import {
  FirstTimeGuidePanel,
  BeginnerGlossaryPanel,
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

export const generateMetadata = ({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string };
}): Metadata => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://whether.report";
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
    { href: "#executive-snapshot", label: "Leadership summary" },
    { href: "#weekly-action-summary", label: "This week's actions" },
    { href: "#regime-summary", label: "Market climate summary" },
    { href: "#regime-alerts", label: "New alerts" },
    { href: "#regime-alert-log", label: "Alert history" },
    { href: "#regime-assessment", label: "What the scores mean" },
    { href: "#signal-matrix", label: "Signal breakdown" },
    { href: "#first-time-guide", label: "New here? Start here" },
    { href: "#beginner-glossary", label: "Plain-English glossary" },
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
      pageTitle="Quick start"
      pageSummary="Start here for a fast, plain-English read of what to do this week, why, and where to dig deeper."
      pageLinks={pageLinks}
      sectionLinks={sectionLinks}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/" />
        ) : null
      }
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

      <WeeklyActionSummaryPanel
        assessment={assessment}
        provenance={treasuryProvenance}
        recordDateLabel={recordDateLabel}
      />

      <RegimeSummaryPanel assessment={assessment} provenance={treasuryProvenance} />

      <RegimeChangeAlertPanel alert={regimeAlert} provenance={treasuryProvenance} />

      <RegimeAlertsPanel />

      <section className="mt-10">
        <RegimeAssessmentCard assessment={assessment} provenance={treasuryProvenance} />
      </section>

      <section className="mt-10">
        <SignalMatrixPanel assessment={assessment} provenance={treasuryProvenance} />
      </section>

      <FirstTimeGuidePanel
        statusLabel={statusLabel}
        recordDateLabel={recordDateLabel}
        fetchedAtLabel={fetchedAtLabel}
      />

      <BeginnerGlossaryPanel />
    </ReportShell>
  );
}
