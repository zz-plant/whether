import type { Metadata } from "next";
import { loadReportDataSafe } from "../../lib/report/reportData";
import { getSummaryArchive } from "../../lib/summary/summaryArchive";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../../lib/timeMachine/timeMachineSelection";
import {
  buildBreadcrumbList,
  buildPageMetadata,
  organizationName,
  websiteName,
} from "../../lib/seo";
import { ReportShell } from "../components/reportShell";
import { RelatedReportLinks } from "../components/relatedReportLinks";
import { HistoricalBanner } from "../components/boardBriefSections";
import { AdvancedThresholdsSection } from "./components/advancedThresholdsSection";
import { TimeMachinePanel } from "./components/timeMachinePanel";
import { RegimeTimelinePanel } from "./components/regimeTimelinePanel";
import { SignalVisualizationSuite } from "./components/signalVisualizationSuite";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { SIGNALS_RELATED_LINKS } from "../../lib/report/reportCopy";
import { indicatorTypeByScoreLabel, indicatorTypeLabel } from "../../lib/indicatorClassification";
import { HistoricalReplayDatePicker } from "./components/historicalReplayDatePicker";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { REGIME_LABELS } from "../../lib/regimePresentation";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Signal evidence",
  description:
    "Evidence appendix: macro signals, thresholds, and historical context supporting the weekly posture brief.",
  path: "/signals",
  imageAlt: "Whether Report signal evidence overview",
  imageParams: {
    template: "signals",
    eyebrow: "Signal evidence",
    title: "Macro signals and threshold context",
    subtitle:
      "Inspect drivers, confidence, and historical context before changing operating posture.",
    kicker: "Built for evidence-first planning.",
  },
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/signals#webpage`,
        name: "Whether Report — Signal evidence",
        url: `${siteUrl}/signals`,
        description:
          "Evidence appendix: macro signals, thresholds, and historical context supporting the weekly posture brief.",
        inLanguage: "en",
        isPartOf: {
          "@type": "WebSite",
          name: websiteName,
          url: siteUrl,
        },
        publisher: {
          "@id": `${siteUrl}#organization`,
        },
        mainEntity: {
          "@type": "Dataset",
          name: "Macro signal evidence feed",
          description:
            "Macro signal dataset for Whether, including thresholds, sensor readings, and regime evidence used for decision support.",
          creator: {
            "@id": `${siteUrl}#organization`,
          },
          license: `${siteUrl}/terms-of-service`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: organizationName,
        url: siteUrl,
      },
      buildBreadcrumbList(
        createBreadcrumbTrail([
          { path: "/" },
          { path: "/signals" },
        ]),
      ),
    ],
  };
  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/signals" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
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
    yieldCurveSeries,
    selectedMonth,
    selectedYear,
    sensors,
    startItems,
    statusLabel,
    stopItems,
    treasury,
    treasuryProvenance,
  } = reportData;
  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/signals", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = historicalSelection
    ? buildTimeMachineHref("/signals?advanced=1#time-machine", historicalSelection)
    : "/signals?advanced=1#time-machine";
  const summaryArchive = getSummaryArchive();
  const regimeLabel = REGIME_LABELS[assessment.regime];
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const {
    trustStatusLabel,
    trustStatusDetail,
    trustStatusAction,
    trustStatusTone,
  } = buildTrustStatus({
    historicalSelection: Boolean(historicalSelection),
    isFallback,
    fallbackReason: treasury.fallback_reason ?? undefined,
    historicalAction:
      "Use historical data to understand trends, not to approve live bets.",
    fallbackAction:
      "Hold major decisions until live signals return or you validate the cache.",
    stableAction: "Signals are live with current thresholds and timestamps.",
  });
  const nextRefreshLabel = historicalSelection
    ? "Fixed historical snapshot"
    : "15m cadence";
  const decisionDeltaLabel = historicalSelection
    ? "Historical snapshot for review only — switch to live data before approving new bets."
    : isFallback
      ? "Live update delayed — avoid irreversible decisions until signals refresh."
      : "Decision check: use these deltas to confirm this week's call or revise it now.";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const showFullDiagnostics = resolvedSearchParams?.diagnostics === "all";
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
    { href: "#decision-summary", label: "Decision summary" },
    { href: "#evidence-priorities", label: "Evidence priorities" },
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

  const buildDiagnosticsHref = (showAll: boolean) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "diagnostics") {
          params.set(key, value);
        }
      });
    }
    if (showAll) {
      params.set("diagnostics", "all");
    }
    const query = params.toString();
    return query ? `/signals?${query}#signal-diagnostics` : "/signals#signal-diagnostics";
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
      { label: "Risk appetite", why: "Capital posture changes funding and launch tolerance", href: "#current-scores" },
      { label: "Curve slope", why: "Forward growth signal to validate regime durability", href: "#current-scores" },
    ],
    growth: [
      { label: "Curve slope", why: "Best early growth stress read in current framework", href: "#current-scores" },
      { label: "Regime timeline", why: "Compare current growth posture against prior transitions", href: regimeTimelineHref },
      { label: "Macro source series", why: "Validate growth-sensitive inputs directly from sources", href: "#current-scores" },
    ],
    inflation: [
      { label: "Base rate", why: "Rate level is the strongest inflation pressure proxy in this report", href: "#current-scores" },
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
      { label: "Risk appetite", why: "Credit and valuation tolerance shift with capital-posture shifts", href: "#current-scores" },
      { label: "Macro source series", why: "Trace inputs before finalizing treasury-sensitive moves", href: "#current-scores" },
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
  const topDiagnosticCallouts = priorityQueue.slice(0, 3);
  const scoreCards: Array<{
    label: keyof typeof indicatorTypeByScoreLabel;
    value: string;
    threshold: string;
    description: string;
    href: string;
  }> = [
    {
      label: "Tightness",
      value: `${assessment.scores.tightness}/100`,
      threshold: `${assessment.thresholds.tightnessRegime}/100`,
      description: "Higher values indicate tighter funding conditions.",
      href: "#current-scores",
    },
    {
      label: "Risk appetite",
      value: `${assessment.scores.riskAppetite}/100`,
      threshold: `${assessment.thresholds.riskAppetiteRegime}/100`,
      description: "Higher values indicate more risk-on market behavior.",
      href: "#current-scores",
    },
    {
      label: "Curve slope",
      value:
        assessment.scores.curveSlope === null
          ? "N/A"
          : `${assessment.scores.curveSlope.toFixed(2)}%`,
      threshold: "0.00%",
      description: "10Y minus 2Y Treasury yield spread.",
      href: "#current-scores",
    },
  ];

  const scoreCardsByType = {
    leading: scoreCards.filter((card) => indicatorTypeByScoreLabel[card.label] === "leading"),
    lagging: scoreCards.filter((card) => indicatorTypeByScoreLabel[card.label] === "lagging"),
  } as const;

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
      pageSummary="Evidence and raw diagnostics only: drivers, thresholds, and timestamps behind posture."
      pageSummaryLink={{
        href: "#thresholds",
        label: "See thresholds",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      showPageNavigation={true}
      primaryCta={{ href: "#current-scores", label: "Review evidence" }}
      nextStep={{
        href: "/operations",
        description: "Apply this posture in Operations",
      }}
      decisionBanner={{
        label: "Decision",
        decision: `${regimeLabel} regime matches the current macro diagnostics.`,
        horizon: "Current cycle",
        confidence: trustStatusLabel,
        effectiveDate: recordDateLabel,
        evidenceHref: "#current-scores",
      }}
      decisionDiffs={[{ label: `Regime: ${regimeLabel}`, tone: "neutral" }]}
      structuredData={structuredData}
      historicalBanner={
        historicalSelection ? (
          <HistoricalBanner
            banner={historicalSelection.banner}
            liveHref="/signals"
            previousHref={previousHistoricalHref}
            timeMachineHref={historicalTimeMachineHref}
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
            href: "#current-scores",
            metric: "riskAppetite",
          },
          { label: "Base rate", href: "#current-scores", metric: "baseRate" },
        ]}
        openPanelHref={timeMachineHref}
      />

      <section id="decision-summary" className="weather-panel space-y-6 px-6 py-5" aria-label="Decision summary">
        <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
          {decisionDeltaLabel}
        </p>
        <div className="weather-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Posture</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{regimeLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Updated</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{fetchedAtLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Next refresh</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{nextRefreshLabel}</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <article className="weather-surface space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Current posture</p>
            <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
              {regimeLabel} regime is the active operating posture.
            </h2>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
              Start with the decision delta below, then use diagnostics and thresholds to validate
              the call before changing operating posture.
            </p>
            <dl className="grid gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Recommended action</dt>
                <dd className="mt-1 text-xs text-slate-100">
                  Keep posture aligned with the highest-priority start and stop rules listed in the founder playbook.
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Impact if wrong</dt>
                <dd className="mt-1 text-xs text-slate-100">Execution pacing can drift if liquidity conditions shift before the next review.</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">Next checkpoint</dt>
                <dd className="mt-1 text-xs text-slate-100">Re-check after the next data refresh and threshold confirmation.</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="#current-scores"
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
              >
                Review raw evidence
              </a>
              <a
                href="#thresholds"
                className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
              >
                Inspect threshold logic
              </a>
            </div>
          </article>
          <article className="weather-surface space-y-3 p-5" aria-label="Founder decision playbook">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Founder operating moves</p>
            <h3 className="text-lg font-semibold text-slate-100">Convert {regimeLabel} into execution rules this week</h3>
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Start now</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Start rules">
                {startItems.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200">Avoid now</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100" aria-label="Stop rules">
                {stopItems.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-slate-300">
              Model shorthand: Posture = f(risk appetite, funding tightness, yield-curve slope).
            </p>
          </article>
          <article className="weather-surface space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Top 3 movers</p>
            <ul className="space-y-3" aria-label="Top mover callouts">
              {topDiagnosticCallouts.map((item, index) => (
                <li key={item.label} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">Mover {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-200">{item.why}</p>
                  <a
                    href={item.href}
                    className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    Open {item.label.toLowerCase()} →
                  </a>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="historical-replay" className="weather-panel space-y-4 px-6 py-5">
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">Historical regime replay</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Pick any date to replay the mandate card context.
          </h2>
          <p className="text-sm text-slate-300">
            We snap your selection to the closest available monthly snapshot and label the replay timestamp.
          </p>
        </header>
        <HistoricalReplayDatePicker initialDate={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`} />
      </section>

      <section id="current-scores" className="weather-panel space-y-4 px-6 py-5">
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">Current scores</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Real-time scorecard for the three regime drivers.
          </h2>
        </header>
        <div className="space-y-4">
          {(["leading", "lagging"] as const).map((type) => (
            <section key={type} className="space-y-2">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-slate-300">{indicatorTypeLabel[type]}</h3>
              <div className="grid gap-3 lg:grid-cols-3">
                {scoreCardsByType[type].map((card) => (
                  <article key={card.label} className="weather-surface space-y-3 p-4">
                    <dl>
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{card.label}</dt>
                      <dd className="mono mt-2 text-3xl leading-none text-slate-100">{card.value}</dd>
                    </dl>
                    <p className="text-sm font-semibold text-slate-200">Threshold: {card.threshold}</p>
                    <p className="text-sm text-slate-300">{card.description}</p>
                    <a
                      href={card.href}
                      className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                      Open source signals →
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section id="evidence-priorities" className="weather-panel space-y-4 px-6 py-5" aria-label="Signal diagnostics queue">
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-300">Evidence priorities</p>
          <h2 className="text-xl font-semibold text-slate-100 sm:text-2xl">
            Prioritized diagnostics by focus area.
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
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">Priority {index + 1}</p>
              <p className="text-sm font-semibold text-slate-100">{item.label}</p>
              <p className="text-sm text-slate-200">{item.why}</p>
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
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">Priority {index + essentialPriorityQueue.length + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-200">{item.why}</p>
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

      <section id="signal-diagnostics" className="weather-panel space-y-4 px-6 py-5" aria-label="Signal diagnostics">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Diagnostics</p>
            <h2 className="text-xl font-semibold text-slate-100">
              {showFullDiagnostics ? "Full diagnostics" : "Top drivers"}
            </h2>
            <p className="text-sm text-slate-300">
              {showFullDiagnostics
                ? "Showing the full diagnostic set for deep validation and audits."
                : "Start with the top 3 drivers. Expand only when you need full diagnostic depth."}
            </p>
          </div>
          <a
            href={buildDiagnosticsHref(!showFullDiagnostics)}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            {showFullDiagnostics ? "Show top 3 only" : "Show full diagnostics"}
          </a>
        </div>

        {!showFullDiagnostics ? (
          <ol className="grid gap-3 md:grid-cols-3" aria-label="Top 3 signal drivers">
            {topDiagnosticCallouts.map((item, index) => (
              <li key={item.label} className="weather-surface space-y-2 p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-300">Driver {index + 1}</p>
                <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                <p className="text-sm text-slate-200">{item.why}</p>
                <a
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                >
                  Open {item.label.toLowerCase()} →
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <SignalVisualizationSuite
            treasury={treasury}
            yieldCurveSeries={yieldCurveSeries}
          />
        )}
      </section>

      <section className="weather-panel space-y-4 px-6 py-5" id="advanced-controls">
        <div className="grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-slate-100">
              <span>Advanced filters and historical tools</span>
              <span className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs tracking-[0.14em] text-slate-200">
                {showAdvanced ? "Open" : "Closed"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">
              Use advanced controls when you need threshold tuning, historical snapshots, or regime
              timeline diagnostics. Keep this closed for the default executive scan.
            </p>
          </div>
          <a
            href={buildAdvancedHref(!showAdvanced)}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
          >
            {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
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
        title="Need more context?"
        links={SIGNALS_RELATED_LINKS}
        variant="compact"
      />
    </ReportShell>
  );
}
