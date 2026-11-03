/**
 * Quarterly + yearly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready summaries for historical review.
 * The replay itself is `buildQuarterlyYearlyArchive` (`lib/summary/regimeArchiveReplay.ts`)
 * and the archive write is `writeQuarterlyYearlyArchive` (`lib/summary/regimeArchiveFiles.ts`);
 * this script fetches and runs them on the working tree.
 */
import { workingTreeStore } from "./dataFileStore";
import { fetchSeries } from "./fredSeriesFetch";
import { readArchiveScope } from "./archiveScope";
import { fetchArchiveDatasets } from "../lib/summary/regimeArchiveContext";
import { buildQuarterlyYearlyArchive } from "../lib/summary/regimeArchiveReplay";
import { writeQuarterlyYearlyArchive } from "../lib/summary/regimeArchiveFiles";

const generateQuarterlyAndYearlySummaries = async () => {
  const datasets = await fetchArchiveDatasets(fetchSeries);
  await writeQuarterlyYearlyArchive(
    workingTreeStore,
    buildQuarterlyYearlyArchive({ ...datasets, now: new Date(), scope: readArchiveScope() }),
  );
};

generateQuarterlyAndYearlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
