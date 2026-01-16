/**
 * Treasury data schema for validating snapshots and enforcing contract alignment.
 * Keeps offline fallbacks safe and traceable before use in the Regime Station flow.
 */
import { z } from "zod";

export const TreasuryYieldsSchema = z.object({
  oneMonth: z.number().nullable(),
  threeMonth: z.number().nullable().optional(),
  twoYear: z.number().nullable(),
  tenYear: z.number().nullable(),
});

export const TreasuryDataSchema = z.object({
  source: z.string(),
  record_date: z.string(),
  fetched_at: z.string(),
  isLive: z.boolean(),
  yields: TreasuryYieldsSchema,
});
