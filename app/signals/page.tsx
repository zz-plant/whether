import type { Metadata } from "next";
import type { Route } from "next";
import { loadReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import { buildBreadcrumbList, buildPageMetadata, organizationName, websiteName } from "../../lib/seo";
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
  searchParams?: Promise<{ month?: string; year?: string; [key: string]: string | undefined }>;
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
  const focusOptions = [
    { key: "all", label: "All" },
    { key: "inflation", label: "Inflation" },
    { key: "growth", label: "Growth" },
    { key: "labor", label: "Labor" },
    { key: "financial", label: "Financial conditions" },
  ] as const;


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
      ? treasury.fallback_reason ?? "Using cached Treasury snapshot due to upstream outage."
      : "Treasury API responding normally; live signals verified.";
  const trustStatusAction = historicalSelection
    ? "Use historical data to understand trends, not to approve live bets."
    : isFallback
      ? "Hold major decisions until live signals return or you validate the cache."
      : "Signals are live; use them to confirm thresholds and trigger alerts.";
  const trustStatusTone = historicalSelection ? "historical" : isFallback ? "warning" : "stable";
  const requestedFocus = resolvedSearchParams?.focus;
  const activeFocus = focusOptions.some((option) => option.key === requestedFocus)
    ? requestedFocus
    : "all";
  const buildFocusHref = (focus: (typeof focusOptions)[number]["key"]) => {
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
  const showSensorArray = activeFocus === "all" || activeFocus === "labor" || activeFocus === "financial";
  const showMacroPanel = activeFocus === "all" || activeFocus === "inflation" || activeFocus === "growth";
  const showThresholds = activeFocus === "all" || activeFocus === "inflation" || activeFocus === "financial";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const thresholdsHref = showAdvanced && showThresholds ? "#thresholds" : "#advanced-controls";
  const timeMachineHref = showAdvanced ? "#time-machine" : "#advanced-controls";
  const regimeTimelineHref = showAdvanced ? "#regime-timeline" : "#advanced-controls";
  const sectionLinks = [
    { href: "#sensor-array", label: "Live data feed" },
    { href: "#macro-signals", label: "Macro sources" },
    { href: thresholdsHref, label: "How scores are set" },
    { href: timeMachineHref, label: "Time machine" },
    { href: regimeTimelineHref, label: "Regime timeline" },
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
  const evidenceSequence = [
    {
      title: "Review regime timeline",
      detail: "Start with sequence changes to frame current context.",
      href: regimeTimelineHref,
      cta: "Open timeline",
    },
    {
      title: "Check scoring thresholds",
      detail: "Confirm guardrails still match current tolerance.",
      href: thresholdsHref,
      cta: "Open thresholds",
    },
    {
      title: "Inspect live sensor feed",
      detail: "Validate source readings behind the call.",
      href: "#sensor-array",
      cta: "Open sensor feed",
    },
  ];

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
      pageSummaryLink={{ href: regimeTimelineHref, label: "Review evidence scan" }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      primaryCta={{ href: "#sensor-array", label: "Review live feed" }}
      secondaryCta={{ href: thresholdsHref, label: "Review scoring thresholds" }}
      decisionBanner={{
        label: "Explain why",
        decision: `${regimeLabel} regime is supported by current macro readings.`,
        horizon: "Current cycle",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#macro-signals",
      }}
      actionSequence={{
        title: "Evidence scan",
        items: evidenceSequence,
      }}
      decisionDiffs={[
        { label: `Regime: ${regimeLabel}`, tone: "neutral" },
        { label: `Trust: ${trustStatusLabel}`, tone: trustStatusTone === "stable" ? "positive" : "warning" },
      ]}
      nextStep={{
        description: "Convert evidence into an execution posture.",
        href: `${appendSearchParamsToRoute("/operations" as Route, resolvedSearchParams)}#ops-monthly-action-summary`,
      }}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner banner={historicalSelection.banner} liveHref="/signals" />
        ) : null
      }
    >
      <ReturningVisitorDeltaStrip
        assessment={assessment}
        recordDate={treasury.record_date}
        impactLinks={[
          { label: "Tightness", href: regimeTimelineHref, metric: "tightness" },
          { label: "Risk appetite", href: "#macro-signals", metric: "riskAppetite" },
          { label: "Base rate", href: "#sensor-array", metric: "baseRate" },
        ]}
        openPanelHref={timeMachineHref}
      />

      <section className="weather-panel space-y-4 px-6 py-5" aria-label="Suggested scan order">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Where to start</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Use this 3-step quick check.
          </h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            { title: "1. Regime timeline", href: regimeTimelineHref, helper: "Understand sequence shifts first." },
            { title: "2. Key thresholds", href: thresholdsHref, helper: "Confirm guardrails still match risk tolerance." },
            { title: "3. Live sensor feed", href: "#sensor-array", helper: "Validate live readings before decisions." },
          ].map((item) => (
            <li key={item.title} className="weather-surface flex h-full flex-col gap-3 p-4">
              <p className="text-sm font-semibold text-slate-100">{item.title}</p>
              <p className="text-xs text-slate-400">Why this matters: {item.helper}</p>
              <a
                href={item.href}
                className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                Open step
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="weather-panel space-y-4 px-6 py-5" aria-label="Evidence lenses">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Perspective lenses</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Keep one evidence scan sequence, then apply team-specific interpretation.
          </h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            {
              title: "Finance lens",
              detail: "Interpret macro shifts through budget timing, cost of capital, and downside exposure.",
            },
            {
              title: "Product lens",
              detail: "Map signal movement to demand confidence, roadmap sequencing, and customer impact tradeoffs.",
            },
            {
              title: "Engineering lens",
              detail: "Translate evidence into delivery risk, reliability posture, and platform capacity constraints.",
            },
          ].map((lens) => (
            <article key={lens.title} className="weather-surface space-y-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{lens.title}</p>
              <p className="text-sm text-slate-200">{lens.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-5" aria-labelledby="signal-focus-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">View options</p>
            <h2 id="signal-focus-title" className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Choose a focus area, then open extra controls if you want more detail.
            </h2>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {focusOptions.map((option) => {
            const active = option.key === activeFocus;
            return (
              <a
                key={option.key}
                href={buildFocusHref(option.key)}
                aria-current={active ? "page" : undefined}
                className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                  active
                    ? "border-sky-300/80 text-slate-100"
                    : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                {option.label}
              </a>
            );
          })}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              Quick summary
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              See the key drivers before diving into the full feed.
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
            <p className="text-xs text-slate-500">
              Regime = cash tightness + market risk appetite from Treasury signals.
            </p>
            <p className="text-lg font-semibold text-slate-100">{regimeLabel}</p>
            <p className="text-sm text-slate-300">{assessment.description}</p>
            <p className="text-xs text-slate-400">Why this matters: this sets the risk posture for near-term operating bets.</p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Score drivers
            </p>
            <p className="text-xs text-slate-500">
              0–100 gauges: higher tightness = harder funding, higher risk appetite = more risk-on.
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
            <p className="text-xs text-slate-400">Why this matters: these two scores drive whether teams should preserve cash or accelerate.</p>
          </div>
          <div className="weather-surface space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Constraint focus
            </p>
            <p className="text-xs text-slate-500">
              Operating guardrails the leadership team should enforce this cycle.
            </p>
            <ul className="space-y-2 text-sm text-slate-200">
              {assessment.constraints.slice(0, 3).map((constraint) => (
                <li key={constraint} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">Why this matters: clear constraints reduce rework during weekly planning.</p>
          </div>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">
              What to review first
            </p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Check these drivers before finalizing your call.
            </h2>
          </div>
          <a
            href={thresholdsHref}
            className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.16em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Review scoring rules
          </a>
        </div>
        <p className="text-sm text-slate-200">{assessment.description}</p>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Validate live sensor data",
              detail: "Check the latest feeds driving the tightness and risk scores.",
              href: "#sensor-array",
              label: "Review live feed",
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
              href: thresholdsHref,
              label: "Review thresholds",
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
                {item.label}
              </a>
            </div>
          ))}
        </div>
      </section>

      {showSensorArray ? <SensorArray sensors={sensors} provenance={treasuryProvenance} /> : null}

      {showMacroPanel ? <MacroSignalsPanel series={macroSeries} provenance={macroProvenance} /> : null}

      <section className="weather-panel space-y-4 px-6 py-5" id="advanced-controls">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Extra tools</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
              Adjust thresholds and explore the historical timeline.
            </h2>
          </div>
          <a
            href={buildAdvancedHref(!showAdvanced)}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            {showAdvanced ? "Hide advanced" : "Show advanced"}
          </a>
        </div>
      </section>

      {showAdvanced ? (
        <>
          {showThresholds ? (
            <AdvancedThresholdsSection
              currentThresholds={assessment.thresholds}
              provenance={treasuryProvenance}
            />
          ) : null}

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
            description: "Use the scored signals to drive execution moves and decision safeguards.",
          },
          {
            href: "/formulas",
            label: "Methodology",
            description: "Inspect formula definitions and source documentation for each signal.",
          },
          {
            href: "/onboarding",
            label: "Onboarding & glossary",
            description: "Share plain-English definitions with teams new to macro-driven planning.",
          },
        ]}
      />
    </ReportShell>
  );
}
