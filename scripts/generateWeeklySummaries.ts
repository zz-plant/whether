/**
 * Weekly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready weekly summaries for historical review.
 * The replay itself is `buildWeeklyArchive` (`lib/summary/regimeArchiveReplay.ts`) and the
 * files it writes are `writeWeeklyArchive` (`lib/summary/regimeArchiveFiles.ts`); this
 * script fetches and runs them on the working tree.
 */
import { workingTreeStore } from "./dataFileStore";
import { fetchSeries } from "./fredSeriesFetch";
import { readArchiveScope } from "./archiveScope";
import { fetchArchiveDatasets } from "../lib/summary/regimeArchiveContext";
import { buildWeeklyArchive } from "../lib/summary/regimeArchiveReplay";
import { writeWeeklyArchive } from "../lib/summary/regimeArchiveFiles";

const generateWeeklySummaries = async () => {
  const datasets = await fetchArchiveDatasets(fetchSeries);
  await writeWeeklyArchive(workingTreeStore, buildWeeklyArchive({ ...datasets, now: new Date(), scope: readArchiveScope() }));
};

generateWeeklySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
