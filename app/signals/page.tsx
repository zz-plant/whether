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
      ? "Using last verified snapshot"
      : "Live • Treasury verified";
  const trustStatusDetail = historicalSelection
    ? "Viewing archived Treasury data for the selected month."
    : isFallback
      ? (treasury.fallback_reason ??
        "Live refresh pending. Using last verified snapshot.")
      : "Live refresh healthy. Next expected update: 48h.";
  const trustStatusAction = historicalSelection
    ? "Use historical data to understand trends, not to approve live bets."
    : isFallback
      ? "Hold major decisions until live signals return or you validate the cache."
      : "Signals are live with current thresholds and timestamps.";
  const trustStatusTone = historicalSelection
    ? "historical"
    : isFallback
      ? "warning"
      : "stable";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const timeMachineHref = showAdvanced ? "#time-machine" : "#advanced-controls";
  const regimeTimelineHref = showAdvanced ? "#regime-timeline" : "#advanced-controls";
  const focusTabs = ["all", "growth", "inflation", "labor", "financial"] as const;
  type FocusTab = (typeof focusTabs)[number];
  const requestedFocus = resolvedSearchParams?.focus;
  const activeFocus: FocusTab =
    requestedFocus && focusTabs.includes(requestedFocus as FocusTab)
      ? (requestedFocus as FocusTab)
      : "all";
  const sectionLinks = [
    { href: "#current-scores", label: "Current scores" },
    { href: "#thresholds", label: "Thresholds" },
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
  const buildFocusHref = (focus: FocusTab) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "focus") {
          params.set(key, value);
        }
      });
    }
    if (focus !== "all") {
      params.set("focus", focus);
    }
    const query = params.toString();
    return query ? `/signals?${query}` : "/signals";
  };
  const prioritizedSignalsByFocus: Record<FocusTab, Array<{ label: string; why: string; href: string }>> = {
    all: [
      { label: "Tightness", why: "Primary liquidity constraint for near-term execution", href: "#current-scores" },
      { label: "Risk appetite", why: "Market risk-on/off posture changes funding and launch tolerance", href: "#macro-signals" },
      { label: "Curve slope", why: "Forward growth signal to validate regime durability", href: "#sensor-array" },
    ],
    growth: [
      { label: "Curve slope", why: "Best early growth stress read in current framework", href: "#current-scores" },
      { label: "Regime timeline", why: "Compare current growth posture against prior transitions", href: regimeTimelineHref },
      { label: "Macro source series", why: "Validate growth-sensitive inputs directly from sources", href: "#macro-signals" },
    ],
    inflation: [
      { label: "Base rate", why: "Rate level is the strongest inflation pressure proxy in this report", href: "#sensor-array" },
      { label: "Tightness", why: "Liquidity stress compounds inflation pass-through risk", href: "#current-scores" },
      { label: "Threshold logic", why: "Check if inflation-sensitive trigger bands need adjustment", href: "#advanced-controls" },
    ],
    labor: [
      { label: "Risk appetite", why: "Hiring pace risk sits downstream of confidence and market risk", href: "#current-scores" },
      { label: "Regime timeline", why: "Labor plans should align with regime persistence, not one data print", href: regimeTimelineHref },
      { label: "Time machine", why: "Test labor-related planning against prior regime windows", href: timeMachineHref },
    ],
    financial: [
      { label: "Tightness", why: "Funding conditions drive immediate financial operating constraints", href: "#current-scores" },
      { label: "Risk appetite", why: "Credit and valuation tolerance shift with risk-on/off posture", href: "#macro-signals" },
      { label: "Macro source series", why: "Trace inputs before finalizing treasury-sensitive moves", href: "#macro-signals" },
    ],
  };
  const focusLabelByTab: Record<FocusTab, string> = {
    all: "All",
    growth: "Growth",
    inflation: "Inflation",
    labor: "Labor",
    financial: "Financial conditions",
  };
  const priorityQueue = prioritizedSignalsByFocus[activeFocus];
  const essentialPriorityQueue = priorityQueue.slice(0, 2);
  const additionalPriorityQueue = priorityQueue.slice(2);

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
      pageTitle="Signals"
      currentPath="/signals"
      pageSummary="Evidence layer: the drivers, thresholds, and timestamps behind posture."
      pageSummaryLink={{
        href: "#thresholds",
        label: "See thresholds",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#current-scores", label: "View current scores" }}
      decisionBanner={{
        label: "Explain why",
        decision: `${regimeLabel} regime is supported by current macro readings.`,
        horizon: "Current cycle",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#macro-signals",
      }}
      decisionDiffs={[{ label: `Regime: ${regimeLabel}`, tone: "neutral" }]}
      nextStep={{
        description: "Return to the playbook to apply this evidence.",
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

      <section className="weather-panel space-y-4 px-6 py-5" aria-label="Default signal review path">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Default review path</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Start simple, then open advanced controls only when needed.
          </h2>
        </header>
        <div className="grid gap-2 sm:grid-cols-5">
          {focusTabs.map((focus) => {
            const isActive = focus === activeFocus;
            return (
              <a
                key={focus}
                href={buildFocusHref(focus)}
                aria-current={isActive ? "page" : undefined}
                className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
                  isActive
                    ? "border-sky-300/80 text-slate-100"
                    : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                {focusLabelByTab[focus]}
              </a>
            );
          })}
        </div>
        <ol className="grid gap-3 md:grid-cols-2" aria-label="Prioritized signal queue">
          {essentialPriorityQueue.map((item, index) => (
            <li key={item.label} className="weather-surface space-y-2 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Priority {index + 1}</p>
              <p className="text-sm font-semibold text-slate-100">{item.label}</p>
              <p className="text-xs text-slate-300">{item.why}</p>
              <a
                href={item.href}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
              >
                Open {item.label.toLowerCase()} →
              </a>
            </li>
          ))}
        </ol>
        {additionalPriorityQueue.length ? (
          <details className="weather-surface group p-4">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold tracking-[0.14em] text-slate-200">
              <span>Show full priority queue</span>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/70 text-slate-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ol className="mt-3 grid gap-3" aria-label="Additional prioritized signal queue">
              {additionalPriorityQueue.map((item, index) => (
                <li key={item.label} className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Priority {index + essentialPriorityQueue.length + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.why}</p>
                  <a
                    href={item.href}
                    className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    Open {item.label.toLowerCase()} →
                  </a>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>

      <section id="current-scores" className="weather-panel space-y-4 px-6 py-5">
        <header>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
            Current scores
          </p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Tightness, risk appetite, and curve slope at a glance.
          </h2>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          <article className="weather-surface space-y-2 p-4">
            <dl>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tightness</dt>
              <dd className="mono mt-2 text-2xl text-slate-100">{assessment.scores.tightness}/100</dd>
            </dl>
            <p className="text-xs font-semibold text-slate-300">
              Threshold: {assessment.thresholds.tightnessRegime}/100
            </p>
            <p className="text-xs text-slate-500">Higher values indicate tighter funding conditions.</p>
          </article>
          <article className="weather-surface space-y-2 p-4">
            <dl>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Risk appetite</dt>
              <dd className="mono mt-2 text-2xl text-slate-100">{assessment.scores.riskAppetite}/100</dd>
            </dl>
            <p className="text-xs font-semibold text-slate-300">
              Threshold: {assessment.thresholds.riskAppetiteRegime}/100
            </p>
            <p className="text-xs text-slate-500">Higher values indicate more risk-on market behavior.</p>
          </article>
          <article className="weather-surface space-y-2 p-4">
            <dl>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Curve slope</dt>
              <dd className="mono mt-2 text-2xl text-slate-100">{assessment.scores.curveSlope === null ? "N/A" : `${assessment.scores.curveSlope.toFixed(2)}%`}</dd>
            </dl>
            <p className="text-xs font-semibold text-slate-300">Threshold: 0.00% (inversion boundary)</p>
            <p className="text-xs text-slate-500">10Y minus 2Y Treasury yield spread.</p>
          </article>
        </div>
      </section>

      <SensorArray sensors={sensors} provenance={treasuryProvenance} />

      <MacroSignalsPanel series={macroSeries} provenance={macroProvenance} />

      <section className="weather-panel space-y-4 px-6 py-5" id="advanced-controls">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
          <div className="flex min-h-[44px] items-center justify-between gap-3 text-sm font-semibold text-slate-100">
            <span>Advanced filters and historical tools</span>
            <span className="text-xs tracking-[0.14em] text-slate-300">
              {showAdvanced ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-300">
            Use these controls for threshold tuning, historical snapshots, and timeline diagnostics after you complete the default review path.
            This toggle keeps you on the signal evidence page.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={buildAdvancedHref(!showAdvanced)}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
            >
              {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
            </a>
          </div>
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
            href: "/methodology",
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
