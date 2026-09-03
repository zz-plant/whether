import type { CrossingRiskLabel } from "./forecastModel";
import type { RegimeAssessment } from "../regimeEngine";
import type { SourceFreshnessStatus } from "./sourceHealth";
import { formatScoreValue } from "../formatters";
import { REGIME_LABELS } from "../regimePresentation";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";

export type RegimeSignalKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

export type DecisionPhraseTriplet = {
  action: string;
  threshold: string;
  reversal: string;
};

// action/threshold are the contract's imperative forms — read them from the one
// vocabulary rather than restating them. call/reversal/evidence are this
// surface's own words and have no slot in DECISION_CONTRACT_LABELS.
export const publicDecisionLabels = {
  call: "Posture",
  action: DECISION_CONTRACT_LABELS.action.doNow,
  threshold: DECISION_CONTRACT_LABELS.threshold.pauseIf,
  reversal: "Re-open when",
  evidence: "Evidence",
} as const;

export const boundedDecisionPhraseFallbacks: DecisionPhraseTriplet = {
  action: "Stage approvals",
  threshold: "Pause if thresholds weaken",
  reversal: "Reverse only after threshold recovery",
};

/** Same canonical names as `deltaLabelBySignal` and the glossary in `reportCopy.ts`. */
export const regimeSignalLabelByKey: Record<RegimeSignalKey, string> = {
  tightness: "Funding pressure",
  riskAppetite: "Risk appetite",
  baseRate: "Fed interest rate",
  curveSlope: "Recession warning gauge",
};

export const buildRegimeAlert = (
  current: RegimeAssessment,
  previous: RegimeAssessment,
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
      `Funding pressure crossed ${isTight ? "above" : "below"} ${formatScoreValue(tightnessThreshold)}.`
    );
  }
  if (wasBrave !== isBrave) {
    reasons.push(
      `Risk appetite crossed ${isBrave ? "above" : "below"} ${formatScoreValue(riskThreshold)}.`
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

const crossingRiskLabels: Record<CrossingRiskLabel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const confidencePlainLabels: Record<"LOW" | "MED" | "HIGH", string> = {
  LOW: "Low (near threshold, stage decisions)",
  MED: "Medium (mixed signal reliability)",
  HIGH: "High (safe for near-term operating cadence)",
};

export const formatProbabilityPercent = (probability: number, fractionDigits = 0): string => {
  const bounded = Math.min(100, Math.max(0, probability));
  return `${bounded.toFixed(fractionDigits)}%`;
};

export const formatRegimeProbability = (probability: number): string =>
  formatProbabilityPercent(probability, 0);

export const formatCrossingRiskLabel = (risk: CrossingRiskLabel): string => crossingRiskLabels[risk];

export const formatConfidencePlainLabel = (confidence: "LOW" | "MED" | "HIGH"): string =>
  confidencePlainLabels[confidence];

export const formatRegimeSignalValue = (value: number | null, key: RegimeSignalKey): string => {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  if (key === "tightness" || key === "riskAppetite") {
    return formatScoreValue(value);
  }

  return value.toFixed(1);
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
export const toSentence = (value: string | undefined | null): string => {
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

export type TrustStripDisplay = {
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
  const confidenceCue = confidenceLabel === "HIGH" ? "high-reliability" : confidenceLabel === "MED" ? "mixed-reliability" : "low-reliability";
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
  const confidenceBadge = `Confidence ${confidenceLabel}`;
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
