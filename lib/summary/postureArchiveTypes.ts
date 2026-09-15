/**
 * Schema for the compact posture archive index consumed by `/history/[period]`.
 *
 * Kept separate from the loader so `scripts/generatePostureArchiveIndex.ts` can
 * import the contract without importing the generated file it is about to write.
 */
import { z } from "zod";
import type { RegimeKey } from "../regimeEngine";

const RegimeSchema = z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) as z.ZodType<RegimeKey>;

const PostureArchiveRegimeShareSchema = z.object({
  regime: RegimeSchema,
  label: z.string(),
  periods: z.number(),
  share: z.number(),
});

const PostureArchiveTransitionSchema = z.object({
  asOf: z.string(),
  dateLabel: z.string(),
  from: RegimeSchema,
  fromLabel: z.string(),
  to: RegimeSchema,
  toLabel: z.string(),
});

const PostureArchiveRateSchema = z.object({
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  sourceUrl: z.string().optional(),
});

const PostureArchiveChildSchema = z.object({
  slug: z.string(),
  title: z.string(),
  regime: RegimeSchema,
  operatorLabel: z.string(),
  guidance: z.string(),
});

const PostureArchivePeriodSchema = z.object({
  slug: z.string(),
  kind: z.enum(["year", "quarter"]),
  year: z.number(),
  quarter: z.number().optional(),
  title: z.string(),
  asOf: z.string(),
  recordDateLabel: z.string(),
  regime: RegimeSchema,
  regimeLabel: z.string(),
  operatorLabel: z.string(),
  headline: z.string(),
  guidance: z.string(),
  // Quarterly and yearly archive entries carry no confidence grade, so the index
  // deliberately omits one rather than inheriting the schema's default.
  constraints: z.array(z.string()),
  rates: z.array(PostureArchiveRateSchema),
  sourceLabel: z.string(),
  sourceUrl: z.string().optional(),
  statusLabel: z.string(),
  sampleCadence: z.enum(["weekly", "monthly"]).nullable(),
  sampleCount: z.number(),
  regimeMix: z.array(PostureArchiveRegimeShareSchema),
  transitions: z.array(PostureArchiveTransitionSchema),
  children: z.array(PostureArchiveChildSchema),
  parentSlug: z.string().nullable(),
  previousSlug: z.string().nullable(),
  nextSlug: z.string().nullable(),
});

export const PostureArchiveIndexSchema = z.array(PostureArchivePeriodSchema);

export type PostureArchiveRegimeShare = z.infer<typeof PostureArchiveRegimeShareSchema>;
export type PostureArchivePeriod = z.infer<typeof PostureArchivePeriodSchema>;
