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

type SummaryArchiveMode = "replace" | "merge";

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

const getArchiveKey = (entry: SummaryArchiveEntry) => {
  switch (entry.cadence) {
    case "weekly":
      return `${entry.year}-${entry.week}`;
    case "monthly":
      return `${entry.year}-${entry.month}`;
    case "quarterly":
      return `${entry.year}-${entry.quarter}`;
    case "yearly":
      return `${entry.year}`;
    default:
      return "";
  }
};

const mergeCadenceEntries = (
  existing: SummaryArchiveEntry[],
  cadence: SummaryArchiveEntry["cadence"],
  incoming: SummaryArchiveEntry[]
) => {
  const preserved = existing.filter((entry) => entry.cadence !== cadence);
  const merged = new Map<string, SummaryArchiveEntry>();
  existing
    .filter((entry) => entry.cadence === cadence)
    .forEach((entry) => merged.set(getArchiveKey(entry), entry));
  incoming.forEach((entry) => merged.set(getArchiveKey(entry), entry));
  return [...preserved, ...merged.values()];
};

export const writeSummaryArchive = async ({
  weeklyEntries,
  monthlyEntries,
  quarterlyEntries,
  yearlyEntries,
  mode = "replace",
}: {
  weeklyEntries?: WeeklySummaryArchiveEntry[];
  monthlyEntries?: MonthlySummaryArchiveEntry[];
  quarterlyEntries?: QuarterlySummaryArchiveEntry[];
  yearlyEntries?: YearlySummaryArchiveEntry[];
  mode?: SummaryArchiveMode;
}) => {
  const existing = await readExistingArchive();
  let nextEntries =
    mode === "replace"
      ? existing.filter((entry) => {
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
        })
      : existing;

  if (weeklyEntries) {
    const normalized = weeklyEntries.map((entry) => ({
      cadence: "weekly" as const,
      year: entry.year,
      week: entry.week,
      asOf: entry.asOf,
      record_date: entry.record_date,
      summary: entry.summary,
    }));
    nextEntries =
      mode === "merge"
        ? mergeCadenceEntries(nextEntries, "weekly", normalized)
        : [...nextEntries, ...normalized];
  }

  if (monthlyEntries) {
    const normalized = monthlyEntries.map((entry) => ({
      cadence: "monthly" as const,
      year: entry.year,
      month: entry.month,
      asOf: entry.asOf,
      record_date: entry.record_date,
      summary: entry.summary,
    }));
    nextEntries =
      mode === "merge"
        ? mergeCadenceEntries(nextEntries, "monthly", normalized)
        : [...nextEntries, ...normalized];
  }

  if (quarterlyEntries) {
    const normalized = quarterlyEntries.map((entry) => ({
      cadence: "quarterly" as const,
      year: entry.year,
      quarter: entry.quarter,
      asOf: entry.asOf,
      record_date: entry.record_date,
      summary: entry.summary,
    }));
    nextEntries =
      mode === "merge"
        ? mergeCadenceEntries(nextEntries, "quarterly", normalized)
        : [...nextEntries, ...normalized];
  }

  if (yearlyEntries) {
    const normalized = yearlyEntries.map((entry) => ({
      cadence: "yearly" as const,
      year: entry.year,
      asOf: entry.asOf,
      record_date: entry.record_date,
      summary: entry.summary,
    }));
    nextEntries =
      mode === "merge"
        ? mergeCadenceEntries(nextEntries, "yearly", normalized)
        : [...nextEntries, ...normalized];
  }

  const sorted = sortArchive(nextEntries);
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
};
