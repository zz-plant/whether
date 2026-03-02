import type { MacroSeriesReading, MacroSeriesId } from "./types";

const impactWeights: Record<MacroSeriesId, number> = {
  HY_CREDIT_SPREAD: 1,
  VIX_INDEX: 0.98,
  CHICAGO_FCI: 0.96,
  BBB_CREDIT_SPREAD: 0.94,
  TECH_LAYOFF_TREND: 0.9,
  VC_FUNDING_VELOCITY: 0.88,
  SAAS_VALUATION_MULTIPLE: 0.84,
  EARNINGS_REVISION_INDEX: 0.8,
  AI_COMPUTE_COST_TREND: 0.68,
  REGULATORY_RISK_TRACKER: 0.65,
  UNEMPLOYMENT_RATE: 0.62,
  CPI_YOY: 0.58,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENCY_WINDOW_DAYS = 120;
const DEFAULT_IMPACT_WEIGHT = 0.5;

export const buildMacroPriorityScore = (signal: MacroSeriesReading, now = Date.now()) => {
  const impact = impactWeights[signal.id] ?? DEFAULT_IMPACT_WEIGHT;
  const recordTimestamp = Date.parse(signal.record_date);
  if (!Number.isFinite(recordTimestamp)) {
    return { impact, recency: 0, score: 0 };
  }

  const ageDays = Math.max(0, (now - recordTimestamp) / DAY_IN_MS);
  const recency = Math.max(0, 1 - ageDays / RECENCY_WINDOW_DAYS);
  return {
    impact,
    recency,
    score: Number((impact * recency).toFixed(4)),
  };
};

export const rankMacroSignalsByPriority = (series: MacroSeriesReading[], now = Date.now()) => {
  return [...series].sort((left, right) => {
    const rightPriority = buildMacroPriorityScore(right, now);
    const leftPriority = buildMacroPriorityScore(left, now);
    if (rightPriority.score !== leftPriority.score) {
      return rightPriority.score - leftPriority.score;
    }
    return right.record_date.localeCompare(left.record_date);
  });
};
