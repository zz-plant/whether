import { loadReportDataSafe } from "../../lib/report/reportData";
import type { ReportData } from "../../lib/report/reportData";
import { buildSignalsStructuredData } from "../../lib/seo/reportPageStructuredData";
import { buildTrustStatus } from "../../lib/report/trustStatus";
import { formatMonthYearShortFromValue } from "../../lib/formatters";
import { getMonthlyRegimeHistory } from "../../lib/summary/monthlyRegimeHistory";
import {
  SIGNALS_PAGE_QUESTION,
  answeredInstrumentQuestions,
  buildInstrumentQuestions,
  describeGuidanceChange,
} from "./signalsQuestions";
import type { RegimeSignalKey } from "../../lib/report/reportFormatting";
import {
  buildSignalReferenceRows,
  buildTrustStripProps,
} from "../../lib/report/evidenceReaderModel";
import { resolvePublishedConfidence } from "../../lib/report/confidence";
import { buildDegradedSourceRows } from "../../lib/report/sourceHealth";
import { comparisonBasis } from "../../lib/report/comparisonBasis";
import { buildSignalFlow } from "../../lib/report/signalFlow";
import { evaluateRegime } from "../../lib/regimeEngine";
import { buildScoreComposition } from "../../lib/report/scoreComposition";
import { buildInputChoiceModel, parseInputChoice } from "../../lib/report/countedInputs";
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
      { label: "Where conditions change", why: "Where the lines sit, if inflation is the main worry", href: "#advanced-controls" },
    ],
  },
  labor: {
    signals: ["riskAppetite"],
    notes: { riskAppetite: "How willing investors are to fund hiring ahead of revenue" },
    instruments: [
      { label: "Past changes", why: "How long conditions have held; a hiring plan outlasts one week's number", href: "#regime-timeline" },
      { label: "Past months", why: "Guidance across past months, to test a hiring plan against", href: "#time-machine" },
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
  /* The section's own heading: the outline called it "Deeper evidence" over a heading that said this. */
  { href: "#instruments", label: "Charts, past months and checks" },
];

/* Thirteen month-ends, so the move the trends answer prints spans twelve months. It took
   twelve and printed "-6 over 12 mo" for risk appetite, Sep 2025 to Aug 2026 — eleven
   months; over twelve (from 66 in Aug 2025) it is -10. */
const buildScoreTrends = () => {
  const months = getMonthlyRegimeHistory().slice(-13);
  const trend = (pick: (entry: (typeof months)[number]) => number | null | undefined) =>
    months.flatMap((entry) => {
      const value = pick(entry);
      return typeof value === "number" ? [{ label: formatMonthYearShortFromValue(entry.record_date), value }] : [];
    });
  return {
    tightnessTrend: trend((entry) => entry.tightness),
    riskAppetiteTrend: trend((entry) => entry.riskAppetite),
  };
};

/**
 * The page model from report data already in hand. Split from the loader so a
 * test can build it from a fixture and render the sections in order without
 * serving an upstream.
 */
type ScoreTrends = ReturnType<typeof buildScoreTrends>;

const deriveSignalsPageModel = (
  reportData: ReportData,
  resolvedSearchParams?: SignalsPageSearchParams,
  scoreTrends: ScoreTrends = buildScoreTrends(),
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
    stableAction: "Evidence is live, with this week's pause lines and dates.",
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
  const basis = comparisonBasis(reportDynamics.comparedWith);
  /* Every row is in the table only unfiltered, and every node links to its row. */
  const signalFlow = activeFocus === "all" ? buildSignalFlow(signalRows, basis.reference) : null;
  /* Which inputs count, for the line settings: /trust's arithmetic names the inputs, and the
     engine answers for the choice the URL names. It changes the sentence in that panel and
     nothing else on the page. */
  const inputChoice = buildInputChoiceModel({
    composition: buildScoreComposition({
      assessment,
      treasury,
      macroSeries: reportData.macroSeries,
      treasurySource: { label: treasuryProvenance.sourceLabel, url: treasuryProvenance.sourceUrl },
      scoringBasis: reportData.scoringBasis,
      evaluate: evaluateRegime,
    }),
    assessment,
    treasury,
    macroSeries: reportData.macroSeries,
    evaluate: evaluateRegime,
    choice: parseInputChoice(resolvedSearchParams),
  });

  const { tightnessTrend, riskAppetiteTrend } = scoreTrends;
  /* The page's question and each instrument's, with the answers the page prints: the h1, the
     line under it, the closed summaries and the markup all read these. */
  const pageAnswer = describeGuidanceChange(signalRows, basis);
  const instrumentQuestions = buildInstrumentQuestions({
    assessment,
    treasury,
    yieldCurveSeries,
    tightnessTrend,
    riskAppetiteTrend,
    regimeSeries,
    inputChoice,
  });

  return {
    structuredData: buildSignalsStructuredData({
      questions: [{ question: SIGNALS_PAGE_QUESTION, answer: pageAnswer }, ...answeredInstrumentQuestions(instrumentQuestions)],
      recordDateIso: treasury.record_date,
      scores: assessment.scores,
    }),
    pageQuestion: SIGNALS_PAGE_QUESTION,
    pageAnswer,
    instrumentQuestions,
    tightnessTrend,
    riskAppetiteTrend,
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
    signalFlow,
    inputChoice,
    /* What the "since" column compares with; the rows carry the same label. */
    basis,
    sectionLinks: signalsSectionLinks,
  };
};

export type SignalsPageModel = ReturnType<typeof deriveSignalsPageModel>;

export const buildSignalsPageModel = async (
  resolvedSearchParams?: SignalsPageSearchParams,
  /** The month-end series the score trends draw and answer from; the archive's last thirteen unless a test names its own. */
  scoreTrends?: ScoreTrends,
) => {
  const reportResult = await loadReportDataSafe(resolvedSearchParams, { route: "/signals" });
  const reportData = reportResult.ok ? reportResult.data : reportResult.fallback;
  return deriveSignalsPageModel(reportData, resolvedSearchParams, scoreTrends);
};
