import { FALLBACK_PAUSE_THRESHOLD } from "./reportCopy";
import type { RegimeAssessment } from "../regimeEngine";
import type { SourceFreshnessStatus } from "./sourceHealth";
import { formatScoreValue, formatThresholdNumber } from "../formatters";
import { REGIME_LABELS } from "../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
/* Value import against a type-only back-edge: `signalTranslations` imports
   `RegimeSignalKey` from this module with `import type`, which erases, so this
   is not a runtime cycle. */
import { regimeSignalLabel } from "./signalTranslations";

export type RegimeSignalKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

type DecisionPhraseTriplet = {
  action: string;
  threshold: string;
  reversal: string;
};

// action/threshold/reversal are the contract's imperative forms — read them
// from the one vocabulary rather than restating them. call/evidence are this
// surface's own words and have no slot in DECISION_CONTRACT_LABELS.
export const publicDecisionLabels = {
  call: "Guidance",
  action: DECISION_CONTRACT_LABELS.action.doNow,
  threshold: DECISION_CONTRACT_LABELS.threshold.pauseIf,
  reversal: DECISION_CONTRACT_LABELS.reversal.resumeWhen,
  evidence: "Evidence",
} as const;

const boundedDecisionPhraseFallbacks: DecisionPhraseTriplet = {
  action: "Stage approvals",
  threshold: FALLBACK_PAUSE_THRESHOLD,
  reversal: "Reverse only after threshold recovery",
};

/** The one table, re-exported under the name this module's callers already use. */
export const regimeSignalLabelByKey: Record<RegimeSignalKey, string> = regimeSignalLabel;

/**
 * A change of conditions, or a crossed call-change line, between the earlier
 * reading and this one. The earlier reading needs only its conditions and its
 * two scores, so a published brief serves as well as a full assessment; both
 * readings are judged against today's lines.
 */
export const buildRegimeAlert = (
  current: RegimeAssessment,
  previous: Pick<RegimeAssessment, "regime"> & { scores: Pick<RegimeAssessment["scores"], "tightness" | "riskAppetite"> },
  currentRecordDate: string,
  previousRecordDate: string
) => {
  const tightnessThreshold = current.thresholds.tightnessRegime;
  const riskThreshold = current.thresholds.riskAppetiteRegime;
  const wasTight = previous.scores.tightness > tightnessThreshold;
  const isTight = current.scores.tightness > tightnessThreshold;
  const wasBrave = previous.scores.riskAppetite > riskThreshold;
  const isBrave = current.scores.riskAppetite > riskThreshold;
  const regimeChanged = current.regime !== previous.regime;
  const thresholdCrossed = wasTight !== isTight || wasBrave !== isBrave;
  const reasons: string[] = [];

  if (!regimeChanged && !thresholdCrossed) {
    return null;
  }

  if (wasTight !== isTight) {
    reasons.push(
      `Funding pressure crossed ${isTight ? "above" : "below"} ${formatThresholdNumber(tightnessThreshold)}.`
    );
  }
  if (wasBrave !== isBrave) {
    reasons.push(
      `Risk appetite crossed ${isBrave ? "above" : "below"} ${formatThresholdNumber(riskThreshold)}.`
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      `Funding pressure moved ${formatScoreValue(previous.scores.tightness)} → ${formatScoreValue(current.scores.tightness)} ` +
        `and risk appetite moved ${formatScoreValue(previous.scores.riskAppetite)} → ${formatScoreValue(current.scores.riskAppetite)}, ` +
        "carrying the posture across a boundary."
    );
  }

  return {
    changed: regimeChanged,
    currentRegime: current.regime,
    previousRegime: previous.regime,
    currentRecordDate,
    previousRecordDate,
    reasons,
    summary: `The operating stance moved from ${REGIME_LABELS[previous.regime]} to ${REGIME_LABELS[current.regime]}.`,
  };
};

/*
 * The margin (2026-10-09). The engine and the API call it `confidence`, and every
 * page printed "Confidence: Low" — beside "Freeze new commitments", which read as
 * the product doubting its own advice. /calibration shows what the number is: how
 * far the scores sit from the line where conditions change, not a probability, and
 * conditions held in most months at every distance. So a reader is shown the
 * distance, under its own name. Codes and API fields keep `confidence`.
 */
/** The label for what the API calls `confidence`. */
export const MARGIN_LABEL = "Margin";

const marginBandWords: Record<"LOW" | "MED" | "HIGH", string> = {
  LOW: "Close to the line",
  MED: "Within reach of the line",
  HIGH: "Clear of the line",
};

const marginPlainLabels: Record<"LOW" | "MED" | "HIGH", string> = {
  LOW: "Close to the line where conditions change (stage decisions)",
  MED: "Within reach of the line where conditions change",
  HIGH: "Clear of the line where conditions change",
};

/** The band under its label, for a meta line that runs facts together: "Margin: close to the line". */
export const formatMarginStamp = (confidence: string): string =>
  `${MARGIN_LABEL}: ${formatMarginBand(confidence).toLowerCase()}`;

/** The margin at its shortest, for the sticky strip and a share line: "Margin 1 pt", or the band. */
export const formatStripMargin = (confidence: string, points?: number | null): string =>
  points === undefined || points === null
    ? formatMarginBand(confidence)
    : `${MARGIN_LABEL} ${points} ${points === 1 ? "pt" : "pts"}`;

/** The margin with the score it is measured on: "Risk appetite 1 pt from its change line". */
export const formatMarginReading = (margin: { signal: "tightness" | "riskAppetite"; points: number }): string => {
  const label = regimeSignalLabel[margin.signal];
  return margin.points === 0
    ? `${label} at its change line`
    : `${label} ${margin.points} ${margin.points === 1 ? "pt" : "pts"} from its change line`;
};

/**
 * The one sentence for "how far is this signal from its line".
 *
 * Five builders used to write this independently — the homepage evidence list,
 * two interpretation views, the evidence rows and the Slack brief — each with
 * its own wording and precision. The command bar already shows the number
 * beside the posture map; every prose surface now states it the same way.
 */
export const formatBoundaryDistance = ({
  label,
  points,
  threshold,
}: {
  label: string;
  points: number;
  threshold: number;
}): string => `${label} is ${points.toFixed(1)} points from its ${formatThresholdNumber(threshold)} line.`;

export const formatConfidencePlainLabel = (confidence: "LOW" | "MED" | "HIGH"): string =>
  marginPlainLabels[confidence];

/**
 * The confidence reading as a reader meets it, not as the engine stores it.
 *
 * The chip beside the week switcher read `MED` — three letters, uppercase,
 * unexplained — on the one control whose job is telling a stranger how much to
 * trust the page they just landed on. `LOW` is worse: it is the state that most
 * needs to be understood and the one abbreviated hardest.
 *
 * Takes a widened `string` because the two surfaces that print it hold display
 * strings whose provenance the type system has lost, and one of them already
 * carried the phrase "High confidence" as its own fallback while the other
 * carried the code — the drift this collapses. An unrecognised value passes
 * through rather than being reshaped into a claim nothing produced.
 */
const isConfidenceCode = (value: string): value is "LOW" | "MED" | "HIGH" =>
  value === "LOW" || value === "MED" || value === "HIGH";

export const formatMarginBand = (confidence: string): string =>
  isConfidenceCode(confidence) ? marginBandWords[confidence] : confidence;

/**
 * The band with the score it is measured on, when the caller holds it: "Close to
 * the line (risk appetite is 1 point from its change line)". The points are that
 * score's own, so a reader can check them against the score printed beside it,
 * and spelled out, because a paste lands where no page explains "pts".
 */
export const formatMargin = (
  confidence: string,
  margin?: { signal: "tightness" | "riskAppetite"; points: number } | null,
): string => {
  const band = formatMarginBand(confidence);
  if (!margin) return band;
  const signal = regimeSignalLabel[margin.signal].toLowerCase();
  const distance =
    margin.points === 0
      ? `${signal} is at its change line`
      : `${signal} is ${margin.points} ${margin.points === 1 ? "point" : "points"} from its change line`;
  return `${band} (${distance})`;
};

/** Status tone for a confidence reading.
 *
 *  Takes the code, never the plain label. `app/trust/page.tsx` used to compare
 *  the prose from `formatConfidencePlainLabel` ("Medium (mixed signal
 *  reliability)") against "MED" and "HIGH": neither branch could ever match, so
 *  every confidence level — HIGH included — painted the alert tone on the page
 *  whose entire subject is how much to trust the call. Comparing a `string`
 *  against a literal type-checks, which is why the mistake was invisible; a
 *  parameter typed to the union rejects the plain label at the call site. */
export const resolveConfidenceTone = (
  confidence: "LOW" | "MED" | "HIGH",
): "positive" | "caution" | "alert" =>
  confidence === "HIGH" ? "positive" : confidence === "MED" ? "caution" : "alert";

export const formatRegimeSignalValue = (value: number | null, key: RegimeSignalKey): string => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  if (key === "tightness" || key === "riskAppetite") {
    return formatScoreValue(value);
  }

  /* Rates as they are quoted, 4.05 not 4.0: at one place the brief's chip read
     "3.9 → 4.0" beside a sentence saying the rate rose 0.2. */
  return value.toFixed(2);
};

export const formatTrendArrow = (delta: number | null): "↑" | "↓" | "→" => {
  if (delta === null || Number.isNaN(delta) || delta === 0) {
    return "→";
  }

  return delta > 0 ? "↑" : "↓";
};

/**
 * Normalizes a generated fragment into a standalone sentence: capitalized, with
 * terminal punctuation. Use this instead of splicing fragments into a carrier
 * sentence — lowercasing a clause and gluing it after "so …" produces
 * ungrammatical output whenever the fragment is itself a full sentence.
 */
const toSentence = (value: string | undefined | null): string => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const capitalized = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

/** Joins already-complete sentences, dropping empties. */
export const joinSentences = (...parts: Array<string | undefined | null>): string =>
  parts.map(toSentence).filter((part) => part.length > 0).join(" ");

export const extractCompactClause = (value: string, fallback: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }

  let boundaryIndex = -1;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === ";") {
      boundaryIndex = index;
      break;
    }

    if (character !== ".") {
      continue;
    }

    const previousCharacter = normalized[index - 1] ?? "";
    const nextCharacter = normalized[index + 1] ?? "";
    const isDecimalPoint = /\d/.test(previousCharacter) && /\d/.test(nextCharacter);
    if (!isDecimalPoint) {
      boundaryIndex = index;
      break;
    }
  }

  const firstClause = boundaryIndex >= 0 ? normalized.slice(0, boundaryIndex) : normalized;
  return (firstClause.trim() || fallback).replace(/\.$/, "");
};

const compactDecisionPhrase = ({
  value,
  fallback,
  stripPrefix,
}: {
  value: string;
  fallback: string;
  stripPrefix?: RegExp;
}): string => {
  const normalized = stripPrefix ? value.replace(stripPrefix, "") : value;
  return extractCompactClause(normalized, fallback);
};

const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Rule sentences are written verb + object + condition ("Pause net-new hiring
 * if funding pressure rises above 76"). Under a slot label that already carries
 * the verb ("Pause if:", "Guardrail:") the object has to go too, or the row
 * reads "Pause if: net-new hiring if funding pressure…". The object is named by
 * the area heading the rule sits under, so only the condition survives here.
 */
const compactDecisionCondition = ({
  value,
  fallback,
  verbPrefix,
  conditionPrefix,
}: {
  value: string;
  fallback: string;
  verbPrefix: RegExp;
  conditionPrefix: RegExp;
}): string => {
  const stripped = conditionPrefix.test(value)
    ? value.replace(conditionPrefix, "")
    : value.replace(verbPrefix, "");
  const clause = extractCompactClause(stripped, fallback);
  return clause === fallback ? clause : capitalizeFirst(clause);
};

export const formatDecisionAction = (value: string, fallback = boundedDecisionPhraseFallbacks.action): string =>
  compactDecisionPhrase({ value, fallback });

export const formatDecisionThreshold = (value: string, fallback = boundedDecisionPhraseFallbacks.threshold): string =>
  compactDecisionCondition({
    value,
    fallback,
    verbPrefix: /^Pause\s+/i,
    conditionPrefix: /^Pause\s+(?:[^.;]*?\s+)?(?:if|when)\s+/i,
  });

export const formatDecisionReversal = (value: string, fallback = boundedDecisionPhraseFallbacks.reversal): string =>
  compactDecisionCondition({
    value,
    fallback,
    verbPrefix: /^Resume\s+/i,
    conditionPrefix: /^Resume\s+(?:[^.;]*?\s+)?(?:when|once|after|if)\s+/i,
  });

export const formatDecisionTriplet = ({
  action,
  threshold,
  reversal,
  fallbacks = boundedDecisionPhraseFallbacks,
}: {
  action?: string;
  threshold?: string;
  reversal?: string;
  fallbacks?: DecisionPhraseTriplet;
}): DecisionPhraseTriplet => ({
  action: formatDecisionAction(action ?? "", fallbacks.action),
  threshold: formatDecisionThreshold(threshold ?? "", fallbacks.threshold),
  reversal: formatDecisionReversal(reversal ?? "", fallbacks.reversal),
});

const countConditionComplexityMarkers = (value: string): number => {
  const matches = value.match(/[,;:]|\b(and|or|unless|until|after)\b/gi);
  return matches ? matches.length : 0;
};

export const shouldSplitDecisionConditionRows = ({
  trigger,
  reversal,
  maxInlineCharacters = 160,
  maxInlineComplexity = 4,
}: {
  trigger: string;
  reversal: string;
  maxInlineCharacters?: number;
  maxInlineComplexity?: number;
}): boolean => {
  const normalizedTrigger = trigger.trim();
  const normalizedReversal = reversal.trim();
  const totalCharacters = normalizedTrigger.length + normalizedReversal.length;
  const complexityScore =
    countConditionComplexityMarkers(normalizedTrigger)
    + countConditionComplexityMarkers(normalizedReversal);

  return totalCharacters > maxInlineCharacters || complexityScore > maxInlineComplexity;
};

export type CompactFreshnessMeta = {
  updatedAtLabel: string;
  confidenceCue: string;
  maxAge: "fresh" | "stale";
  freshnessStatus: SourceFreshnessStatus;
  mode: "live" | "cached" | "historical";
  timestamp: string | null;
  ageHours: number | null;
  line: string;
};

type TrustStripDisplay = {
  freshnessBadge: string;
  confidenceBadge: string;
  provenanceBadge: string;
  provenanceHref: "/trust";
  fallbackBadge: string | null;
  warningCopy: string | null;
  commitmentLabel: "Decision ready" | "Review before commitment";
  degraded: boolean;
};

export const buildCompactFreshnessMeta = ({
  updatedAtLabel,
  confidenceLabel,
  isFallbackSnapshot,
  isHistoricalSelection = false,
  now = new Date(),
  staleAfterHours = 6,
}: {
  updatedAtLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  isFallbackSnapshot: boolean;
  isHistoricalSelection?: boolean;
  now?: Date;
  staleAfterHours?: number;
}): CompactFreshnessMeta => {
  const normalizedUpdatedAt = updatedAtLabel.trim().length > 0 ? updatedAtLabel.trim() : "Unavailable";
  const timestamp = Date.parse(normalizedUpdatedAt);
  const hasParseableTimestamp = Number.isFinite(timestamp);
  const ageHours = hasParseableTimestamp ? Math.max(0, (now.getTime() - timestamp) / 3_600_000) : null;
  const staleByDate = normalizedUpdatedAt === "Unavailable" || ageHours === null;
  const staleByAge = ageHours !== null && ageHours > staleAfterHours;
  const maxAge: "fresh" | "stale" = isFallbackSnapshot || staleByDate || staleByAge ? "stale" : "fresh";
  const freshnessStatus: SourceFreshnessStatus = staleByDate
    ? "unknown"
    : staleByAge || isFallbackSnapshot
      ? "stale"
      : "fresh";
  const mode: "live" | "cached" | "historical" = isHistoricalSelection
    ? "historical"
    : isFallbackSnapshot
      ? "cached"
      : "live";
  /* The margin, where this said "high-reliability": the band measures distance from a change line, not reliability. */
  const confidenceCue = formatMarginStamp(confidenceLabel).toLowerCase();
  const fallbackCue = mode === "historical"
    ? "historical"
    : maxAge === "stale"
      ? "degraded"
      : "live";
  const ageCue = ageHours === null
    ? ""
    : ageHours < 1
      ? " (<1h old)"
      : ` (${Math.round(ageHours)}h old)`;

  return {
    updatedAtLabel: normalizedUpdatedAt,
    confidenceCue,
    maxAge,
    freshnessStatus,
    mode,
    timestamp: hasParseableTimestamp ? new Date(timestamp).toISOString() : null,
    ageHours,
    line: `Updated ${normalizedUpdatedAt}${ageCue} · ${fallbackCue} · ${confidenceCue}`,
  };
};

export const formatTrustStripDisplay = ({
  updatedAtLabel,
  confidenceLabel,
  isFallbackSnapshot,
  provenanceCount,
  now = new Date(),
  staleAfterHours = 6,
}: {
  updatedAtLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  isFallbackSnapshot: boolean;
  provenanceCount: number;
  now?: Date;
  staleAfterHours?: number;
}): TrustStripDisplay => {
  const freshness = buildCompactFreshnessMeta({
    updatedAtLabel,
    confidenceLabel,
    isFallbackSnapshot,
    now,
    staleAfterHours,
  });
  const freshnessBadge = freshness.updatedAtLabel === "Unavailable"
    ? "Freshness unavailable"
    : freshness.maxAge === "stale"
      ? "Freshness stale"
      : "Freshness fresh";
  const confidenceBadge = formatMarginBand(confidenceLabel);
  const safeProvenanceCount = Math.max(0, Math.round(provenanceCount));
  const provenanceBadge = `Sources ${safeProvenanceCount}`;
  const degraded = isFallbackSnapshot || freshness.maxAge === "stale";

  return {
    freshnessBadge,
    confidenceBadge,
    provenanceBadge,
    provenanceHref: "/trust",
    fallbackBadge: degraded ? "Fallback active" : null,
    warningCopy: degraded ? "Some inputs are degraded—review before commitment." : null,
    commitmentLabel: degraded ? "Review before commitment" : "Decision ready",
    degraded,
  };
};
