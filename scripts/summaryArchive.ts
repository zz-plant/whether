/**
 * Summary archive writer for weekly/monthly Time Machine rollups.
 * Keeps historical summary cache in a single file for timeline playback.
 */
import { readFile, writeFile } from "node:fs/promises";
import type { MonthlySummary } from "../lib/summary/monthlySummary";
import { carryUnchangedEntries } from "./carryUnchangedEntries";
import { extractCalibrationMonths } from "../lib/report/confidenceCalibration";
import type { QuarterlySummary } from "../lib/summary/quarterlySummary";
import type { WeeklySummary } from "../lib/summary/weeklySummary";
import type { YearlySummary } from "../lib/summary/yearlySummary";

const ARCHIVE_PATH = "data/summary_archive.json";
const CALIBRATION_MONTHS_PATH = "data/confidence_record_months.json";

/** Which engine calibration scored the entry; absent on entries written before 2026-10-06. */
type EngineStamp = { engineVersion?: string };

const carryEngineStamp = ({ engineVersion }: EngineStamp): EngineStamp =>
  engineVersion === undefined ? {} : { engineVersion };

type WeeklySummaryArchiveEntry = {
  year: number;
  week: number;
  asOf: string;
  record_date: string;
  summary: WeeklySummary;
} & EngineStamp;

type MonthlySummaryArchiveEntry = {
  year: number;
  month: number;
  asOf: string;
  record_date: string;
  summary: MonthlySummary;
  tightness?: number;
  riskAppetite?: number;
} & EngineStamp;

type QuarterlySummaryArchiveEntry = {
  year: number;
  quarter: number;
  asOf: string;
  record_date: string;
  summary: QuarterlySummary;
} & EngineStamp;

type YearlySummaryArchiveEntry = {
  year: number;
  asOf: string;
  record_date: string;
  summary: YearlySummary;
} & EngineStamp;

type SummaryArchiveEntry =
  | {
      cadence: "weekly";
      year: number;
      week: number;
      asOf: string;
      record_date: string;
      summary: WeeklySummary;
      engineVersion?: string;
    }
  | {
      cadence: "monthly";
      year: number;
      month: number;
      asOf: string;
      record_date: string;
      summary: MonthlySummary;
      tightness?: number;
      riskAppetite?: number;
      engineVersion?: string;
    }
  | {
      cadence: "quarterly";
      year: number;
      quarter: number;
      asOf: string;
      record_date: string;
      summary: QuarterlySummary;
      engineVersion?: string;
    }
  | {
      cadence: "yearly";
      year: number;
      asOf: string;
      record_date: string;
      summary: YearlySummary;
      engineVersion?: string;
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

// Periods ending on the same day keep one order whichever generator ran last.
const CADENCE_ORDER: Record<SummaryArchiveEntry["cadence"], number> = {
  monthly: 0,
  weekly: 1,
  quarterly: 2,
  yearly: 3,
};

const sortArchive = (entries: SummaryArchiveEntry[]) => {
  return [...entries].sort(
    (a, b) =>
      new Date(a.asOf).getTime() - new Date(b.asOf).getTime() ||
      CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence]
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
      ...carryEngineStamp(entry),
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
      tightness: entry.tightness,
      riskAppetite: entry.riskAppetite,
      ...carryEngineStamp(entry),
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
      ...carryEngineStamp(entry),
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
      ...carryEngineStamp(entry),
    }));
    nextEntries =
      mode === "merge"
        ? mergeCadenceEntries(nextEntries, "yearly", normalized)
        : [...nextEntries, ...normalized];
  }

  const sorted = sortArchive(
    carryUnchangedEntries(existing, nextEntries, (entry) => `${entry.cadence}:${getArchiveKey(entry)}`),
  );
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  // The confidence record reads a five-field extract of this file so its pages
  // do not bundle 5MB (lib/report/confidenceCalibration.ts). Written here, with
  // the archive, so no workflow step can refresh one and forget the other;
  // tests/confidenceCalibration.test.ts fails if they ever disagree.
  await writeFile(CALIBRATION_MONTHS_PATH, `${JSON.stringify(extractCalibrationMonths(sorted))}\n`, "utf8");
};
