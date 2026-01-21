/**
 * Summary archive loader for Time Machine timeline playback.
 * Validates cached weekly/monthly summaries for historical review.
 */
import { z } from "zod";
import type { MonthlySummary } from "./monthlySummary";
import type { WeeklySummary } from "./weeklySummary";
import rawArchive from "../data/summary_archive.json";

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
    };

const SummaryInputSchema = z.object({}).passthrough();

const SummaryProvenanceSchema = z.object({
  sourceLabel: z.string(),
  sourceUrl: z.string().optional(),
  timestampLabel: z.string(),
  ageLabel: z.string(),
  statusLabel: z.string(),
});

const SummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  regime: z.string(),
  regimeLabel: z.string(),
  guidance: z.string(),
  constraints: z.array(z.string()),
  recordDateLabel: z.string().nullable(),
  provenance: SummaryProvenanceSchema,
  inputs: z.array(SummaryInputSchema),
  copy: z.string(),
});

const WeeklyArchiveSchema = z.object({
  cadence: z.literal("weekly"),
  year: z.number(),
  week: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: SummarySchema,
});

const MonthlyArchiveSchema = z.object({
  cadence: z.literal("monthly"),
  year: z.number(),
  month: z.number(),
  asOf: z.string(),
  record_date: z.string(),
  summary: SummarySchema,
});

const SummaryArchiveSchema = z.array(z.union([WeeklyArchiveSchema, MonthlyArchiveSchema]));

const parsedArchive = SummaryArchiveSchema.safeParse(rawArchive);

if (!parsedArchive.success) {
  throw new Error("Summary archive failed validation.");
}

const sortedArchive = parsedArchive.data.sort(
  (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
);

export const getSummaryArchive = () => sortedArchive;
