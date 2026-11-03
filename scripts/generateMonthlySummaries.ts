/**
 * Monthly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready monthly summaries for historical review.
 * The replay itself is `buildMonthlyArchive` (`lib/summary/regimeArchiveReplay.ts`) and the
 * files it writes, the Time Machine cache included, are `writeMonthlyArchive`
 * (`lib/summary/regimeArchiveFiles.ts`); this script fetches and runs them on the working tree.
 */
import { workingTreeStore } from "./dataFileStore";
import { fetchSeries } from "./fredSeriesFetch";
import { readArchiveScope } from "./archiveScope";
import { fetchArchiveDatasets } from "../lib/summary/regimeArchiveContext";
import { buildMonthlyArchive } from "../lib/summary/regimeArchiveReplay";
import { writeMonthlyArchive } from "../lib/summary/regimeArchiveFiles";

const generateMonthlySummaries = async () => {
  const datasets = await fetchArchiveDatasets(fetchSeries);
  await writeMonthlyArchive(workingTreeStore, buildMonthlyArchive({ ...datasets, now: new Date(), scope: readArchiveScope() }));
};

generateMonthlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
