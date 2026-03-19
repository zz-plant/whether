/** Lightweight weekly posture history for homepage memory-rail assembly. */
import { z } from "zod";

import type { RegimeKey } from "../regimeEngine";
import rawWeeklyPostures from "../../data/summary_memory_rail_weekly.json";

const WeeklyPostureEntrySchema = z.object({
  record_date: z.string(),
  regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) as z.ZodType<RegimeKey>,
});

const WeeklyPostureHistorySchema = z.array(WeeklyPostureEntrySchema);

export type WeeklyPostureHistoryEntry = z.infer<typeof WeeklyPostureEntrySchema>;

export const parseWeeklyPostureHistory = (input: unknown): WeeklyPostureHistoryEntry[] => {
  const parsed = WeeklyPostureHistorySchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Weekly posture history failed validation.", parsed.error.format());
  return [];
};

const sortedWeeklyPostureHistory = parseWeeklyPostureHistory(rawWeeklyPostures).sort(
  (left, right) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime(),
);

export const getWeeklyPostureHistory = () => sortedWeeklyPostureHistory;
