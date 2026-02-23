import type { Metadata } from "next";
import type { Route } from "next";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildBreadcrumbList,
  buildPageMetadata,
  organizationName,
  websiteName,
} from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { RelatedReportLinks } from "../components/relatedReportLinks";
import {
  HistoricalBanner,
  MacroSignalsPanel,
  SensorArray,
} from "../components/reportSections";
import { AdvancedThresholdsSection } from "./components/advancedThresholdsSection";
import { TimeMachinePanel } from "./components/timeMachinePanel";
import { RegimeTimelinePanel } from "./components/regimeTimelinePanel";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { appendSearchParamsToRoute } from "../../lib/navigation/routeSearchParams";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";

export const runtime = "edge";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Signal evidence",
  description:
    "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
  path: "/signals",
  imageAlt: "Whether Report signal evidence overview",
});

export default async function SignalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const regimeLabels = {
    SCARCITY: "Scarcity",
    DEFENSIVE: "Defensive",
    VOLATILE: "Volatile",
    EXPANSION: "Expansion",
  } as const;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/signals#webpage`,
        name: "Whether Report — Signal evidence",
        url: `${siteUrl}/signals`,
        description:
          "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          name: websiteName,
          url: siteUrl,
        },
        publisher: {
          "@type": "Organization",
          name: organizationName,
        },
        mainEntity: {
          "@type": "Dataset",
          name: "Macro signal evidence feed",
        },
      },
      buildBreadcrumbList([
        { name: "Weekly briefing", path: "/" },
        { name: "Signal evidence", path: "/signals" },
      ]),
    ],
  };
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
  } = await loadReportData(resolvedSearchParams);
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
      ? (treasury.fallback_reason ??
        "Using cached Treasury snapshot due to upstream outage.")
      : "Treasury live feed verified for this cycle.";
  const trustStatusAction = historicalSelection
    ? "Use historical data to understand trends, not to approve live bets."
    : isFallback
      ? "Hold major decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm thresholds and trigger alerts.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const timeMachineHref = showAdvanced ? "#time-machine" : "#advanced-controls";
  const regimeTimelineHref = showAdvanced ? "#regime-timeline" : "#advanced-controls";
  const sectionLinks = [
    { href: "#current-scores", label: "Current scores" },
    { href: "#source-links", label: "Source links" },
    { href: "#advanced-controls", label: "See full methodology" },
  ];
  const buildAdvancedHref = (advanced: boolean) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "advanced") {
          params.set(key, value);
        }
      });
    }
    if (advanced) {
      params.set("advanced", "1");
    }
    const query = params.toString();
    return query ? `/signals?${query}` : "/signals";
  };

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
      pageTitle="Signal evidence"
      currentPath="/signals"
      pageSummary="See the sources and scoring behind the regime call."
      pageSummaryLink={{
        href: "#advanced-controls",
        label: "See full methodology",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#current-scores", label: "View current scores" }}
      secondaryCta={{
        href: "#source-links",
        label: "Open source links",
      }}
      decisionBanner={{
        label: "Explain why",
        decision: `${regimeLabel} regime is supported by current macro readings.`,
        horizon: "Current cycle",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#macro-signals",
      }}
      decisionDiffs={[
        { label: `Regime: ${regimeLabel}`, tone: "neutral" },
        {
          label: `Trust: ${trustStatusLabel}`,
          tone: trustStatusTone === "stable" ? "positive" : "warning",
        },
      ]}
      nextStep={{
        description: "Convert evidence into an execution posture.",
        href: `${appendSearchParamsToRoute("/operations" as Route, resolvedSearchParams)}#ops-monthly-action-summary`,
      }}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/signals"
          />
        ) : null
      }
    >
      <ReturningVisitorDeltaStrip
        assessment={assessment}
        recordDate={treasury.record_date}
        impactLinks={[
          { label: "Tightness", href: regimeTimelineHref, metric: "tightness" },
          {
            label: "Risk appetite",
            href: "#macro-signals",
            metric: "riskAppetite",
          },
          { label: "Base rate", href: "#sensor-array", metric: "baseRate" },
        ]}
        openPanelHref={timeMachineHref}
      />

      <section id="current-scores" className="weather-panel space-y-4 px-6 py-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Current scores
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Tightness, risk appetite, and curve slope at a glance.
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tightness</p>
            <p className="mono text-2xl text-slate-100">{assessment.scores.tightness}/100</p>
            <p className="text-xs text-slate-500">Higher values indicate tighter funding conditions.</p>
          </article>
          <article className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Risk appetite</p>
            <p className="mono text-2xl text-slate-100">{assessment.scores.riskAppetite}/100</p>
            <p className="text-xs text-slate-500">Higher values indicate more risk-on market behavior.</p>
          </article>
          <article className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Curve slope</p>
            <p className="mono text-2xl text-slate-100">{assessment.scores.curveSlope === null ? "N/A" : `${assessment.scores.curveSlope.toFixed(2)}%`}</p>
            <p className="text-xs text-slate-500">10Y minus 2Y Treasury yield spread.</p>
          </article>
        </div>
      </section>

      <section id="source-links" className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Source links</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Open the live feeds behind the current call.
            </h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <a
            href="#sensor-array"
            className="weather-surface inline-flex min-h-[44px] items-center justify-between gap-3 p-4 text-sm text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            <span>Live sensor array</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#macro-signals"
            className="weather-surface inline-flex min-h-[44px] items-center justify-between gap-3 p-4 text-sm text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100"
          >
            <span>Macro source series</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <SensorArray sensors={sensors} provenance={treasuryProvenance} />

      <MacroSignalsPanel series={macroSeries} provenance={macroProvenance} />

      <section
        className="weather-panel space-y-4 px-6 py-5"
        id="advanced-controls"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Methodology
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              See full methodology.
            </h2>
          </div>
          <a
            href={buildAdvancedHref(!showAdvanced)}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            {showAdvanced ? "Hide methodology" : "See full methodology"}
          </a>
        </div>
      </section>

      {showAdvanced ? (
        <>
          <AdvancedThresholdsSection
            currentThresholds={assessment.thresholds}
            provenance={treasuryProvenance}
          />

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
            historicalSummary={
              historicalSelection ? assessment.description : null
            }
            comparison={historicalComparison}
          />

          <RegimeTimelinePanel
            series={regimeSeries}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            searchParams={resolvedSearchParams}
          />
        </>
      ) : null}

      <RelatedReportLinks
        title="Related report pages"
        links={[
          {
            href: "/operations",
            label: "Action playbook",
            description:
              "Use the scored signals to drive execution moves and decision safeguards.",
          },
          {
            href: "/formulas",
            label: "Methodology",
            description:
              "Inspect formula definitions and source documentation for each signal.",
          },
          {
            href: "/onboarding",
            label: "Onboarding & glossary",
            description:
              "Share plain-English definitions with teams new to macro-driven planning.",
          },
        ]}
      />
    </ReportShell>
  );
}
