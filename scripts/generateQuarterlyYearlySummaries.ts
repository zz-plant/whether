/**
 * Quarterly + yearly summary archive generator for the Regime Station Time Machine.
 * Pulls Treasury snapshots and builds copy-ready summaries for historical review.
 * The replay itself is `buildQuarterlyYearlyArchive` (`regimeArchiveReplay.ts`);
 * this script fetches and writes.
 */
import { writeSummaryArchive } from "./summaryArchive";
import { fetchArchiveDatasets } from "./regimeArchiveContext";
import { buildQuarterlyYearlyArchive } from "./regimeArchiveReplay";

const generateQuarterlyAndYearlySummaries = async () => {
  const now = new Date();
  const { datasets, vixDataset, chicagoFciDataset } = await fetchArchiveDatasets();
  const { quarterlyEntries, yearlyEntries, mode } = buildQuarterlyYearlyArchive({ datasets, vixDataset, chicagoFciDataset, now });

  await writeSummaryArchive({ quarterlyEntries, yearlyEntries, mode });
};

generateQuarterlyAndYearlySummaries().catch((error) => {
  console.error(error);
  process.exit(1);
});
