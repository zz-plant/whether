import { promises as fs } from "node:fs";
import path from "node:path";
import currentMacroSnapshot from "../data/macro_snapshot.json";
import { loadMacroSeries } from "../lib/macroSnapshot";
import { fetchTreasuryData } from "../lib/treasury/treasuryClient";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

type MacroSnapshotPayload = typeof currentMacroSnapshot;

const repoRoot = process.cwd();

const mergeLatestHistoryPoint = ({
  history,
  recordDate,
  value,
}: {
  history: MacroSnapshotPayload["series"][number]["history"] | undefined;
  recordDate: string;
  value: number | null;
}): Array<{ date: string; value: number }> => {
  if (!history?.length || typeof value !== "number") {
    return history ?? [];
  }

  const nextHistory = history.filter((point) => point.date !== recordDate);
  nextHistory.push({ date: recordDate, value });

  return nextHistory.slice(-history.length);
};

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

const resolveSnapshotValue = ({
  series,
  previousSeries,
}: {
  series: MacroSeriesReading;
  previousSeries?: MacroSnapshotPayload["series"][number];
}): number => {
  if (typeof series.value === "number") {
    return series.value;
  }
  if (typeof previousSeries?.value === "number") {
    return previousSeries.value;
  }
  throw new Error(`Missing numeric value for macro series ${series.id}`);
};

const resolveSnapshotHistory = ({
  series,
  previousSeries,
}: {
  series: MacroSeriesReading;
  previousSeries?: MacroSnapshotPayload["series"][number];
}): Array<{ date: string; value: number }> => {
  const currentHistory = series.history?.filter(
    (point): point is { date: string; value: number } => typeof point.value === "number",
  );
  const previousHistory = previousSeries?.history;
  return currentHistory?.length ? currentHistory : (previousHistory ?? []);
};

const buildMacroFallbackPayload = (
  previousPayload: MacroSnapshotPayload,
  refreshedSeries: Awaited<ReturnType<typeof loadMacroSeries>>,
): MacroSnapshotPayload => ({
  fetched_at: new Date().toISOString(),
  isLive: false,
  series: refreshedSeries.map((series) => {
    const previousSeries = previousPayload.series.find((entry) => entry.id === series.id);
    const resolvedValue = resolveSnapshotValue({ series, previousSeries });

    return {
      ...series,
      value: resolvedValue,
      history: mergeLatestHistoryPoint({
        history: resolveSnapshotHistory({ series, previousSeries }),
        recordDate: series.record_date,
        value: resolvedValue,
      }),
      isLive: false,
      fetched_at: series.fetched_at ?? previousPayload.fetched_at,
    };
  }),
});

export const main = async () => {
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

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { buildMacroFallbackPayload, mergeLatestHistoryPoint };
