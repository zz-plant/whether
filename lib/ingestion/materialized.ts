import { SIGNAL_CADENCE } from "./cadence";
import { SIGNAL_FAMILIES, pullSignalFamily } from "./families";
import { getDefaultIngestionStore, type IngestionStore } from "./store";
import type { MacroSeriesReading, SeriesHistoryPoint, TreasuryData } from "../types";
import { loadMacroSeries, macroSeries as snapshotMacroSeries } from "../macroSnapshot";
import type { MaterializedSignalReadModel, SignalEntitySnapshot, SignalFamily, SignalKey } from "./types";

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
  };
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
  const settled = await Promise.allSettled(families.map((family) => pullSignalFamily(family, fetcher, ingestedAt)));
  const snapshots = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  if (snapshots.length > 0) {
    await store.appendSnapshots(snapshots);
    const existingSnapshots = await store.readSnapshots();
    const readModel = buildMaterializedReadModel(existingSnapshots);
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

export const buildCanonicalTreasuryFromReadModel = (model: MaterializedSignalReadModel): TreasuryData | null => {
  const oneMonth = getSignalValue(model, "TREASURY_1M");
  const threeMonth = getSignalValue(model, "TREASURY_3M");
  const twoYear = getSignalValue(model, "TREASURY_2Y");
  const tenYear = getSignalValue(model, "TREASURY_10Y");

  if ([oneMonth, threeMonth, twoYear, tenYear].some((value) => typeof value !== "number")) {
    return null;
  }

  const source = model.signals.TREASURY_1M?.snapshot.source.url ?? "https://fred.stlouisfed.org";
  const observedAt = model.signals.TREASURY_1M?.snapshot.observedAt ?? model.asOf;
  return {
    source,
    record_date: observedAt.slice(0, 10),
    fetched_at: model.asOf,
    isLive: true,
    yields: {
      oneMonth,
      threeMonth,
      twoYear,
      tenYear,
    },
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
  const historyBySignalKey = buildRecentHistoryBySignalKey(snapshots);

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

export const loadCanonicalReportInputs = async (options?: { fetcher?: typeof fetch; store?: IngestionStore }) => {
  const store = options?.store ?? getDefaultIngestionStore();
  let model = await loadMaterializedSignals(store);
  const familiesToRefresh = resolveSignalFamiliesToRefresh(model);

  if (familiesToRefresh.length > 0) {
    await ingestCanonicalSignals({ fetcher: options?.fetcher, store, families: familiesToRefresh });
    model = await loadMaterializedSignals(store);
  }

  if (!model) {
    return null;
  }

  const treasury = buildCanonicalTreasuryFromReadModel(model);
  if (!treasury) {
    return null;
  }

  const storedSnapshots = await store.readSnapshots();
  const hydratedMacroSeries = await loadMacroSeries(options?.fetcher);

  return {
    treasury,
    macroSeries: buildCanonicalMacroSeriesFromReadModel(model, hydratedMacroSeries, storedSnapshots),
    materializedSignals: model,
  };
};
