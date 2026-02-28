/**
 * Summary archive loader for Time Machine timeline playback.
 * Validates cached weekly/monthly summaries for historical review.
 */
import { z } from "zod";
import { buildMonthlyStructured, type MonthlySummary } from "./monthlySummary";
import type { QuarterlySummary } from "./quarterlySummary";
import type { RegimeKey } from "../regimeEngine";
import { buildWeeklyStructured, type WeeklySummary } from "./weeklySummary";
import type { YearlySummary } from "./yearlySummary";
import rawArchive from "../../data/summary_archive.json";

export type SummaryArchiveEntry =
  | {
      cadence: "weekly";
      year: number;
      week: number;
      asOf: string;
      record_date: string;
      summary: WeeklySummary;
    }
  | {
      cadence: "monthly";
      year: number;
      month: number;
      asOf: string;
      record_date: string;
      summary: MonthlySummary;
    }
  | {
      cadence: "quarterly";
      year: number;
      quarter: number;
      asOf: string;
      record_date: string;
      summary: QuarterlySummary;
    }
  | {
      cadence: "yearly";
      year: number;
      asOf: string;
      record_date: string;
      summary: YearlySummary;
    };

const SummaryInputSchema = z.object({
  id: z.enum(["base-rate", "two-year", "ten-year", "curve-slope"]),
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  sourceLabel: z.string(),
  sourceUrl: z.string(),
  recordDate: z.string(),
  fetchedAt: z.string(),
  derivedFrom: z.string().optional(),
  notes: z.string().optional(),
});

const SummaryProvenanceSchema = z.object({
  sourceLabel: z.string(),
  sourceUrl: z.string().optional(),
  timestampLabel: z.string(),
  ageLabel: z.string(),
  statusLabel: z.string(),
});

const BaseSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  regime: z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]) as z.ZodType<RegimeKey>,
  regimeLabel: z.string(),
  guidance: z.string(),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  transitionWatch: z.boolean().default(false),
  intensity: z.enum(["MILD", "STANDARD", "STRONG"]).default("STANDARD"),
  constraints: z.array(z.string()),
  recordDateLabel: z.string().nullable(),
  provenance: SummaryProvenanceSchema,
  inputs: z.array(SummaryInputSchema),
  copy: z.string(),
});

const WeeklyStructuredSchema = z.object({
  climate: z.object({
    label: z.string(),
    summary: z.array(z.string()),
  }),
  recommendedMoves: z.array(z.string()),
  executionPriorities: z.array(z.string()),
  watchouts: z.array(z.string()),
  planningLanguage: z.string(),
  executionConstraints: z.array(z.string()),
});

const MonthlyStructuredSchema = z.object({
  executionConstraints: z.array(z.string()),
  provenance: z.object({
    source: z.string(),
    timestamp: z.string(),
    dataAge: z.string(),
  }),
});

const WeeklySummaryArchiveSchema = BaseSummarySchema.extend({
  structured: WeeklyStructuredSchema.optional(),
}).transform((summary): WeeklySummary => ({
  ...summary,
  structured:
    summary.structured ??
    buildWeeklyStructured({
      regime: summary.regime,
      constraints: summary.constraints,
    }),
}));

const MonthlySummaryArchiveSchema = BaseSummarySchema.extend({
  structured: MonthlyStructuredSchema.optional(),
}).transform((summary): MonthlySummary => ({
  ...summary,
  structured:
    summary.structured ??
    buildMonthlyStructured({
      constraints: summary.constraints,
      provenance: summary.provenance,
    }),
}));

const QuarterlySummaryArchiveSchema = BaseSummarySchema;
const YearlySummaryArchiveSchema = BaseSummarySchema;

const WeeklyArchiveSchema = z.object({
  cadence: z.literal("weekly"),
  year: z.number(),
  week: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: WeeklySummaryArchiveSchema,
});

const MonthlyArchiveSchema = z.object({
  cadence: z.literal("monthly"),
  year: z.number(),
  month: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: MonthlySummaryArchiveSchema,
});

const QuarterlyArchiveSchema = z.object({
  cadence: z.literal("quarterly"),
  year: z.number(),
  quarter: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: QuarterlySummaryArchiveSchema,
});

const YearlyArchiveSchema = z.object({
  cadence: z.literal("yearly"),
  year: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: YearlySummaryArchiveSchema,
});

const SummaryArchiveSchema = z.array(
  z.union([WeeklyArchiveSchema, MonthlyArchiveSchema, QuarterlyArchiveSchema, YearlyArchiveSchema])
);

export const parseSummaryArchive = (input: unknown): SummaryArchiveEntry[] => {
  const parsedArchive = SummaryArchiveSchema.safeParse(input);

  if (parsedArchive.success) {
    return parsedArchive.data;
  }

  console.error("Summary archive failed validation.", parsedArchive.error.format());
  return [];
};

const sortedArchive = parseSummaryArchive(rawArchive).sort(
  (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
);

export const getSummaryArchive = () => sortedArchive;
