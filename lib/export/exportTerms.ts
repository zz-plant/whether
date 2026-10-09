/**
 * The reader's words for the three facts every export states besides the call:
 * the conditions, the confidence and where the data came from.
 *
 * An export is pasted to people who have never opened the site, so each term
 * has to carry its meaning on the line it sits on. The builders used to print
 * the engine's codes here ("MEDIUM confidence", "(1M)", "cached snapshot"),
 * each in its own shape, and the page that explained them was the glossary.
 */
import type { RegimeScores } from "../regimeEngineCore";
import { BASE_RATE_SOURCE_LABELS } from "../report/regimeDescription";
import { getRegimePublicLabel, isRegimeKey, REGIME_WEATHER_RATIONALES } from "../regimePresentation";
import { MARGIN_LABEL, formatMargin, formatMarginBand } from "../report/reportFormatting";
import { resolveNearestLineMargin } from "../report/confidence";
import type { BriefDocument } from "../report/briefArtifact";
import { basisClause } from "../report/scoringBasis";

/**
 * The margin band ("Close to the line") from either spelling of the engine's
 * code. The assessment says `MEDIUM` and the home model says `MED`; both reached
 * exports verbatim. The API field stays `confidence`; a paste says "Margin".
 */
export const formatExportConfidence = (code: string): string =>
  formatMarginBand(code === "MEDIUM" ? "MED" : code);

/** The band, lower-cased for a slot already labelled "Margin". */
export const formatExportConfidenceWord = (code: string): string => formatExportConfidence(code).toLowerCase();

/**
 * "Margin: close to the line (1 pt from the change line)", from the document's own
 * readings, so every paste prints the distance the band stands for.
 */
export const formatDocumentMargin = (document: {
  confidence: BriefDocument["confidence"];
  readings: Pick<BriefDocument["readings"], "scores"> & {
    thresholds: Pick<BriefDocument["readings"]["thresholds"], "tightnessRegime" | "riskAppetiteRegime">;
  } & Partial<Pick<BriefDocument["readings"], "baseRateUsed" | "curveSlope">>;
}): string => {
  const margin = resolveNearestLineMargin({
    scores: {
      ...document.readings.scores,
      baseRateUsed: document.readings.baseRateUsed,
      curveSlope: document.readings.curveSlope,
    },
    thresholds: document.readings.thresholds,
  });
  return `${MARGIN_LABEL}: ${formatMargin(document.confidence, margin).replace(/^./, (first) => first.toLowerCase())}`;
};

/**
 * The weather word with what it means for money, in one line:
 * "Sunny (money is cheap and available)". The label defaults to the weather
 * word; a caller holding a longer display label passes it.
 */
export const describeConditions = (regime: string, label = getRegimePublicLabel(regime)): string => {
  if (!isRegimeKey(regime)) return label;
  const meaning = REGIME_WEATHER_RATIONALES[regime].split(". ")[0].replace(/\.$/, "");
  return `${label} (${meaning.charAt(0).toLowerCase()}${meaning.slice(1)})`;
};

/** Where the short-term borrowing rate was read from, in words: "the 1-month Treasury bill". */
export const describeBaseRateSource = (used: RegimeScores["baseRateUsed"]): string => {
  const label = BASE_RATE_SOURCE_LABELS[used];
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
};

/**
 * The week's direction as "vs last week: …" reads it. The engine's words
 * (improving, deteriorating, unavailable) are about the model; a reader wants
 * better, worse, or that no comparison was made. Unknown words pass through.
 */
const WEEKLY_DIRECTION_WORDS: Record<string, string> = {
  improving: "better",
  easing: "better",
  deteriorating: "worse",
  tightening: "worse",
  mixed: "mixed",
  stable: "no change",
  unchanged: "no change",
  unavailable: "not compared",
};

export const describeWeeklyDirection = (label: string): string =>
  WEEKLY_DIRECTION_WORDS[label.trim().toLowerCase()] ?? label.toLowerCase();

/**
 * The weekly call's pause line with its own verb removed, for a slot already
 * labelled "Pause if". `weeklyCall.pauseIf` is the lead rule's sentence
 * ("Pause net-new hiring if funding pressure rises above 76"), which under the
 * label read "Pause if: Pause net-new hiring if …". Unlike
 * `formatDecisionThreshold` this keeps every sentence: the fallbacks it also
 * carries ("No pause line this week. Hold anything you can't undo…") need both.
 */
export const pauseConditionOnly = (value: string): string => {
  const stripped = value.replace(/^Pause\s+(?:[^.;]*?\s+)?(?:if|when)\s+/i, "");
  return stripped === value ? value : `${stripped.charAt(0).toUpperCase()}${stripped.slice(1)}`;
};

/** The marker a paste carries when its numbers came off a saved copy rather than a live read. */
const SAVED_COPY_NOTE = "saved copy, not a live reading";

/**
 * The one provenance footer: the source as a reader names it, the record's
 * date, where it was read, and — when the numbers came off a saved copy — that
 * they did, then which inputs set the scores. The investor update, the
 * portfolio note, the slide in every format and the deck files each built their
 * own, and the slide's and the deck's dropped the date and the site.
 */
export const formatSourceFooter = ({
  sourceLabel,
  recordDate,
  isFallback,
  scoringBasis,
}: {
  sourceLabel: string;
  recordDate: string;
  isFallback?: boolean;
  /** The basis sentence (`ScoringBasis.sentence`), printed as the footer's last clause. */
  scoringBasis?: { sentence: string };
}): string =>
  `Source: ${sourceLabel}, ${recordDate}, via whether.work${isFallback ? ` (${SAVED_COPY_NOTE})` : ""}${
    scoringBasis ? ` · ${basisClause(scoringBasis.sentence)}` : ""
  }`;
