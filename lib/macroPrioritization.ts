import type { MacroSeriesReading, MacroSeriesId } from "./types";

const impactWeights: Record<MacroSeriesId, number> = {
  BBB_CREDIT_SPREAD: 1,
  UNEMPLOYMENT_RATE: 0.75,
  CPI_YOY: 0.6,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RECENCY_WINDOW_DAYS = 120;

export const buildMacroPriorityScore = (signal: MacroSeriesReading, now = Date.now()) => {
  const impact = impactWeights[signal.id] ?? 0.5;
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
