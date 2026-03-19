import { promises as fs } from "node:fs";
import path from "node:path";
import currentMacroSnapshot from "../data/macro_snapshot.json";
import { loadMacroSeries } from "../lib/macroSnapshot";
import { fetchTreasuryData } from "../lib/treasury/treasuryClient";
import type { TreasuryData } from "../lib/types";

type MacroSnapshotPayload = typeof currentMacroSnapshot;

const repoRoot = process.cwd();
const treasuryFallbackPath = path.join(repoRoot, "data", "snapshot_fallback.json");
const macroSnapshotPath = path.join(repoRoot, "data", "macro_snapshot.json");

const writeJson = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const toFallbackTreasury = (treasury: TreasuryData): TreasuryData => ({
  ...treasury,
  isLive: false,
  fallback_at: undefined,
  fallback_reason: undefined,
});

const buildMacroFallbackPayload = (
  previousPayload: MacroSnapshotPayload,
  refreshedSeries: Awaited<ReturnType<typeof loadMacroSeries>>,
): MacroSnapshotPayload => ({
  fetched_at: new Date().toISOString(),
  isLive: false,
  series: refreshedSeries.map((series) => ({
    ...series,
    isLive: false,
    fetched_at: series.fetched_at ?? previousPayload.fetched_at,
  })),
});

const main = async () => {
  const [treasury, macroSeries] = await Promise.all([
    fetchTreasuryData(),
    loadMacroSeries(),
  ]);

  const treasuryFallback = toFallbackTreasury(treasury);
  const macroFallback = buildMacroFallbackPayload(currentMacroSnapshot as MacroSnapshotPayload, macroSeries);

  await Promise.all([
    writeJson(treasuryFallbackPath, treasuryFallback),
    writeJson(macroSnapshotPath, macroFallback),
  ]);

  const refreshedLiveMacroCount = macroSeries.filter((series) => series.isLive).length;
  console.log(JSON.stringify({
    updated: [
      {
        file: "data/snapshot_fallback.json",
        recordDate: treasuryFallback.record_date,
        fetchedAt: treasuryFallback.fetched_at,
      },
      {
        file: "data/macro_snapshot.json",
        fetchedAt: macroFallback.fetched_at,
        refreshedLiveMacroSeries: refreshedLiveMacroCount,
      },
    ],
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
