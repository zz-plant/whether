import { loadReportDataSafe } from "../../lib/report/reportData";
import type { ReportData } from "../../lib/report/reportData";
import { siteUrl } from "../../lib/siteUrl";
import {
  buildBreadcrumbList,
  organizationId,
  organizationName,
  websiteId,
} from "../../lib/seo";
import { graph } from "../../lib/seo/pageStructuredData";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { buildGroupBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import type { RegimeSignalKey } from "../../lib/report/reportFormatting";
import {
  buildSignalReferenceRows,
  buildTrustStripProps,
} from "../../lib/report/evidenceReaderModel";
import { resolvePublishedConfidence } from "../../lib/report/confidence";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { resolveSignalsFocus, type FocusTab } from "./evidenceQueryState";
import { isSavedCopy } from "../../lib/report/provenanceStatus";

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

/* Why the short-term rate matters, said once for both filters that show it.
   The unfiltered table printed a bare "—" in its row while every other row
   had a sentence, and the Inflation filter already had this one. */
const BASE_RATE_NOTE = "Rates are the biggest single input to funding pressure";

const FOCUS_FILTERS: Record<FocusTab, FocusFilter> = {
  all: {
    signals: ["tightness", "riskAppetite", "baseRate", "curveSlope"],
    notes: {
      tightness: "How hard it is right now to take on commitments that pay back slowly",
      riskAppetite: "How willing markets are to fund risk and faster expansion",
      baseRate: BASE_RATE_NOTE,
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
      baseRate: BASE_RATE_NOTE,
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
      riskAppetite: "How willing investors are to fund risk right now",
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
  { href: "#instruments", label: "Deeper evidence" },
];

/* The site node comes from `graph`, so `isPartOf` names it by id; it was an inline WebSite with
   no id, which reads to a parser as a second site. */
const buildStructuredData = () =>
  graph([
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/signals#webpage`,
      name: "Whether Weekly Brief — Evidence",
      url: `${siteUrl}/signals`,
      description:
        "Evidence for the weekly brief: drivers, thresholds, timestamps, and past months.",
      inLanguage: "en",
      isPartOf: { "@id": websiteId },
      publisher: { "@id": organizationId },
      mainEntity: {
        "@type": "Dataset",
        name: "Macro signal evidence feed",
        description:
          "Macro signal dataset for Whether, including thresholds, sensor readings, and the evidence behind the guidance.",
        creator: { "@id": organizationId },
        license: `${siteUrl}/terms-of-service`,
      },
    },
    {
      "@type": "Organization",
      "@id": organizationId,
      name: organizationName,
      url: siteUrl,
    },
    buildBreadcrumbList(
      buildGroupBreadcrumbs("/signals"),
    ),
  ]);

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
    treasury,
    treasuryProvenance,
    reportDynamics,
  } = reportData;
  /* `advanced=1` is the query key the month picker's disclosure carries, so
     every link written as `/signals?advanced=1#time-machine` opens it. A month
     already loaded opens it too: the reader is in the middle of using it. */
  const monthPickerOpen = resolvedSearchParams?.advanced === "1" || Boolean(historicalSelection);
  const isFallback = isSavedCopy(treasury);
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
    scoringBasis: reportData.scoringBasis,
  });
  const activeFocus: FocusTab = resolveSignalsFocus(resolvedSearchParams);
  const focusFilter = FOCUS_FILTERS[activeFocus];
  const signalRows = buildSignalReferenceRows(assessment, reportDynamics, reportData.scoringBasis);
  const changedSignalRows = signalRows
    .filter((row) => focusFilter.signals.includes(row.key))
    .map((row) => ({ ...row, note: focusFilter.notes[row.key] ?? null }));

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
    activeFocus,
    focusInstruments: focusFilter.instruments,
    changedSignalRows,
    /* What the "since" column compares with; the rows carry the same label. */
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
