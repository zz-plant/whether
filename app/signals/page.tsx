import type { Metadata } from "next";
import { loadReportData } from "../../lib/reportData";
import { ReportShell } from "../components/reportShell";
import {
  HistoricalBanner,
  MacroSignalsPanel,
  SensorArray,
} from "../components/reportSections";
import { ThresholdsPanel } from "../components/thresholdsPanel";
import { TimeMachinePanel } from "../components/timeMachinePanel";

export const metadata: Metadata = {
  title: "Whether Report — Signals & thresholds",
  description:
    "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
};

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: { month?: string; year?: string; [key: string]: string | undefined };
}) {
  const pageLinks = [
    {
      href: "/",
      label: "Overview",
      description: "Executive snapshot, market climate posture, and the high-level read.",
    },
    {
      href: "/signals",
      label: "Signals & thresholds",
      description: "Live sensor detail, macro inputs, and historical time machine coverage.",
    },
    {
      href: "/operations",
      label: "Operations playbook",
      description: "Action guidance, decision shields, and export-ready briefs.",
    },
  ];
  const sectionLinks = [
    { href: "#sensor-array", label: "Sensor array" },
    { href: "#macro-signals", label: "Macro signals" },
    { href: "#thresholds", label: "Thresholds" },
    { href: "#time-machine", label: "Time machine" },
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
    selectedMonth,
    selectedYear,
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
      pageTitle="Signals & thresholds"
      pageSummary="Deep-dive into the live signal layer, the macro data sources, and how thresholds are shaping the market climate classification."
      pageLinks={pageLinks}
      sectionLinks={sectionLinks}
      historicalBanner={
        historicalSelection ? <HistoricalBanner banner={historicalSelection.banner} /> : null
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
        historicalRegime={historicalSelection ? assessment.regime : null}
        historicalSummary={historicalSelection ? assessment.description : null}
        comparison={historicalComparison}
      />
    </ReportShell>
  );
}
