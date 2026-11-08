import type { loadHomePageAssembly } from "../lib/report/homePageAssemblyLoader";
import type { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { formatDateUTC } from "../lib/formatters";
import { comparisonBasis } from "../lib/report/comparisonBasis";
import { describeConditionsTrail } from "../lib/report/home/homeSectionModel";
import { describeScoreMovementCaveat } from "../lib/report/scoreMovement";

type ReportData = Awaited<ReturnType<typeof loadHomePageAssembly>>["reportData"];

const CONDITIONS_TRAIL_MONTHS = 6;

/** Raw inputs behind the scores, and the names a reader knows them by. */
const INPUT_HISTORY_LABELS: Record<string, string> = {
  CPI_YOY: "Inflation (CPI)",
  UNEMPLOYMENT_RATE: "Unemployment",
  HY_CREDIT_SPREAD: "High-yield spread",
  BBB_CREDIT_SPREAD: "BBB spread",
  VIX_INDEX: "Volatility (VIX)",
  CHICAGO_FCI: "Financial conditions",
};

/**
 * The two history series the brief draws: the month-end conditions path and the raw
 * inputs behind the scores. Both are pure projections of data the report already loaded;
 * they live here so the route does not carry their shaping rules.
 */
export function buildHomeHistoryModels({
  reportData,
  alignedRegimeHistory,
}: {
  reportData: ReportData;
  alignedRegimeHistory: ReturnType<typeof getMonthlyRegimeHistory>;
}) {
  /* The conditions map's path: the month-end readings before this reading's month,
     oldest first. The month in progress is left out, because the cron writes it from the
     same week the current point already draws. */
  const currentMonthKey = reportData.treasury.record_date.slice(0, 7);
  const conditionsTrailEntries = alignedRegimeHistory
    .filter((entry) => entry.record_date.slice(0, 7) < currentMonthKey)
    .flatMap((entry) =>
      typeof entry.tightness === "number" && typeof entry.riskAppetite === "number"
        ? [{ recordDate: entry.record_date, tightness: entry.tightness, riskAppetite: entry.riskAppetite }]
        : [],
    )
    .slice(-CONDITIONS_TRAIL_MONTHS);

  /* The path is month-ends whichever reading the week compares with, so its
     like-for-like note reads the month-end split and is dated by the month-end. */
  const conditionsTrail = {
    points: conditionsTrailEntries.map((entry) => ({
      tightness: entry.tightness,
      riskAppetite: entry.riskAppetite,
      label: formatDateUTC(entry.recordDate),
    })),
    caption: describeConditionsTrail(conditionsTrailEntries.map((entry) => entry.recordDate)),
    caveat: describeScoreMovementCaveat(
      reportData.monthEndComparison?.movement,
      comparisonBasis(reportData.monthEndComparison?.comparedWith),
    ),
  };

  /* Trailing history of the raw inputs behind the scores, from the macro series the report
     already loaded (no extra read). Null values are dropped; series with fewer than three
     readings render nothing. */
  const inputHistory = reportData.macroSeries
    .filter((series) => series.id in INPUT_HISTORY_LABELS)
    .map((series) => ({
      key: series.id,
      label: INPUT_HISTORY_LABELS[series.id],
      points: (series.history ?? [])
        .filter((point): point is { date: string; value: number } =>
          typeof point.value === "number" && Number.isFinite(point.value))
        .map((point) => ({ label: formatDateUTC(point.date), value: point.value })),
    }))
    .filter((series) => series.points.length >= 3);

  return { conditionsTrail, inputHistory };
}
