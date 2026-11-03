/**
 * The partial-run variables the archive generators read, as the scope the builders take
 * (`lib/summary/summaryRange.ts`). `bun run time-machine:update-summaries` sets
 * HISTORY_START_YEAR; HISTORY_WEEKS scopes the weekly write to its last N weeks.
 */
import type { ArchiveScope } from "../lib/summary/summaryRange";

const parseYearOverride = (value: string | undefined, label: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer year (received "${value}").`);
  }
  return parsed;
};

const parseHistoryWeeks = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`HISTORY_WEEKS must be a positive integer (received "${value}").`);
  }
  return parsed;
};

export const readArchiveScope = (env: Record<string, string | undefined> = process.env): ArchiveScope => ({
  startYear: parseYearOverride(env.HISTORY_START_YEAR, "HISTORY_START_YEAR"),
  endYear: parseYearOverride(env.HISTORY_END_YEAR, "HISTORY_END_YEAR"),
  historyWeeks: parseHistoryWeeks(env.HISTORY_WEEKS),
});
