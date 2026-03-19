/** Lightweight monthly regime history for forecast-history assembly. */
import { z } from "zod";

import type { RegimeKey } from "../regimeEngine";
import rawMonthlyRegimeHistory from "../../data/summary_monthly_regime_history.json";

const MonthlyRegimeHistoryEntrySchema = z.object({
  record_date: z.string(),
  regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) as z.ZodType<RegimeKey>,
});

const MonthlyRegimeHistorySchema = z.array(MonthlyRegimeHistoryEntrySchema);

export type MonthlyRegimeHistoryEntry = z.infer<typeof MonthlyRegimeHistoryEntrySchema>;

export const parseMonthlyRegimeHistory = (input: unknown): MonthlyRegimeHistoryEntry[] => {
  const parsed = MonthlyRegimeHistorySchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Monthly regime history failed validation.", parsed.error.format());
  return [];
};

const sortedMonthlyRegimeHistory = parseMonthlyRegimeHistory(rawMonthlyRegimeHistory).sort(
  (left, right) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime(),
);

export const getMonthlyRegimeHistory = () => sortedMonthlyRegimeHistory;
