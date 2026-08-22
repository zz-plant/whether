import { promises as fs } from "node:fs";
import path from "node:path";
import currentMacroSnapshot from "../data/macro_snapshot.json";
import { formatAgeSpan } from "../lib/formatters";
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

/**
 * Series this run could not refresh, with the age of the timestamp each one kept.
 *
 * A series with no live fetcher keeps the timestamp it arrived with, which is correct. What is
 * not obvious is that the payload's top-level fetched_at is stamped fresh regardless, so a run
 * that refreshed none of them still reports the file as updated with a current timestamp.
 * Naming them is what stops the next person chasing a stale-source warning from running this
 * and concluding the stale data is now current.
 */
export const summarizeCarriedForward = (
  payload: MacroSnapshotPayload,
  // Only the identity and liveness of each refreshed series matters here, so take that shape
  // rather than the loader's full return type — callers and tests need not build a whole reading.
  refreshedSeries: ReadonlyArray<{ id: string; isLive: boolean }>,
  now: Date = new Date(payload.fetched_at),
): Array<{ id: string; fetchedAt: string | null; age: string | null }> => {
  const refreshedIds = new Set<string>(
    refreshedSeries.filter((series) => series.isLive).map((series) => series.id),
  );

  return payload.series
    .filter((series) => !refreshedIds.has(series.id))
    .map((series) => ({
      id: series.id,
      fetchedAt: series.fetched_at ?? null,
      age: formatAgeSpan(series.fetched_at ?? null, now),
    }));
};

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

  const carriedForward = summarizeCarriedForward(macroFallback, macroSeries);

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
        carriedForward,
      },
    ],
  }, null, 2));

  if (carriedForward.length > 0) {
    console.warn(
      `Not refreshed (no live source; values and timestamps carried forward): ${carriedForward
        .map((series) => `${series.id} ${series.age ?? "age unknown"}`)
        .join(", ")}`,
    );
  }
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { buildMacroFallbackPayload, mergeLatestHistoryPoint };
