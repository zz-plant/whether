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
  fallback_at: z.string().nullable().optional(),
  fallback_reason: z.string().nullable().optional(),
  yields: TreasuryYieldsSchema,
});

export const parseTreasuryData = (input: unknown) => {
  const parsed = TreasuryDataSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
};
