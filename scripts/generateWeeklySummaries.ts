/**
 * Weekly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready weekly summaries for historical review.
 * The replay itself is `buildWeeklyArchive` (`regimeArchiveReplay.ts`); this script
 * fetches and writes.
 */
import { writeSummaryArchive } from "./summaryArchive";
import { writeSummaryFile } from "./summaryFile";
import { refreshDerivedSummaryHistory } from "./refreshDerivedSummaryHistory";
import { fetchArchiveDatasets } from "./regimeArchiveContext";
import { buildWeeklyArchive } from "./regimeArchiveReplay";

const START_YEAR = 2018;
const OUTPUT_PATH = (endYear: number) =>
  `data/weekly_summaries_${START_YEAR}_${endYear}.json`;

const generateWeeklySummaries = async () => {
  const now = new Date();
  const { datasets, vixDataset } = await fetchArchiveDatasets();
  const { entries: output, effectiveEndYear, mode } = buildWeeklyArchive({ datasets, vixDataset, now });

  await writeSummaryFile({
    path: OUTPUT_PATH(effectiveEndYear),
    entries: output,
    mode,
    getKey: (entry) => `${entry.year}-${entry.week}`,
  });
  await writeSummaryArchive({ weeklyEntries: output, mode });
  await refreshDerivedSummaryHistory();
};

generateWeeklySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
