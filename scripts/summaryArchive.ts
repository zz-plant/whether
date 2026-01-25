/**
 * Summary archive writer for weekly/monthly Time Machine rollups.
 * Keeps historical summary cache in a single file for timeline playback.
 */
import { readFile, writeFile } from "node:fs/promises";
import type { MonthlySummary } from "../lib/summary/monthlySummary";
import type { QuarterlySummary } from "../lib/summary/quarterlySummary";
import type { WeeklySummary } from "../lib/summary/weeklySummary";
import type { YearlySummary } from "../lib/summary/yearlySummary";

const ARCHIVE_PATH = "data/summary_archive.json";

type WeeklySummaryArchiveEntry = {
  year: number;
  week: number;
  asOf: string;
  record_date: string;
  summary: WeeklySummary;
};

type MonthlySummaryArchiveEntry = {
  year: number;
  month: number;
  asOf: string;
  record_date: string;
  summary: MonthlySummary;
};

type QuarterlySummaryArchiveEntry = {
  year: number;
  quarter: number;
  asOf: string;
  record_date: string;
  summary: QuarterlySummary;
};

type YearlySummaryArchiveEntry = {
  year: number;
  asOf: string;
  record_date: string;
  summary: YearlySummary;
};

type SummaryArchiveEntry =
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

const readExistingArchive = async () => {
  try {
    const raw = await readFile(ARCHIVE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SummaryArchiveEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const sortArchive = (entries: SummaryArchiveEntry[]) => {
  return [...entries].sort(
    (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime()
  );
};

export const writeSummaryArchive = async ({
  weeklyEntries,
  monthlyEntries,
  quarterlyEntries,
  yearlyEntries,
}: {
  weeklyEntries?: WeeklySummaryArchiveEntry[];
  monthlyEntries?: MonthlySummaryArchiveEntry[];
  quarterlyEntries?: QuarterlySummaryArchiveEntry[];
  yearlyEntries?: YearlySummaryArchiveEntry[];
}) => {
  const existing = await readExistingArchive();
  const nextEntries = existing.filter((entry) => {
    if (weeklyEntries && entry.cadence === "weekly") {
      return false;
    }
    if (monthlyEntries && entry.cadence === "monthly") {
      return false;
    }
    if (quarterlyEntries && entry.cadence === "quarterly") {
      return false;
    }
    if (yearlyEntries && entry.cadence === "yearly") {
      return false;
    }
    return true;
  });

  if (weeklyEntries) {
    nextEntries.push(
      ...weeklyEntries.map((entry) => ({
        cadence: "weekly" as const,
        year: entry.year,
        week: entry.week,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
      }))
    );
  }

  if (monthlyEntries) {
    nextEntries.push(
      ...monthlyEntries.map((entry) => ({
        cadence: "monthly" as const,
        year: entry.year,
        month: entry.month,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
      }))
    );
  }

  if (quarterlyEntries) {
    nextEntries.push(
      ...quarterlyEntries.map((entry) => ({
        cadence: "quarterly" as const,
        year: entry.year,
        quarter: entry.quarter,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
      }))
    );
  }

  if (yearlyEntries) {
    nextEntries.push(
      ...yearlyEntries.map((entry) => ({
        cadence: "yearly" as const,
        year: entry.year,
        asOf: entry.asOf,
        record_date: entry.record_date,
        summary: entry.summary,
      }))
    );
  }

  const sorted = sortArchive(nextEntries);
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
};
