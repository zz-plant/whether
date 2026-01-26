import type { Metadata } from "next";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { ReportShell } from "../components/reportShell";
import {
  HistoricalBanner,
  MacroSignalsPanel,
  SensorArray,
} from "../components/reportSections";
import { ThresholdsPanel } from "./components/thresholdsPanel";
import { TimeMachinePanel } from "./components/timeMachinePanel";
import { RegimeTimelinePanel } from "./components/regimeTimelinePanel";
import { reportPageLinks } from "../../lib/report/reportNavigation";

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
  const regimeLabels = {
    SCARCITY: "Scarcity",
    DEFENSIVE: "Defensive",
    VOLATILE: "Volatile",
    EXPANSION: "Expansion",
  } as const;
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
  const regimeLabel = regimeLabels[assessment.regime];
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
      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Signal summary
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Scan the drivers before you read the full feed.
            </h2>
          </div>
          <a
            href="#macro-signals"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Jump to macro sources →
          </a>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Regime read
            </p>
            <p className="text-lg font-semibold text-slate-100">{regimeLabel}</p>
            <p className="text-sm text-slate-300">{assessment.description}</p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Score drivers
            </p>
            <div className="flex items-baseline justify-between text-sm text-slate-300">
              <span>Tightness</span>
              <span className="mono text-slate-100">{assessment.scores.tightness}/100</span>
            </div>
            <div className="flex items-baseline justify-between text-sm text-slate-300">
              <span>Risk appetite</span>
              <span className="mono text-slate-100">{assessment.scores.riskAppetite}/100</span>
            </div>
            <p className="text-xs text-slate-400">
              Confirm the base rate and curve slope before you brief leadership.
            </p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Constraint focus
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              {assessment.constraints.slice(0, 3).map((constraint) => (
                <li key={constraint} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Evidence priorities
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Confirm these drivers before you call the regime.
            </h2>
          </div>
          <a
            href="#thresholds"
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Review scoring thresholds →
          </a>
        </div>
        <p className="text-sm text-slate-200">{assessment.description}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Validate live sensor data",
              detail: "Check the latest feeds driving the tightness and risk scores.",
              href: "#sensor-array",
              label: "Open live data feed",
            },
            {
              title: "Cross-check macro sources",
              detail: "Verify the Treasury, CPI, and labor inputs behind the signal stack.",
              href: "#macro-signals",
              label: "Review macro sources",
            },
            {
              title: "Confirm scoring thresholds",
              detail: "Ensure the regime thresholds still map to your risk tolerance.",
              href: "#thresholds",
              label: "See thresholds",
            },
          ].map((item) => (
            <div key={item.title} className="weather-surface flex h-full flex-col gap-3 p-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                <p className="text-sm text-slate-300">{item.detail}</p>
              </div>
              <a
                href={item.href}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {item.label} →
              </a>
            </div>
          ))}
        </div>
      </section>

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
