import { SIGNAL_CADENCE } from "./cadence";
import { SIGNAL_FAMILIES, pullSignalFamily } from "./families";
import { getDefaultIngestionStore, type IngestionStore } from "./store";
import { runInBackground } from "../runtime/backgroundWork";
import { revalidateReportDataCaches } from "../report/cacheTags";
import type { MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../types";
import { loadMacroSeries, macroSeries as snapshotMacroSeries } from "../macroSnapshot";
import snapshotFallbackJson from "../../data/snapshot_fallback.json";
import type { MaterializedHistoryPoint, MaterializedSignalReadModel, SignalEntitySnapshot, SignalFamily, SignalKey } from "./types";

const snapshotFallback = snapshotFallbackJson as TreasuryData;

const signalKeysByFamily: Record<SignalFamily, SignalKey[]> = {
  rates: ["TREASURY_1M", "TREASURY_3M", "TREASURY_2Y", "TREASURY_10Y"],
  spreads: ["BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD"],
  labor: ["UNEMPLOYMENT_RATE"],
  inflation: ["CPI_YOY"],
  credit: ["CHICAGO_FCI"],
  volatility: ["VIX_INDEX"],
};

const RECENT_HISTORY_WINDOW_DAYS = 92;
const RECENT_HISTORY_WINDOW_MS = RECENT_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const chooseLatest = (existing: SignalEntitySnapshot | undefined, candidate: SignalEntitySnapshot) => {
  if (!existing) {
    return candidate;
  }

  if (candidate.observedAt > existing.observedAt) {
    return candidate;
  }

  if (candidate.observedAt === existing.observedAt && candidate.ingestedAt > existing.ingestedAt) {
    return candidate;
  }

  return existing;
};

export const buildMaterializedReadModel = (
  snapshots: SignalEntitySnapshot[],
  now = new Date(),
): MaterializedSignalReadModel => {
  const latestByKey: Partial<Record<SignalKey, SignalEntitySnapshot>> = {};

  for (const snapshot of snapshots) {
    latestByKey[snapshot.signalKey] = chooseLatest(latestByKey[snapshot.signalKey], snapshot);
  }

  const nowMs = now.getTime();
  const signals = Object.entries(latestByKey).reduce<MaterializedSignalReadModel["signals"]>((acc, [key, snapshot]) => {
    if (!snapshot) {
      return acc;
    }

    const cadence = SIGNAL_CADENCE[key as SignalKey];
    const ageMs = Math.max(0, nowMs - new Date(snapshot.ingestedAt).getTime());
    acc[key as SignalKey] = {
      snapshot,
      cadence,
      staleness: {
        status: ageMs > cadence.staleAfterMs ? "stale" : "fresh",
        ageMs,
        staleAfterMs: cadence.staleAfterMs,
      },
    };

    return acc;
  }, {});

  return {
    asOf: now.toISOString(),
    signals,
    recentHistory: buildRecentHistoryBySignalKey(snapshots),
  };
};

/**
 * Merge new snapshots into the existing materialized model (signals + history) without
 * re-reading the raw event log. This keeps the write path bounded: one KV read (materialized)
 * and one KV write (updated materialized) regardless of namespace size.
 */
const mergeIntoReadModel = (
  existing: MaterializedSignalReadModel,
  snapshots: SignalEntitySnapshot[],
  now: Date,
): MaterializedSignalReadModel => {
  const nowMs = now.getTime();

  const mergedSignals: MaterializedSignalReadModel["signals"] = { ...existing.signals };
  for (const snapshot of snapshots) {
    const key = snapshot.signalKey;
    const current = mergedSignals[key];
    const latest = chooseLatest(current?.snapshot, snapshot);
    if (latest === snapshot) {
      const cadence = SIGNAL_CADENCE[key];
      const ageMs = Math.max(0, nowMs - new Date(snapshot.ingestedAt).getTime());
      mergedSignals[key] = {
        snapshot,
        cadence,
        staleness: {
          status: ageMs > cadence.staleAfterMs ? "stale" : "fresh",
          ageMs,
          staleAfterMs: cadence.staleAfterMs,
        },
      };
    }
  }

  return {
    asOf: now.toISOString(),
    signals: mergedSignals,
    recentHistory: mergeRecentHistory(existing.recentHistory, snapshots, now),
  };
};

const toDateKey = (observedAt: string) => observedAt.slice(0, 10);

const pruneHistoryWindow = (
  history: MaterializedHistoryPoint[],
  latestObservedAt: string,
): MaterializedHistoryPoint[] => {
  const latestMs = Date.parse(latestObservedAt);
  if (!Number.isFinite(latestMs)) return history;
  const cutoffMs = latestMs - RECENT_HISTORY_WINDOW_MS;
  return history.filter((point) => {
    const pointMs = Date.parse(point.date);
    return Number.isFinite(pointMs) && pointMs >= cutoffMs;
  });
};

const mergeRecentHistory = (
  existing: MaterializedSignalReadModel["recentHistory"],
  snapshots: SignalEntitySnapshot[],
  now: Date,
): MaterializedSignalReadModel["recentHistory"] => {
  const merged: MaterializedSignalReadModel["recentHistory"] = existing
    ? { ...existing }
    : {};
  const latestObservedAt = now.toISOString();

  for (const snapshot of snapshots) {
    if (typeof snapshot.value !== "number") continue;
    const key = snapshot.signalKey;
    const date = toDateKey(snapshot.observedAt);
    const keyHistory = merged[key] ? [...merged[key]!] : [];
    const existingIndex = keyHistory.findIndex((p) => p.date === date);
    const point: MaterializedHistoryPoint = { date, value: snapshot.value };

    if (existingIndex >= 0) {
      keyHistory[existingIndex] = point;
    } else {
      keyHistory.push(point);
    }

    const sorted = keyHistory.sort((a, b) => a.date.localeCompare(b.date));
    merged[key] = pruneHistoryWindow(sorted, latestObservedAt);
  }

  return merged;
};

export const ingestCanonicalSignals = async ({
  fetcher = fetch,
  store = getDefaultIngestionStore(),
  families = SIGNAL_FAMILIES,
}: {
  fetcher?: typeof fetch;
  store?: IngestionStore;
  families?: SignalFamily[];
} = {}) => {
  const ingestedAt = new Date().toISOString();
  const now = new Date();
  const settled = await Promise.allSettled(families.map((family) => pullSignalFamily(family, fetcher, ingestedAt)));
  const snapshots = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (snapshots.length > 0) {
    await store.appendSnapshots(snapshots);
    const existingModel = await store.readLatestMaterialized();
    const readModel = existingModel
      ? mergeIntoReadModel(existingModel, snapshots, now)
      : buildMaterializedReadModel(snapshots, now);
    await store.writeLatestMaterialized(readModel);
  }

  return settled;
};

export const loadMaterializedSignals = async (store: IngestionStore = getDefaultIngestionStore()) =>
  store.readLatestMaterialized();

const getLatestFamilyIngestedAt = (model: MaterializedSignalReadModel, family: SignalFamily) => {
  const timestamps = signalKeysByFamily[family]
    .map((key) => model.signals[key]?.snapshot.ingestedAt)
    .filter((value): value is string => typeof value === "string");

  let latestTimestamp: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;

  for (const timestamp of timestamps) {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed) || parsed <= latestMs) {
      continue;
    }

    latestTimestamp = timestamp;
    latestMs = parsed;
  }

  return latestTimestamp;
};

const isFamilyRefreshDue = (model: MaterializedSignalReadModel, family: SignalFamily, now: Date) => {
  const keys = signalKeysByFamily[family];
  const missingKey = keys.some((key) => !model.signals[key]);
  if (missingKey) {
    return true;
  }

  const latestIngestedAt = getLatestFamilyIngestedAt(model, family);
  if (!latestIngestedAt) {
    return true;
  }

  const latestMs = Date.parse(latestIngestedAt);
  if (Number.isNaN(latestMs)) {
    return true;
  }

  const pollWindowMs = Math.min(...keys.map((key) => SIGNAL_CADENCE[key].pollWindowMs));
  return now.getTime() - latestMs > pollWindowMs;
};

export const resolveSignalFamiliesToRefresh = (
  model: MaterializedSignalReadModel | null,
  now = new Date(),
) => {
  if (!model) {
    return [...SIGNAL_FAMILIES];
  }

  return SIGNAL_FAMILIES.filter((family) => isFamilyRefreshDue(model, family, now));
};

const getSignalValue = (model: MaterializedSignalReadModel, key: SignalKey) => model.signals[key]?.snapshot.value ?? null;

const buildRecentHistoryBySignalKey = (snapshots: SignalEntitySnapshot[]) => {
  const byKey = new Map<
    SignalKey,
    Map<string, { observedAt: string; ingestedAt: string; value: number }>
  >();

  snapshots.forEach((snapshot) => {
    if (typeof snapshot.value !== "number") {
      return;
    }

    const date = snapshot.observedAt.slice(0, 10);
    const entriesByDate = byKey.get(snapshot.signalKey) ?? new Map<string, { observedAt: string; ingestedAt: string; value: number }>();
    const existing = entriesByDate.get(date);
    if (
      !existing
      || snapshot.observedAt > existing.observedAt
      || (snapshot.observedAt === existing.observedAt && snapshot.ingestedAt > existing.ingestedAt)
    ) {
      entriesByDate.set(date, {
        observedAt: snapshot.observedAt,
        ingestedAt: snapshot.ingestedAt,
        value: snapshot.value,
      });
    }
    byKey.set(snapshot.signalKey, entriesByDate);
  });

  const historyByKey: Partial<Record<SignalKey, SeriesHistoryPoint[]>> = {};

  for (const [key, entriesByDate] of byKey.entries()) {
    const points = Array.from(entriesByDate.entries())
      .map(([date, entry]) => ({ date, observedAt: entry.observedAt, value: entry.value }))
      .sort((left, right) => left.observedAt.localeCompare(right.observedAt));

    const latest = points.at(-1);
    if (!latest) {
      continue;
    }

    const latestMs = Date.parse(latest.observedAt);
    const cutoffMs = Number.isFinite(latestMs)
      ? latestMs - RECENT_HISTORY_WINDOW_MS
      : Number.NEGATIVE_INFINITY;

    historyByKey[key] = points
      .filter((point) => {
        const pointMs = Date.parse(point.observedAt);
        return Number.isFinite(pointMs) && pointMs >= cutoffMs;
      })
      .map(({ date, value }) => ({ date, value }));
  }

  return historyByKey;
};

export const buildCanonicalTreasuryFromReadModel = (
  model: MaterializedSignalReadModel,
  snapshotFallback?: TreasuryData,
): TreasuryData | null => {
  const oneMonth = getSignalValue(model, "TREASURY_1M");
  const threeMonth = getSignalValue(model, "TREASURY_3M");
  const twoYear = getSignalValue(model, "TREASURY_2Y");
  const tenYear = getSignalValue(model, "TREASURY_10Y");

  /**
   * The trailing one-month-bill window the read model already materializes
   * (92 days per signal key). The tightening-speed term reads a ~91-day move,
   * so without this the canonical read path — the default — would evaluate the
   * velocity term at 0 while the direct-fetch path measured it, and the two
   * would disagree about the same week.
   */
  const oneMonthHistory = model.recentHistory?.TREASURY_1M ?? undefined;

  const liveValues = { oneMonth, threeMonth, twoYear, tenYear };
  const allLive = Object.values(liveValues).every((v) => typeof v === "number");

  if (allLive) {
    const source = model.signals.TREASURY_1M?.snapshot.source.url ?? "https://fred.stlouisfed.org";
    const observedAt = model.signals.TREASURY_1M?.snapshot.observedAt ?? model.asOf;
    return {
      source,
      record_date: observedAt.slice(0, 10),
      fetched_at: model.asOf,
      isLive: true,
      oneMonthHistory,
      yields: {
        oneMonth,
        threeMonth,
        twoYear,
        tenYear,
      },
    };
  }

  if (!snapshotFallback) {
    return null;
  }

  const fy = snapshotFallback.yields;
  const resolvedYields = {
    oneMonth: typeof oneMonth === "number" ? oneMonth : fy.oneMonth,
    threeMonth: typeof threeMonth === "number" ? threeMonth : fy.threeMonth,
    twoYear: typeof twoYear === "number" ? twoYear : fy.twoYear,
    tenYear: typeof tenYear === "number" ? tenYear : fy.tenYear,
  };

  if (Object.values(resolvedYields).every((v) => typeof v !== "number")) {
    return null;
  }

  const firstAvailableModelSignal =
    model.signals.TREASURY_1M ??
    model.signals.TREASURY_3M ??
    model.signals.TREASURY_2Y ??
    model.signals.TREASURY_10Y;

  const source = firstAvailableModelSignal?.snapshot.source.url
    ?? snapshotFallback.source
    ?? "https://fred.stlouisfed.org";
  const observedAt = firstAvailableModelSignal?.snapshot.observedAt
    ?? snapshotFallback.record_date
    ?? model.asOf;

  return {
    source,
    record_date: observedAt.slice(0, 10),
    fetched_at: model.asOf,
    isLive: false,
    fallback_at: model.asOf,
    fallback_reason: "Partial treasury data — missing series filled from snapshot",
    oneMonthHistory,
    yields: resolvedYields,
  };
};

const macroSignalMap: Partial<Record<MacroSeriesReading["id"], SignalKey>> = {
  BBB_CREDIT_SPREAD: "BBB_CREDIT_SPREAD",
  CPI_YOY: "CPI_YOY",
  HY_CREDIT_SPREAD: "HY_CREDIT_SPREAD",
  UNEMPLOYMENT_RATE: "UNEMPLOYMENT_RATE",
  CHICAGO_FCI: "CHICAGO_FCI",
  VIX_INDEX: "VIX_INDEX",
};

export const buildCanonicalMacroSeriesFromReadModel = (
  model: MaterializedSignalReadModel,
  baseSeries: MacroSeriesReading[] = snapshotMacroSeries,
  snapshots: SignalEntitySnapshot[] = [],
): MacroSeriesReading[] => {
  const recentHistory = model.recentHistory;
  const historyBySignalKey = recentHistory
    ? recentHistory
    : buildRecentHistoryBySignalKey(snapshots);

  return baseSeries.map((series) => {
    const signalKey = macroSignalMap[series.id];
    if (!signalKey) {
      return series;
    }

    const canonical = model.signals[signalKey]?.snapshot;
    const history = historyBySignalKey[signalKey] ?? series.history;
    if (!canonical || typeof canonical.value !== "number") {
      return {
        ...series,
        history,
      };
    }

    return {
      ...series,
      value: canonical.value,
      record_date: canonical.observedAt.slice(0, 10),
      fetched_at: canonical.ingestedAt,
      isLive: true,
      sourceLabel: canonical.source.label,
      sourceUrl: canonical.source.url,
      history,
    };
  });
};

const BACKGROUND_REFRESH_LOCK_TTL_SECONDS = 120;

export const loadCanonicalReportInputs = async (
  options?: { fetcher?: typeof fetch; store?: IngestionStore; refresh?: "inline" | "background" | "none" },
) => {
  const store = options?.store ?? getDefaultIngestionStore();
  let model = await loadMaterializedSignals(store);
  const familiesToRefresh = options?.refresh === "none" ? [] : resolveSignalFamiliesToRefresh(model);

  if (familiesToRefresh.length > 0) {
    if (model && options?.refresh === "background") {
      /* Serve the current model and refresh due families off the request. Only a cold
       * store (no materialized model at all) still ingests inline, since there is
       * nothing stale to serve. The lock bounds duplicate upstream fetches when
       * concurrent isolates hit the same due window. */
      const fetcher = options?.fetcher;
      void runInBackground("canonical-signal-refresh", async () => {
        const acquired = (await store.acquireRefreshLock?.(BACKGROUND_REFRESH_LOCK_TTL_SECONDS)) ?? true;
        if (!acquired) {
          return;
        }
        await ingestCanonicalSignals({ fetcher, store, families: familiesToRefresh });
        await revalidateReportDataCaches();
      });
    } else {
      await ingestCanonicalSignals({ fetcher: options?.fetcher, store, families: familiesToRefresh });
      model = await loadMaterializedSignals(store);
    }
  }

  if (!model) {
    return null;
  }

  const treasury = buildCanonicalTreasuryFromReadModel(model, snapshotFallback);
  if (!treasury) {
    return null;
  }

  const hydratedMacroSeries = await loadMacroSeries(options?.fetcher);

  /* Read snapshots only when the materialized model lacks recentHistory (legacy records).
   * Newly-written models include history directly, so we avoid the snapshot scan entirely. */
  const storedSnapshots = model.recentHistory ? [] : await store.readSnapshots();

  return {
    treasury,
    macroSeries: buildCanonicalMacroSeriesFromReadModel(model, hydratedMacroSeries, storedSnapshots),
    materializedSignals: model,
  };
};
