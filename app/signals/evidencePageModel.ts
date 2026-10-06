import { FALLBACK_PAUSE_THRESHOLD } from "../../lib/report/reportCopy";
import { loadReportDataSafe } from "../../lib/report/reportData";
import type { ReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildBreadcrumbList,
  organizationName,
  websiteName,
} from "../../lib/seo";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { createBreadcrumbTrail } from "../../lib/navigation/breadcrumbs";
import { shouldSplitDecisionConditionRows } from "../../lib/report/reportFormatting";
import type { RegimeSignalKey } from "../../lib/report/reportFormatting";
import {
  buildCallLineLadders,
  buildSignalReferenceRows,
  buildTrustStripProps,
} from "../../lib/report/evidenceReaderModel";
import { resolvePublishedConfidence } from "../../lib/report/confidence";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { resolveSignalsFocus, type FocusTab } from "./evidenceQueryState";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";

export type SignalsPageSearchParams = {
  month?: string;
  year?: string;
  [key: string]: string | undefined;
};

/**
 * One focus, as a filter on the changed-signals table: which signals it keeps,
 * why each matters for that focus, and the instruments further down the page
 * that a reader with that focus should open next.
 *
 * These were five hand-written "check" queues rendered as their own section,
 * with a card per entry, while the signals they named sat in a second table two
 * screens up. The words are the same; they annotate that table now.
 */
type FocusFilter = {
  signals: readonly RegimeSignalKey[];
  notes: Partial<Record<RegimeSignalKey, string>>;
  instruments: Array<{ label: string; why: string; href: string }>;
};

const FOCUS_FILTERS: Record<FocusTab, FocusFilter> = {
  all: {
    signals: ["tightness", "riskAppetite", "baseRate", "curveSlope"],
    notes: {
      tightness: "How hard current conditions make new long-payback commitments",
      riskAppetite: "How willing markets are to fund risk and faster expansion",
      curveSlope: "The earliest sign of whether this week's conditions will hold",
    },
    instruments: [],
  },
  growth: {
    signals: ["curveSlope"],
    notes: { curveSlope: "The earliest read on whether growth is slowing" },
    instruments: [
      { label: "Past changes", why: "How the last few changes in conditions played out", href: "#regime-timeline" },
      { label: "Raw source data", why: "Check the growth inputs at their source", href: "#signal-diagnostics" },
    ],
  },
  inflation: {
    signals: ["baseRate", "tightness"],
    notes: {
      baseRate: "Rates are the biggest single input to funding pressure",
      tightness: "When money is tight, higher costs are harder to pass on",
    },
    instruments: [
      { label: "Change lines", why: "Where the lines sit, if inflation is the main worry", href: "#advanced-controls" },
    ],
  },
  labor: {
    signals: ["riskAppetite"],
    notes: { riskAppetite: "How willing investors are to fund hiring ahead of revenue" },
    instruments: [
      { label: "Past changes", why: "How long conditions have held; a hiring plan outlasts one week's number", href: "#regime-timeline" },
      { label: "Past months", why: "What the guidance said in past months, to test a hiring plan against", href: "#time-machine" },
    ],
  },
  financial: {
    signals: ["tightness", "riskAppetite"],
    notes: {
      tightness: "How hard money is to raise or borrow right now",
      riskAppetite: "How willing investors are to fund risk, which moves with conditions",
    },
    instruments: [
      { label: "Raw source data", why: "Check the inputs at their source before a move that depends on rates", href: "#signal-diagnostics" },
    ],
  },
};

export const focusLabelByTab: Record<FocusTab, string> = {
  all: "All",
  growth: "Growth",
  inflation: "Inflation",
  labor: "Labor",
  financial: "Financial conditions",
};

/** The page's sections, in the order a reader answers their questions. */
const signalsSectionLinks = [
  { href: "#what-changed", label: "What changed" },
  { href: "#call-lines", label: DECISION_CONTRACT_LABELS.watch.flipWatch },
  { href: "#instruments", label: "Deeper evidence" },
];

const buildStructuredData = () => ({
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
          "Macro signal dataset for Whether, including thresholds, sensor readings, and the evidence behind the guidance.",
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
});

/**
 * The page model from report data already in hand. Split from the loader so a
 * test can build it from a fixture and render the sections in order without
 * serving an upstream.
 */
const deriveSignalsPageModel = (
  reportData: ReportData,
  resolvedSearchParams?: SignalsPageSearchParams,
) => {
  const {
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    historicalSelection,
    invalidHistoricalSelection,
    recordDateLabel,
    regimeSeries,
    yieldCurveSeries,
    selectedMonth,
    selectedYear,
    statusLabel,
    actionStripItems,
    guardrailThreshold,
    treasury,
    treasuryProvenance,
    reportDynamics,
  } = reportData;
  /* `advanced=1` is the query key the month picker's disclosure carries, so
     every link written as `/signals?advanced=1#time-machine` opens it. A month
     already loaded opens it too: the reader is in the middle of using it. */
  const monthPickerOpen = resolvedSearchParams?.advanced === "1" || Boolean(historicalSelection);
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
  const trustStrip = buildTrustStripProps({
    recordDateLabel,
    isFallback,
    isHistorical: Boolean(historicalSelection),
    degradedSourceCount: buildDegradedSourceRows(reportData.sourceHealth).length,
    confidenceLabel: resolvePublishedConfidence({
      assessment,
      record: treasury,
      historical: Boolean(historicalSelection),
    }).label,
    assessment,
  });
  const triggerCondition = guardrailThreshold?.trim().length
    ? guardrailThreshold
    : `${FALLBACK_PAUSE_THRESHOLD}.`;
  // The resume trigger, symmetric with the pause trigger in "Pause if" above.
  // This rendered `flipThreshold` — the condition that BREAKS the call, which
  // /trust labels "Call changes if". Printing it under
  // "Resume when" (then "Safe again when") told an operator the opposite of what it means.
  const resumeTrigger = actionStripItems?.[0]?.reversalCondition;
  const reversalCondition = resumeTrigger?.trim().length
    ? resumeTrigger
    : "Resume once both scores are back across their resume lines.";
  const showMicroDecisionRows = shouldSplitDecisionConditionRows({
    trigger: triggerCondition,
    reversal: reversalCondition,
  });
  const activeFocus: FocusTab = resolveSignalsFocus(resolvedSearchParams);
  const focusFilter = FOCUS_FILTERS[activeFocus];
  const signalRows = buildSignalReferenceRows(assessment, reportDynamics);
  const changedSignalRows = signalRows
    .filter((row) => focusFilter.signals.includes(row.key))
    .map((row) => ({ ...row, note: focusFilter.notes[row.key] ?? null }));
  const callLineLadders = buildCallLineLadders(assessment, reportDynamics, actionStripItems ?? []);

  return {
    structuredData: buildStructuredData(),
    assessment,
    cacheCoverage,
    cacheMonthsByYear,
    fetchedAtLabel,
    historicalSelection,
    invalidHistoricalSelection,
    recordDateLabel,
    regimeSeries,
    yieldCurveSeries,
    selectedMonth,
    selectedYear,
    statusLabel,
    treasury,
    treasuryProvenance,
    monthPickerOpen,
    isFallback,
    trust,
    trustStrip,
    triggerCondition,
    reversalCondition,
    showMicroDecisionRows,
    activeFocus,
    focusInstruments: focusFilter.instruments,
    changedSignalRows,
    callLineLadders,
    /* What the "since" column compares with; the rows and ladders carry the same label. */
    basis: comparisonBasis(reportDynamics.comparedWith),
    sectionLinks: signalsSectionLinks,
  };
};

export type SignalsPageModel = ReturnType<typeof deriveSignalsPageModel>;

export const buildSignalsPageModel = async (
  resolvedSearchParams?: SignalsPageSearchParams,
) => {
  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/signals" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  return deriveSignalsPageModel(reportData, resolvedSearchParams);
};
