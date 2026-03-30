import type { Metadata } from "next";
import { loadReportDataSafe } from "../../lib/report/reportData";
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
import { HistoricalBanner } from "../components/historicalBanner";
import { reportPageLinks } from "../../lib/report/reportNavigation";
import { ReturningVisitorDeltaStrip } from "../components/changeSinceLastReadPanel";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { SIGNALS_RELATED_LINKS } from "../../lib/report/reportCopy";
import { indicatorTypeByScoreLabel, indicatorTypeLabel } from "../../lib/indicatorClassification";
import { HistoricalReplayDatePicker } from "./components/historicalReplayDatePicker";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { signalsScrollPlan } from "../../lib/navigation/scrollPlans";
import { PageFlowNav } from "../components/pageFlowNav";
import { PersistedAssistPanel } from "../components/literacyAssistControls";
import { OperatorWorkflowRouteTracker } from "../components/operatorWorkflowRouteTracker";
import { shouldSplitDecisionConditionRows } from "../../lib/report/reportFormatting";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Evidence",
  description:
    "Evidence appendix for the weekly brief: drivers, thresholds, timestamps, and historical replay.",
  path: "/signals",
  imageAlt: "Whether Report evidence overview",
  imagePath: "/social/signals.svg",
});

export function buildDiagnosticsExpansionHref(
  searchParams: Record<string, string | undefined> | undefined,
  showAll: boolean,
) {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
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
}

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
        name: "Whether Report — Evidence",
        url: `${siteUrl}/signals`,
        description:
          "Evidence appendix for the weekly brief: drivers, thresholds, timestamps, and historical replay.",
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
    actionNowShort,
    guardrailThreshold,
    flipThreshold,
    treasury,
    treasuryProvenance,
  } = reportData;
  const previousHistoricalSelection = historicalSelection
    ? getAdjacentTimeMachineRequest(historicalSelection, "previous")
    : null;
  const previousHistoricalHref = previousHistoricalSelection
    ? buildTimeMachineHref("/signals", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/signals?advanced=1#time-machine";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const showFullDiagnostics = resolvedSearchParams?.diagnostics === "all";
  const [summaryArchive, signalDiagnostics, advancedPanels] = await Promise.all([
    showAdvanced
      ? import("../../lib/summary/summaryArchive").then((module) => module.getSummaryArchive())
      : Promise.resolve(null),
    showFullDiagnostics
      ? import("./components/signalVisualizationSuite").then((module) => module.SignalVisualizationSuite)
      : Promise.resolve(null),
    showAdvanced
      ? Promise.all([
          import("./components/advancedThresholdsSection").then((module) => module.AdvancedThresholdsSection),
          import("./components/timeMachinePanel").then((module) => module.TimeMachinePanel),
          import("./components/regimeTimelinePanel").then((module) => module.RegimeTimelinePanel),
        ])
      : Promise.resolve(null),
  ]);
  const AdvancedThresholdsSection = advancedPanels?.[0] ?? null;
  const TimeMachinePanel = advancedPanels?.[1] ?? null;
  const RegimeTimelinePanel = advancedPanels?.[2] ?? null;
  const SignalVisualizationSuite = signalDiagnostics;
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
    stableAction: "Evidence is live with current thresholds and timestamps.",
  });
  const nextRefreshLabel = historicalSelection
    ? "Fixed historical snapshot"
    : "15m cadence";
  const decisionDeltaLabel = historicalSelection
    ? "Historical snapshot for review only — switch to live data before approving new bets."
    : isFallback
      ? "Live update delayed — avoid irreversible decisions until signals refresh."
      : "Use this evidence to confirm this week's call or change it now.";
  const triggerCondition = guardrailThreshold?.trim().length ? guardrailThreshold : "Pause if thresholds weaken.";
  const reversalCondition = flipThreshold?.trim().length ? flipThreshold : "Resume once reversal thresholds recover.";
  const showMicroDecisionRows = shouldSplitDecisionConditionRows({
    trigger: triggerCondition,
    reversal: reversalCondition,
  });
  const timeMachineHref = showAdvanced ? "#time-machine" : "#advanced-controls";
  const regimeTimelineHref = showAdvanced ? "#regime-timeline" : "#advanced-controls";
  const focusTabs = ["all", "growth", "inflation", "labor", "financial"] as const;
  type FocusTab = (typeof focusTabs)[number];
  type SignalsView = "implication" | "detail";
  const requestedFocus = resolvedSearchParams?.focus;
  const activeSignalsView: SignalsView = resolvedSearchParams?.signalsView === "detail" ? "detail" : "implication";
  const activeFocus: FocusTab =
    requestedFocus && focusTabs.includes(requestedFocus as FocusTab)
      ? (requestedFocus as FocusTab)
      : "all";
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
  const buildSignalsViewHref = (view: SignalsView) => {
    const params = new URLSearchParams();
    if (resolvedSearchParams) {
      Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (value && key !== "signalsView") {
          params.set(key, value);
        }
      });
    }
    if (view === "detail") {
      params.set("signalsView", "detail");
    }
    const query = params.toString();
    return query ? `/signals?${query}` : "/signals";
  };
  const sectionLinks =
    activeSignalsView === "detail"
      ? [
          { href: "#decision-summary", label: "Decision summary" },
          { href: "#evidence-priorities", label: "Evidence priorities" },
          { href: "#current-scores", label: "Current scores" },
          { href: "#advanced-controls", label: "Advanced controls" },
        ]
      : [
          { href: "#decision-summary", label: "What this means now" },
          { href: "#current-scores", label: "Current scores" },
        ];
  const prioritizedSignalsByFocus: Record<FocusTab, Array<{ label: string; why: string; href: string }>> = {
    all: [
      { label: "Tightness", why: "How hard current conditions make new long-payback commitments", href: "#current-scores" },
      { label: "Risk appetite", why: "How willing markets are to fund risk and faster expansion", href: "#current-scores" },
      { label: "Curve slope", why: "Early growth signal for whether this posture is likely to hold", href: "#current-scores" },
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
      description: "Higher values mean market conditions are less forgiving for new long-payback bets.",
      href: "#current-scores",
    },
    {
      label: "Risk appetite",
      value: `${assessment.scores.riskAppetite}/100`,
      threshold: `${assessment.thresholds.riskAppetiteRegime}/100`,
      description: "Higher values mean markets are acting more willing to fund risk.",
      href: "#current-scores",
    },
    {
      label: "Curve slope",
      value:
        assessment.scores.curveSlope === null
          ? "N/A"
          : `${assessment.scores.curveSlope.toFixed(2)}%`,
      threshold: "0.00%",
      description: "10Y minus 2Y Treasury yield spread, used here as a forward-looking growth read.",
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
      pageTitle="Evidence"
      currentPath="/signals"
      pageSummary="See what changed underneath the weekly call: drivers, thresholds, freshness, and replay."
      pageSummaryLink={{
        href: activeSignalsView === "detail" ? "#evidence-priorities" : "#decision-summary",
        label: activeSignalsView === "detail" ? "Open evidence path ↓" : "Open implication summary ↓",
      }}
      pageLinks={reportPageLinks}
      sectionLinks={sectionLinks}
      heroVariant="compact"
      pageNavVariant="compact"
      headerVariant="evidence"
      showPageNavigation={true}
      primaryCta={{ href: "/", label: "Return to Weekly Brief" }}
      secondaryCta={{ href: "#current-scores", label: "Open evidence appendix" }}
      nextStep={{
        href: "/",
        description: "Return to Weekly Brief once the evidence check is complete",
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
      commandBar={{
        regime: assessment.regime,
        call: `${regimeLabel} posture remains active while signal thresholds hold.`,
        doNow: [
          actionNowShort,
          startItems[0] ?? "Prioritize the highest-confidence start rule before changing posture.",
        ],
        flipConditions: [
          flipThreshold,
          stopItems[0] ?? "Pause irreversible commitments if confidence degrades.",
        ],
        updatedAt: fetchedAtLabel,
      }}
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
      <OperatorWorkflowRouteTracker />
      <PageFlowNav
        eyebrow={signalsScrollPlan.eyebrow}
        title={signalsScrollPlan.title}
        description={signalsScrollPlan.description}
        items={signalsScrollPlan.items}
        maxItems={3}
      />

      <section className="weather-panel space-y-3 px-5 py-4" aria-label="Evidence tab submode">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Evidence tab submode</p>
          <h2 className="text-base font-semibold text-slate-100">Stay in Evidence, then choose implication or full detail depth.</h2>
          <p className="text-sm text-slate-300">This toggle changes how much evidence detail you see inside the Evidence tab. Start with the operating implication. Open detail mode only when you need the full diagnostic appendix, replay, or threshold audit.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { id: "implication", label: "What this means now", detail: "Default action-first read with just enough scorecard context to confirm the weekly call." },
            { id: "detail", label: "Evidence detail", detail: "Full diagnostics, historical replay, and advanced controls for deeper validation." },
          ] as const).map((item) => {
            const active = item.id === activeSignalsView;
            return (
              <a
                key={item.id}
                href={buildSignalsViewHref(item.id)}
                aria-current={active ? "page" : undefined}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? "border-sky-300/80 bg-sky-500/12 text-slate-100"
                    : "border-slate-700/80 bg-slate-950/55 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{item.label}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{item.detail}</p>
              </a>
            );
          })}
        </div>
      </section>

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

      <section id="decision-summary" className="weather-panel scroll-mt-28 space-y-6 px-6 py-5" aria-label="Decision summary">
        <p className="weather-surface inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100">
          {decisionDeltaLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          <PersistedAssistPanel
            assistMode="evidence"
            buttonLabel="Translate the signals"
            title="How to read the three main evidence terms"
            summary="Use this when you want the diagnostic layer translated into plain operating language before you open the full appendix."
          >
            <p><span className="font-semibold text-slate-50">Tightness</span> = how hard conditions make new long-payback commitments.</p>
            <p><span className="font-semibold text-slate-50">Risk appetite</span> = how willing markets are to fund faster expansion and risk.</p>
            <p><span className="font-semibold text-slate-50">Curve slope</span> = an early read on whether the current posture is likely to persist or deteriorate.</p>
          </PersistedAssistPanel>
          <PersistedAssistPanel
            assistMode="trust"
            buttonLabel="Translate reliability"
            title="How to read freshness and confidence"
            summary="Use this when the evidence is not the problem, but you need to know whether it is safe to rely on right now."
          >
            <p><span className="font-semibold text-slate-50">Confidence</span> = how far the current read sits from the nearest flip threshold.</p>
            <p><span className="font-semibold text-slate-50">Freshness</span> = when the underlying inputs last refreshed.</p>
            <p>If either degrades, keep decisions reversible even if the current call still looks directionally right.</p>
          </PersistedAssistPanel>
        </div>
        <article className="weather-surface space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">What this means now</p>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Current call</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{actionNowShort}</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Main pressure</p>
              <p className="mt-2 text-sm text-slate-200">{topDiagnosticCallouts[0]?.why ?? "Review the scorecard below to validate the main driver before you change posture."}</p>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Reopen the call when</p>
              {showMicroDecisionRows ? (
                <div className="mt-2 space-y-2 text-sm text-slate-200">
                  <div className="rounded-md border border-amber-400/20 bg-amber-500/8 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">Trigger</p>
                    <p className="mt-1">{triggerCondition}</p>
                  </div>
                  <div className="rounded-md border border-sky-400/20 bg-sky-500/8 px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">Reversal</p>
                    <p className="mt-1">{reversalCondition}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-200">
                  <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-amber-200">Trigger</span>
                  {triggerCondition}
                  <span className="ml-2 mr-1 font-semibold uppercase tracking-[0.08em] text-sky-200">Reversal</span>
                  {reversalCondition}
                </p>
              )}
            </div>
          </div>
        </article>
        <div className="weather-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Posture</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{regimeLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{trustStatusLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Decision as-of</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{recordDateLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">Data refreshed</p>
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
            <p className="text-xs text-slate-300">
              The evidence scorecard and threshold logic appear below in the standard review order.
            </p>
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
                  <p className="mt-2 text-xs text-slate-300">Review in the current scores section below.</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
      {activeSignalsView === "detail" ? (
      <section id="historical-replay" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5">
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
      ) : null}

      <section id="current-scores" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5">
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
                    <p className="text-xs text-slate-300">Source signal details are listed in this scorecard.</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      {activeSignalsView === "implication" ? (
        <section className="weather-panel space-y-3 px-6 py-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Need more proof?</p>
            <h2 className="text-lg font-semibold text-slate-100">Open the full evidence appendix only when this call still needs defending.</h2>
            <p className="text-sm text-slate-300">Detail mode adds prioritized diagnostics, historical replay, threshold tuning, and advanced filters. Use it when the room asks “why?” or “what would change this?”</p>
          </div>
          <a
            href={buildSignalsViewHref("detail") + "#evidence-priorities"}
            className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
          >
            Open evidence detail
          </a>
        </section>
      ) : null}

      {activeSignalsView === "detail" ? (
      <section id="evidence-priorities" className="weather-panel scroll-mt-28 space-y-4 px-6 py-5" aria-label="Signal diagnostics queue">
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
              <p className="text-xs text-slate-300">Use the sections below to validate this driver in sequence.</p>
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
                  <p className="mt-2 text-xs text-slate-300">Validate this item in the matching section below.</p>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>
      ) : null}

      {activeSignalsView === "detail" ? (
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
            href={buildDiagnosticsExpansionHref(resolvedSearchParams, !showFullDiagnostics)}
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
                <p className="text-xs text-slate-300">Review this driver in the evidence stack below.</p>
              </li>
            ))}
          </ol>
        ) : SignalVisualizationSuite ? (
          <SignalVisualizationSuite
            treasury={treasury}
            yieldCurveSeries={yieldCurveSeries}
          />
        ) : null}
      </section>
      ) : null}

      {activeSignalsView === "detail" ? (
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
              Keep historical replay visible for the default audit loop. Use advanced controls only
              for threshold tuning and deeper timeline diagnostics.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!showAdvanced ? (
              <a
                href={buildAdvancedHref(true) + "#time-machine"}
                className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
              >
                Open Time Machine
              </a>
            ) : null}
            <a
              href={buildAdvancedHref(!showAdvanced)}
              className="weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.14em] hover:border-sky-400/70 hover:text-slate-100"
            >
              {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
            </a>
          </div>
        </div>
      </section>
      ) : null}

      {activeSignalsView === "detail" && showAdvanced && AdvancedThresholdsSection && TimeMachinePanel && RegimeTimelinePanel && summaryArchive ? (
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
