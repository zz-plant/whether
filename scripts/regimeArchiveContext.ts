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
import { execFileSync } from "node:child_process";
import type { MacroSeriesReading } from "../lib/types";
import { FRED_BASE_URL, isMissingFredValue } from "../lib/fred";
import {
  BASE_RATE_VELOCITY_LOOKBACK_DAYS,
  BASE_RATE_VELOCITY_MAX_GAP_DAYS,
  BASE_RATE_VELOCITY_MIN_GAP_DAYS,
} from "../lib/regimeEngineCore";

export type SeriesPoint = { date: string; time: number; value: number | null };
export type SeriesDataset = { points: SeriesPoint[]; map: Map<string, number> };

export const MS_PER_DAY = 86400000;

const VIX_LOOKBACK_DAYS = 130;

/**
 * Parse a FRED CSV export into the dataset shape the generators slice.
 *
 * A missing observation stays in `points` as a null, so the calendar is intact
 * for date arithmetic, and stays out of `map`. The export marks a missing value
 * with an empty field today and marked it "." before; both are absences
 * (`isMissingFredValue`), never a print of 0. The three generators each carried
 * a copy of this parser that guarded only against ".", so every market holiday
 * in the window read as a 0 yield or a 0 VIX close — seven month-end records
 * published with tightness 0 as a result.
 */
export const parseSeries = (csv: string): SeriesDataset => {
  const lines = csv.trim().split(/\r?\n/);
  const points: SeriesPoint[] = [];

  for (const line of lines.slice(1)) {
    const [date, rawValue] = line.split(",");
    if (!date) {
      continue;
    }
    const value = isMissingFredValue(rawValue) ? null : Number(rawValue);
    points.push({
      date,
      time: Date.parse(`${date}T00:00:00Z`),
      value: Number.isFinite(value) ? value : null,
    });
  }

  const map = new Map<string, number>();
  for (const point of points) {
    if (point.value !== null) {
      map.set(point.date, point.value);
    }
  }

  return { points, map };
};

/** The last point that carries a value — a holiday placeholder is skipped —
 *  or null when nothing in the range does. */
export const getLatestValidDate = (points: SeriesPoint[]): (SeriesPoint & { value: number }) | null => {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    const { value } = point;
    if (value !== null) {
      return { ...point, value };
    }
  }
  return null;
};

/**
 * Fetch one FRED series in full through the CSV export: `fetch()` first, and
 * when that fails for any reason, `curl` — which has succeeded where Bun's
 * fetch has not on some networks — with one warning naming the failure.
 */
export const fetchSeries = async (seriesId: string): Promise<SeriesDataset> => {
  const sourceUrl = `${FRED_BASE_URL}?id=${seriesId}`;

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`FRED series fetch failed for ${seriesId}: ${response.status}`);
    }
    return parseSeries(await response.text());
  } catch (error) {
    const csv = execFileSync("curl", ["-fsSL", sourceUrl], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (error instanceof Error) {
      console.warn(`fetch() failed for ${seriesId}; retried with curl fallback (${error.message}).`);
    }
    return parseSeries(csv);
  }
};

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

export type BaseRateVelocityWindow = {
  compareDate: string;
  compareValue: number;
  latestDate: string;
  latestValue: number;
};

/**
 * The two observations the tightening-speed term resolves its delta from: the
 * latest base-rate print at or before the period, and the one its gap to the
 * lookback window favors. The daily series is too heavy to store per cache
 * entry, so the runtime replay carries this pair instead and evaluates the
 * same delta the archive generators compute from the full window.
 */
export const resolveBaseRateVelocityWindow = (
  dataset: SeriesDataset,
  asOfTime: number,
): BaseRateVelocityWindow | null => {
  const cutoffMs = asOfTime - VIX_LOOKBACK_DAYS * MS_PER_DAY;
  const observations = dataset.points.filter(
    (point): point is SeriesPoint & { value: number } =>
      point.time <= asOfTime && point.time >= cutoffMs && point.value !== null,
  );
  const latest = observations.at(-1);
  if (!latest) {
    return null;
  }

  let best: (SeriesPoint & { value: number }) | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const observation of observations) {
    const gap = (latest.time - observation.time) / MS_PER_DAY;
    if (Number.isNaN(gap) || gap < BASE_RATE_VELOCITY_MIN_GAP_DAYS || gap > BASE_RATE_VELOCITY_MAX_GAP_DAYS) {
      continue;
    }
    const distance = Math.abs(gap - BASE_RATE_VELOCITY_LOOKBACK_DAYS);
    if (distance < bestDistance) {
      best = observation;
      bestDistance = distance;
    }
  }

  if (!best) {
    return null;
  }

  return {
    compareDate: best.date,
    compareValue: best.value,
    latestDate: latest.date,
    latestValue: latest.value,
  };
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
  // A holiday sits in the series as a null placeholder. The period's reading
  // is the last close, not the placeholder; the staleness rule below still
  // refuses one from more than a week back.
  const latest = getLatestValidDate(atOrBefore);
  if (!latest) {
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
