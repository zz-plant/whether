import type { CrossingRiskLabel } from "./forecastModel";
import type { RegimeAssessment } from "../regimeEngine";
import { formatScoreValue } from "../formatters";

export type RegimeSignalKey = "tightness" | "riskAppetite" | "baseRate" | "curveSlope";

export type DecisionPhraseTriplet = {
  action: string;
  threshold: string;
  reversal: string;
};

export const publicDecisionLabels = {
  call: "Current call",
  action: "Action now",
  threshold: "Pause if",
  reversal: "Change course if",
  evidence: "Evidence",
} as const;

export const boundedDecisionPhraseFallbacks: DecisionPhraseTriplet = {
  action: "Stage approvals",
  threshold: "Pause if thresholds weaken",
  reversal: "Reverse only after threshold recovery",
};

export const regimeSignalLabelByKey: Record<RegimeSignalKey, string> = {
  tightness: "Capital tightness",
  riskAppetite: "Risk appetite",
  baseRate: "Base rate",
  curveSlope: "Yield curve slope",
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
      `Tightness moved ${isTight ? "above" : "below"} ${formatScoreValue(tightnessThreshold)}.`
    );
  }
  if (wasBrave !== isBrave) {
    reasons.push(
      `Risk appetite moved ${isBrave ? "above" : "below"} ${formatScoreValue(riskThreshold)}.`
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      `Capital posture shifted as tightness (${formatScoreValue(previous.scores.tightness)} → ${formatScoreValue(current.scores.tightness)}) ` +
        `and risk appetite (${formatScoreValue(previous.scores.riskAppetite)} → ${formatScoreValue(current.scores.riskAppetite)}) moved across boundaries.`
    );
  }

  return {
    changed: regimeChanged,
    currentRegime: current.regime,
    previousRegime: previous.regime,
    currentRecordDate,
    previousRecordDate,
    reasons,
    summary: `Capital posture moved from ${previous.regime} to ${current.regime}.`,
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

export const formatDecisionAction = (value: string, fallback = boundedDecisionPhraseFallbacks.action): string =>
  compactDecisionPhrase({ value, fallback });

export const formatDecisionThreshold = (value: string, fallback = boundedDecisionPhraseFallbacks.threshold): string =>
  compactDecisionPhrase({ value, fallback, stripPrefix: /^Pause\s+/i });

export const formatDecisionReversal = (value: string, fallback = boundedDecisionPhraseFallbacks.reversal): string =>
  compactDecisionPhrase({ value, fallback, stripPrefix: /^Resume\s+/i });

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
  line: string;
};

export const buildCompactFreshnessMeta = ({
  updatedAtLabel,
  confidenceLabel,
  isFallbackSnapshot,
  now = new Date(),
  staleAfterHours = 6,
}: {
  updatedAtLabel: string;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  isFallbackSnapshot: boolean;
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
  const confidenceCue = confidenceLabel === "HIGH" ? "high-reliability" : confidenceLabel === "MED" ? "mixed-reliability" : "low-reliability";
  const fallbackCue = maxAge === "stale" ? "degraded" : "live";
  const ageCue = ageHours === null
    ? ""
    : ageHours < 1
      ? " (<1h old)"
      : ` (${Math.round(ageHours)}h old)`;

  return {
    updatedAtLabel: normalizedUpdatedAt,
    confidenceCue,
    maxAge,
    line: `Updated ${normalizedUpdatedAt}${ageCue} · ${fallbackCue} · ${confidenceCue}`,
  };
};
