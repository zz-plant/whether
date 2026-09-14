/**
 * Shared evaluation context for the archive generators.
 *
 * The generators walk history sequentially, so they can supply what a
 * point-in-time `evaluateRegime` call cannot: the machine snapshot threaded
 * forward (flips confirm through the gate), the trailing base-rate window the
 * tightening-speed term reads, and the period's VIX reading that drives the
 * shock haircut and the market-stress veto. Each generator fetches the series
 * once per run and slices per period here.
 */
import type { MacroSeriesReading } from "../lib/types";

export type SeriesPoint = { date: string; time: number; value: number | null };
export type SeriesDataset = { points: SeriesPoint[]; map: Map<string, number> };

export const MS_PER_DAY = 86400000;

const VIX_LOOKBACK_DAYS = 130;

/** Trailing base-rate window for the velocity term: every observation at or
 *  before the record date inside the lookback, ascending. */
export const resolveBaseRateWindow = (
  dataset: SeriesDataset,
  recordDate: string,
  asOfTime: number,
): { date: string; value: number | null }[] => {
  const cutoffMs = asOfTime - VIX_LOOKBACK_DAYS * MS_PER_DAY;
  return dataset.points
    .filter((point) => point.time <= asOfTime && point.time >= cutoffMs)
    .map((point) => ({ date: point.date, value: point.value }));
};

export type VixReading = MacroSeriesReading;

/**
 * The period's VIX reading, or null when the series could not be fetched or has
 * no observation for the period. Null is the honest absence: the engine then
 * evaluates without the haircut and veto, the same as before they existed.
 */
export const resolveVixReading = (
  dataset: SeriesDataset | null,
  recordDate: string,
  asOfTime: number,
  fetchedAt: string,
): VixReading | null => {
  if (!dataset) {
    return null;
  }
  const atOrBefore = dataset.points.filter((point) => point.time <= asOfTime);
  const latest = atOrBefore.at(-1);
  if (!latest || latest.value === null) {
    return null;
  }
  // Stale beyond a week is an absence, not a reading — a monthly archive
  // period must not inherit a volatility print from the previous month.
  if (asOfTime - latest.time > 7 * MS_PER_DAY) {
    return null;
  }
  const history = atOrBefore
    .filter((point) => point.time >= asOfTime - VIX_LOOKBACK_DAYS * MS_PER_DAY)
    .map((point) => ({ date: point.date, value: point.value }));

  return {
    id: "VIX_INDEX",
    label: "CBOE volatility index (VIX)",
    value: latest.value,
    unit: "index",
    explanation: "Implied equity volatility used as a short-cycle shock and regime-boundary warning signal.",
    sourceLabel: "FRED",
    sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
    formulaUrl: "/formulas#vix",
    record_date: latest.date,
    fetched_at: fetchedAt,
    isLive: false,
    history,
  };
};

/** The VIX value a time-machine cache entry should carry, aligned to the
 *  record date; null when the series is unavailable for that period. */
export const resolveVixCacheValue = (
  dataset: SeriesDataset | null,
  recordDate: string,
  asOfTime: number,
): number | null => {
  if (!dataset) {
    return null;
  }
  const reading = resolveVixReading(dataset, recordDate, asOfTime, "");
  return reading?.value ?? null;
};
