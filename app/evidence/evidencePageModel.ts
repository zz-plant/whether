import { loadReportDataSafe } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildTimeMachineHref,
  getAdjacentTimeMachineRequest,
} from "../../lib/timeMachine/timeMachineSelection";
import {
  buildBreadcrumbList,
  organizationName,
  websiteName,
} from "../../lib/seo";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { indicatorTypeByScoreLabel } from "../../lib/indicatorClassification";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { REGIME_LABELS } from "../../lib/regimePresentation";
import { shouldSplitDecisionConditionRows } from "../../lib/report/reportFormatting";
import {
  resolveSignalsFocus,
  resolveSignalsView,
  type FocusTab,
  type SignalsView,
} from "./evidenceQueryState";
import { loadSignalsPagePanels } from "./evidencePagePanels";
import type { ThresholdPressureDirection } from "../../lib/report/homeBriefModel";

export type SignalsPageSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

export const buildSignalsPageModel = async (
  resolvedSearchParams?: SignalsPageSearchParams,
) => {
  const buildChartDomain = ({
    current,
    threshold,
    buffer,
    minClamp,
    maxClamp,
  }: {
    current: number;
    threshold: number;
    buffer: number;
    minClamp?: number;
    maxClamp?: number;
  }) => {
    const padding = Math.max(buffer * 1.5, Math.abs(current - threshold) * 0.7, 0.1);
    const min = Math.min(current, threshold) - padding;
    const max = Math.max(current, threshold) + padding;
    return {
      min: typeof minClamp === "number" ? Math.min(min, minClamp) : min,
      max: typeof maxClamp === "number" ? Math.max(max, maxClamp) : max,
    };
  };

  const buildWatchDistanceLabel = ({
    current,
    threshold,
    unit,
  }: {
    current: number;
    threshold: number;
    unit: "pts" | "%";
  }) => {
    const delta = current - threshold;
    const magnitude = unit === "pts" ? `${Math.abs(delta).toFixed(1)} pts` : `${Math.abs(delta).toFixed(2)}%`;
    if (delta === 0) {
      return `${magnitude} from watch line`;
    }
    return `${magnitude} ${delta > 0 ? "above" : "below"} watch line`;
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/evidence#webpage`,
        name: "Whether Weekly Brief — Evidence",
        url: `${siteUrl}/evidence`,
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
        createBreadcrumbTrail([{ path: "/" }, { path: "/evidence" }]),
      ),
    ],
  };

  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/evidence" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  const {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
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
    ? buildTimeMachineHref("/evidence", previousHistoricalSelection)
    : undefined;
  const historicalTimeMachineHref = "/evidence?advanced=1#time-machine";
  const showAdvanced = resolvedSearchParams?.advanced === "1";
  const showFullDiagnostics = resolvedSearchParams?.diagnostics === "all";
  const {
    SignalVisualizationSuite,
    AdvancedThresholdsSection,
    TimeMachinePanel,
    RegimeTimelinePanel,
  } = await loadSignalsPagePanels({
    showAdvanced,
    showFullDiagnostics,
  });
  const regimeLabel = REGIME_LABELS[assessment.regime];
  const isFallback = Boolean(treasury.fallback_at || treasury.fallback_reason);
  const trust = buildTrustStatus({
    historicalSelection: Boolean(historicalSelection),
    isFallback,
    fallbackReason: treasury.fallback_reason ?? undefined,
    historicalAction: "Use historical data to understand trends, not to approve live bets.",
    fallbackAction:
      "Hold major decisions until live signals return or you validate the cache.",
    stableAction: "Evidence is live with current thresholds and timestamps.",
  });
  const nextRefreshLabel = historicalSelection ? "Fixed historical snapshot" : "15m cadence";
  const freshnessSummaryLabel = historicalSelection
    ? `Historical snapshot fixed at ${recordDateLabel}.`
    : `Decision as-of ${recordDateLabel}; live data refreshed ${fetchedAtLabel}. Next refresh ${nextRefreshLabel}.`;
  const decisionDeltaLabel = historicalSelection
    ? "Historical snapshot for review only — switch to live data before approving new bets."
    : isFallback
      ? "Live update delayed — avoid irreversible decisions until signals refresh."
      : "Use this evidence to confirm this week's call or change it now.";
  const triggerCondition = guardrailThreshold?.trim().length
    ? guardrailThreshold
    : "Pause if thresholds weaken.";
  const reversalCondition = flipThreshold?.trim().length
    ? flipThreshold
    : "Resume once reversal thresholds recover.";
  const showMicroDecisionRows = shouldSplitDecisionConditionRows({
    trigger: triggerCondition,
    reversal: reversalCondition,
  });
  const timeMachineHref = showAdvanced ? "#time-machine" : "#advanced-controls";
  const regimeTimelineHref = showAdvanced ? "#regime-timeline" : "#advanced-controls";
  const activeSignalsView: SignalsView = resolveSignalsView(resolvedSearchParams);
  const activeFocus: FocusTab = resolveSignalsFocus(resolvedSearchParams);
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

  const prioritizedSignalsByFocus: Record<
    FocusTab,
    Array<{ label: string; why: string; href: string }>
  > = {
    all: [
      {
        label: "Tightness",
        why: "How hard current conditions make new long-payback commitments",
        href: "#current-scores",
      },
      {
        label: "Risk appetite",
        why: "How willing markets are to fund risk and faster expansion",
        href: "#current-scores",
      },
      {
        label: "Curve slope",
        why: "Early growth signal for whether this posture is likely to hold",
        href: "#current-scores",
      },
    ],
    growth: [
      {
        label: "Curve slope",
        why: "Best early growth stress read in current framework",
        href: "#current-scores",
      },
      {
        label: "Regime timeline",
        why: "Compare current growth posture against prior transitions",
        href: regimeTimelineHref,
      },
      {
        label: "Macro source series",
        why: "Validate growth-sensitive inputs directly from sources",
        href: "#current-scores",
      },
    ],
    inflation: [
      {
        label: "Base rate",
        why: "Rate level is the strongest inflation pressure proxy in this report",
        href: "#current-scores",
      },
      {
        label: "Tightness",
        why: "Liquidity stress compounds inflation pass-through risk",
        href: "#current-scores",
      },
      {
        label: "Threshold logic",
        why: "Check if inflation-sensitive trigger bands need adjustment",
        href: "#advanced-controls",
      },
    ],
    labor: [
      {
        label: "Risk appetite",
        why: "Hiring pace risk sits downstream of confidence and market risk",
        href: "#current-scores",
      },
      {
        label: "Regime timeline",
        why: "Labor plans should align with regime persistence, not one data print",
        href: regimeTimelineHref,
      },
      {
        label: "Time machine",
        why: "Test labor-related planning against prior regime windows",
        href: timeMachineHref,
      },
    ],
    financial: [
      {
        label: "Tightness",
        why: "Funding conditions drive immediate financial operating constraints",
        href: "#current-scores",
      },
      {
        label: "Risk appetite",
        why: "Credit and valuation tolerance shift with capital-posture shifts",
        href: "#current-scores",
      },
      {
        label: "Macro source series",
        why: "Trace inputs before finalizing treasury-sensitive moves",
        href: "#current-scores",
      },
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
  const scoreCards = [
    {
      label: "Tightness" as const,
      valueLabel: `${assessment.scores.tightness}/100`,
      currentValue: assessment.scores.tightness,
      thresholdLabel: `${assessment.thresholds.tightnessRegime}/100`,
      thresholdValue: assessment.thresholds.tightnessRegime,
      description:
        "Higher values mean market conditions are less forgiving for new long-payback bets.",
      pressureDirection: "higher-is-worse" as ThresholdPressureDirection,
      watchBuffer: 8,
      chartDomain: { min: 0, max: 100 },
      leftLabel: "More room",
      rightLabel: "More pressure",
      watchDistanceLabel: buildWatchDistanceLabel({
        current: assessment.scores.tightness,
        threshold: assessment.thresholds.tightnessRegime,
        unit: "pts",
      }),
      href: "#current-scores",
    },
    {
      label: "Risk appetite" as const,
      valueLabel: `${assessment.scores.riskAppetite}/100`,
      currentValue: assessment.scores.riskAppetite,
      thresholdLabel: `${assessment.thresholds.riskAppetiteRegime}/100`,
      thresholdValue: assessment.thresholds.riskAppetiteRegime,
      description: "Higher values mean markets are acting more willing to fund risk.",
      pressureDirection: "lower-is-worse" as ThresholdPressureDirection,
      watchBuffer: 8,
      chartDomain: { min: 0, max: 100 },
      leftLabel: "More pressure",
      rightLabel: "More room",
      watchDistanceLabel: buildWatchDistanceLabel({
        current: assessment.scores.riskAppetite,
        threshold: assessment.thresholds.riskAppetiteRegime,
        unit: "pts",
      }),
      href: "#current-scores",
    },
    {
      label: "Curve slope" as const,
      valueLabel:
        assessment.scores.curveSlope === null
          ? "N/A"
          : `${assessment.scores.curveSlope.toFixed(2)}%`,
      currentValue: assessment.scores.curveSlope,
      thresholdLabel: "0.00%",
      thresholdValue: 0,
      description:
        "10Y minus 2Y Treasury yield spread, used here as a forward-looking growth read.",
      pressureDirection: "lower-is-worse" as ThresholdPressureDirection,
      watchBuffer: 0.1,
      chartDomain:
        assessment.scores.curveSlope === null
          ? null
          : buildChartDomain({
            current: assessment.scores.curveSlope,
            threshold: 0,
            buffer: 0.12,
          }),
      leftLabel: "More pressure",
      rightLabel: "More room",
      watchDistanceLabel:
        assessment.scores.curveSlope === null
          ? "Watch line unavailable"
          : buildWatchDistanceLabel({
            current: assessment.scores.curveSlope,
            threshold: 0,
            unit: "%",
          }),
      href: "#current-scores",
    },
  ];
  const scoreCardsByType = {
    leading: scoreCards.filter((card) => indicatorTypeByScoreLabel[card.label] === "leading"),
    lagging: scoreCards.filter((card) => indicatorTypeByScoreLabel[card.label] === "lagging"),
  } as const;

  return {
    structuredData,
    reportResult,
    reportData,
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
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
    treasury,
    treasuryProvenance,
    previousHistoricalHref,
    historicalTimeMachineHref,
    showAdvanced,
    showFullDiagnostics,
    SignalVisualizationSuite,
    AdvancedThresholdsSection,
    TimeMachinePanel,
    RegimeTimelinePanel,
    regimeLabel,
    isFallback,
    trust,
    nextRefreshLabel,
    freshnessSummaryLabel,
    decisionDeltaLabel,
    triggerCondition,
    reversalCondition,
    showMicroDecisionRows,
    timeMachineHref,
    regimeTimelineHref,
    activeSignalsView,
    activeFocus,
    sectionLinks,
    focusLabelByTab,
    essentialPriorityQueue,
    additionalPriorityQueue,
    topDiagnosticCallouts,
    scoreCardsByType,
  };
};
