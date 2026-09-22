import { DECISION_CONTRACT_LABELS, FALLBACK_PAUSE_THRESHOLD } from "../../lib/report/reportCopy";
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

/* The prose forms of the two lines these cards measure against. The label is
   the row heading ("Call changes if: 70/100"); the noun goes inside a sentence
   ("7.0 pts above the line that changes the call"), where the heading's verb does not
   fit. */
const POSTURE_FLIP_LINE_NOUN = "the line that changes the call";
const INVERSION_LINE_NAME = "Inversion line";
const INVERSION_LINE_NOUN = "the inversion line";

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

  /* The line has to be named, because the three cards do not share one. Two
     are the regime boundary — where the posture itself flips — and the curve's
     is the zero line where it inverts. All three used to read "watch line",
     which put a fourth name on the page for lines the brief already draws
     under the two contract labels. */
  const buildWatchDistanceLabel = ({
    current,
    threshold,
    unit,
    lineNoun,
  }: {
    current: number;
    threshold: number;
    unit: "pts" | "%";
    lineNoun: string;
  }) => {
    const delta = current - threshold;
    const magnitude = unit === "pts" ? `${Math.abs(delta).toFixed(1)} pts` : `${Math.abs(delta).toFixed(2)}%`;
    if (delta === 0) {
      return `${magnitude} from ${lineNoun}`;
    }
    return `${magnitude} ${delta > 0 ? "above" : "below"} ${lineNoun}`;
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/signals#webpage`,
        name: "Whether Weekly Brief — Evidence",
        url: `${siteUrl}/signals`,
        description:
          "Evidence for the weekly brief: drivers, thresholds, timestamps, and past months.",
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
            "Macro signal dataset for Whether, including thresholds, sensor readings, and the evidence behind the call.",
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
        createBreadcrumbTrail([{ path: "/" }, { path: "/signals" }]),
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
    actionStripItems,
    guardrailThreshold,
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
    historicalAction: "Use a past month to understand trends, not to act on this week.",
    fallbackAction:
      "Hold anything you cannot undo until live data is back.",
    stableAction: "Evidence is live with current thresholds and timestamps.",
  });
  const nextRefreshLabel = historicalSelection ? "Past month, fixed" : undefined;
  const freshnessSummaryLabel = historicalSelection
    ? `Past month, fixed at ${recordDateLabel}.`
    : `Decision as-of ${recordDateLabel}; live data refreshed ${fetchedAtLabel}.`;
  const triggerCondition = guardrailThreshold?.trim().length
    ? guardrailThreshold
    : `${FALLBACK_PAUSE_THRESHOLD}.`;
  // The resume trigger, symmetric with the pause trigger in "Wrong if" above.
  // This rendered `flipThreshold` — the condition that BREAKS the call, which
  // /trust correctly labels "This recommendation breaks if". Printing it under
  // "Safe again when" told an operator the opposite of what it means.
  const resumeTrigger = actionStripItems?.[0]?.reversalCondition;
  const reversalCondition = resumeTrigger?.trim().length
    ? resumeTrigger
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
          { href: "#current-scores", label: "Current scores" },
          { href: "#trends", label: "Trends" },
          { href: "#fossil-record", label: "Fossil record" },
          { href: "#evidence-priorities", label: "Evidence priorities" },
          { href: "#advanced-controls", label: "Advanced controls" },
        ]
      : // Short read listed two of the page's sections. The sidebar is a fixed
        // column beside a ~4,000px page, so a two-item contents list left it
        // empty for almost the whole scroll while claiming the width. Every
        // section a reader can actually land on is now listed.
        [
          { href: "#decision-summary", label: "What this means now" },
          { href: "#current-scores", label: "Current scores" },
          { href: "#curve-context", label: "Curve context" },
          { href: "#trends", label: "Trends" },
        ];

  const prioritizedSignalsByFocus: Record<
    FocusTab,
    Array<{ label: string; why: string; href: string }>
  > = {
    all: [
      {
        label: "Funding pressure",
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
        why: "The earliest sign of whether this week's call will hold",
        href: "#current-scores",
      },
    ],
    growth: [
      {
        label: "Curve slope",
        why: "The earliest read on whether growth is slowing",
        href: "#current-scores",
      },
      {
        label: "Regime timeline",
        why: "How the last few call changes played out",
        href: regimeTimelineHref,
      },
      {
        label: "Macro source series",
        why: "Check the growth inputs at their source",
        href: "#current-scores",
      },
    ],
    inflation: [
      {
        label: "Base rate",
        why: "Rates are the biggest single input to funding pressure",
        href: "#current-scores",
      },
      {
        label: "Tightness",
        why: "When money is tight, higher costs are harder to pass on",
        href: "#current-scores",
      },
      {
        label: "Threshold logic",
        why: "Where the lines sit, if inflation is the main worry",
        href: "#advanced-controls",
      },
    ],
    labor: [
      {
        label: "Risk appetite",
        why: "How willing investors are to fund hiring ahead of revenue",
        href: "#current-scores",
      },
      {
        label: "Regime timeline",
        why: "How long the call has held; a hiring plan outlasts one week's number",
        href: regimeTimelineHref,
      },
      {
        label: "Time machine",
        why: "What the call said in past months, to test a hiring plan against",
        href: timeMachineHref,
      },
    ],
    financial: [
      {
        label: "Tightness",
        why: "How hard money is to raise or borrow right now",
        href: "#current-scores",
      },
      {
        label: "Risk appetite",
        why: "How willing investors are to fund risk, which moves with the call",
        href: "#current-scores",
      },
      {
        label: "Macro source series",
        why: "Check the inputs at their source before a move that depends on rates",
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
      thresholdName: DECISION_CONTRACT_LABELS.watch.postureFlips,
      thresholdLineNoun: POSTURE_FLIP_LINE_NOUN,
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
        lineNoun: POSTURE_FLIP_LINE_NOUN,
      }),
      href: "#current-scores",
    },
    {
      label: "Risk appetite" as const,
      valueLabel: `${assessment.scores.riskAppetite}/100`,
      currentValue: assessment.scores.riskAppetite,
      thresholdName: DECISION_CONTRACT_LABELS.watch.postureFlips,
      thresholdLineNoun: POSTURE_FLIP_LINE_NOUN,
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
        lineNoun: POSTURE_FLIP_LINE_NOUN,
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
      /* Not a posture flip: the regime is classified off funding pressure and
         risk appetite, and this line is where the curve inverts. It fed the
         same "Watch line" wording as the two that are, which is how one page
         came to show three thresholds under one name. */
      thresholdName: INVERSION_LINE_NAME,
      thresholdLineNoun: INVERSION_LINE_NOUN,
      thresholdLabel: "0.00%",
      thresholdValue: 0,
      description:
        "The 10-year minus 2-year Treasury rate, used here as an early read on growth.",
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
          ? `${INVERSION_LINE_NAME} unavailable`
          : buildWatchDistanceLabel({
            current: assessment.scores.curveSlope,
            threshold: 0,
            unit: "%",
            lineNoun: INVERSION_LINE_NOUN,
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
