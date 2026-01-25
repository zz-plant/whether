import type { Metadata } from "next";
import { loadReportData } from "../../lib/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { ReportShell } from "../components/reportShell";
import {
  HistoricalBanner,
  MacroSignalsPanel,
  SensorArray,
} from "../components/reportSections";
import { ThresholdsPanel } from "../components/thresholdsPanel";
import { TimeMachinePanel } from "../components/timeMachinePanel";
import { RegimeTimelinePanel } from "../components/regimeTimelinePanel";
import { reportPageLinks } from "../../lib/reportNavigation";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Whether Report — Why we believe this",
  description:
    "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
};

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Whether Report — Why we believe this",
    url: `${siteUrl}/signals`,
    description:
      "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
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
    { href: "#sensor-array", label: "Live data feed" },
    { href: "#macro-signals", label: "Macro sources" },
    { href: "#thresholds", label: "How scores are set" },
    { href: "#time-machine", label: "Time machine" },
    { href: "#regime-timeline", label: "Regime timeline" },
  ];

  const {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    historicalComparison,
    historicalSelection,
    invalidHistoricalSelection,
    macroProvenance,
    macroSeries,
    recordDateLabel,
    regimeSeries,
    selectedMonth,
    selectedYear,
    sensors,
    statusLabel,
    summaryArchive,
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
    ? "Use historical data to understand trends, not to approve live bets."
    : isFallback
      ? "Hold major decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm thresholds and trigger alerts.";
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
      pageTitle="Why we believe this"
      pageSummary="See what’s powering the regime call and how the signals line up."
      pageSummaryLink={{ href: "#sensor-array", label: "Explore details →" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#sensor-array", label: "Review live data feed" }}
      secondaryCta={{ href: "#thresholds", label: "Check scoring thresholds" }}
      structuredData={JSON.stringify(structuredData)}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/signals" />
        ) : null
      }
    >
      <SensorArray sensors={sensors} provenance={treasuryProvenance} />

      <MacroSignalsPanel series={macroSeries} provenance={macroProvenance} />

      <ThresholdsPanel currentThresholds={assessment.thresholds} provenance={treasuryProvenance} />

      <TimeMachinePanel
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        isHistorical={Boolean(historicalSelection)}
        latestRecordDate={treasury.record_date}
        cacheCoverage={cacheCoverage}
        monthsByYear={cacheMonthsByYear}
        invalidSelection={invalidHistoricalSelection}
        provenance={treasuryProvenance}
        summaryArchive={summaryArchive}
        historicalRegime={historicalSelection ? assessment.regime : null}
        historicalSummary={historicalSelection ? assessment.description : null}
        comparison={historicalComparison}
      />

      <RegimeTimelinePanel
        series={regimeSeries}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        searchParams={searchParams}
      />
    </ReportShell>
  );
}
