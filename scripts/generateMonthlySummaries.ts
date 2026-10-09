/**
 * Monthly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready monthly summaries for historical review.
 * The replay itself is `buildMonthlyArchive` (`regimeArchiveReplay.ts`); this script
 * fetches and writes, the Time Machine cache included.
 */
import { readFile, writeFile } from "node:fs/promises";
import { writeSummaryArchive } from "./summaryArchive";
import { writeSummaryFile } from "./summaryFile";
import { refreshDerivedSummaryHistory } from "./refreshDerivedSummaryHistory";
import { fetchArchiveDatasets } from "./regimeArchiveContext";
import { buildMonthlyArchive, type TimeMachineCacheEntry } from "./regimeArchiveReplay";

const OUTPUT_PATH = "data/monthly_summaries_2012_2025.json";
const TIME_MACHINE_CACHE_PATH = "data/time_machine_cache.json";

const writeJson = async (filePath: string, value: unknown) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readTimeMachineCacheEntries = async (): Promise<TimeMachineCacheEntry[]> => {
  try {
    const raw = await readFile(TIME_MACHINE_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as TimeMachineCacheEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const resolvedError = error as NodeJS.ErrnoException;
    if (resolvedError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const writeTimeMachineCache = async ({
  entries,
  mode,
}: {
  entries: TimeMachineCacheEntry[];
  mode: "replace" | "merge";
}) => {
  const nextEntries = mode === "merge"
    ? (() => {
        const merged = new Map<string, TimeMachineCacheEntry>();
        return readTimeMachineCacheEntries().then((existing) => {
          existing.forEach((entry) => merged.set(`${entry.year}-${entry.month}`, entry));
          entries.forEach((entry) => merged.set(`${entry.year}-${entry.month}`, entry));
          return Array.from(merged.values());
        });
      })()
    : Promise.resolve(entries);

  const sorted = (await nextEntries).sort(
    (left, right) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime(),
  );
  await writeJson(TIME_MACHINE_CACHE_PATH, sorted);
};

const generateMonthlySummaries = async () => {
  const now = new Date();
  const { datasets, vixDataset, chicagoFciDataset } = await fetchArchiveDatasets();
  const { entries: output, timeMachineEntries, mode } = buildMonthlyArchive({ datasets, vixDataset, chicagoFciDataset, now });

  await writeSummaryFile({
    path: OUTPUT_PATH,
    entries: output,
    mode,
    getKey: (entry) => `${entry.year}-${entry.month}`,
  });
  await writeSummaryArchive({ monthlyEntries: output, mode });
  await writeTimeMachineCache({ entries: timeMachineEntries, mode });
  await refreshDerivedSummaryHistory();
};

generateMonthlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
