import { readFile, writeFile } from "node:fs/promises";
import type { RegimeKey } from "../lib/regimeEngine";

const SUMMARY_ARCHIVE_PATH = "data/summary_archive.json";
const WEEKLY_POSTURE_HISTORY_PATH = "data/summary_memory_rail_weekly.json";
const MONTHLY_REGIME_HISTORY_PATH = "data/summary_monthly_regime_history.json";

type SummaryArchiveEntry = {
  cadence?: "weekly" | "monthly" | "quarterly" | "yearly";
  week?: number;
  month?: number;
  record_date: string;
  asOf: string;
  summary: {
    regime: RegimeKey;
  };
};

type DerivedHistoryEntry = {
  record_date: string;
  regime: RegimeKey;
};

const byAsOfAscending = (left: Pick<SummaryArchiveEntry, "asOf">, right: Pick<SummaryArchiveEntry, "asOf">) =>
  new Date(left.asOf).getTime() - new Date(right.asOf).getTime();

const byRecordDateAscending = (
  left: Pick<DerivedHistoryEntry, "record_date">,
  right: Pick<DerivedHistoryEntry, "record_date">,
) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime();

const writeJson = async (filePath: string, value: unknown) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const toDerivedHistoryEntry = (entry: SummaryArchiveEntry): DerivedHistoryEntry => ({
  record_date: entry.record_date,
  regime: entry.summary.regime,
});

export const refreshDerivedSummaryHistory = async () => {
  const rawArchive = JSON.parse(await readFile(SUMMARY_ARCHIVE_PATH, "utf8")) as SummaryArchiveEntry[];

  const weeklyHistory = rawArchive
    .filter((entry) => entry.cadence === "weekly")
    .sort(byAsOfAscending)
    .slice(-4)
    .map(toDerivedHistoryEntry)
    .sort(byRecordDateAscending);

  const monthlyHistory = rawArchive
    .filter((entry) => entry.cadence === "monthly")
    .sort(byAsOfAscending)
    .map(toDerivedHistoryEntry)
    .sort(byRecordDateAscending);

  await Promise.all([
    writeJson(WEEKLY_POSTURE_HISTORY_PATH, weeklyHistory),
    writeJson(MONTHLY_REGIME_HISTORY_PATH, monthlyHistory),
  ]);

  return {
    weeklyCount: weeklyHistory.length,
    weeklyLatest: weeklyHistory.at(-1)?.record_date ?? null,
    monthlyCount: monthlyHistory.length,
    monthlyLatest: monthlyHistory.at(-1)?.record_date ?? null,
  };
};

