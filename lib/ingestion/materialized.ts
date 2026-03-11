import { SIGNAL_CADENCE } from "./cadence";
import { SIGNAL_FAMILIES, pullSignalFamily } from "./families";
import { getDefaultIngestionStore, type IngestionStore } from "./store";
import type { MacroSeriesReading, TreasuryData } from "../types";
import { macroSeries as snapshotMacroSeries } from "../macroSnapshot";
import type { MaterializedSignalReadModel, SignalEntitySnapshot, SignalKey } from "./types";

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
}: {
  fetcher?: typeof fetch;
  store?: IngestionStore;
} = {}) => {
  const ingestedAt = new Date().toISOString();
  const settled = await Promise.allSettled(SIGNAL_FAMILIES.map((family) => pullSignalFamily(family, fetcher, ingestedAt)));
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

const getSignalValue = (model: MaterializedSignalReadModel, key: SignalKey) => model.signals[key]?.snapshot.value ?? null;

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
  HY_CREDIT_SPREAD: "HY_CREDIT_SPREAD",
  UNEMPLOYMENT_RATE: "UNEMPLOYMENT_RATE",
  CHICAGO_FCI: "CHICAGO_FCI",
  VIX_INDEX: "VIX_INDEX",
};

export const buildCanonicalMacroSeriesFromReadModel = (model: MaterializedSignalReadModel): MacroSeriesReading[] =>
  snapshotMacroSeries.map((series) => {
    const signalKey = macroSignalMap[series.id];
    if (!signalKey) {
      return series;
    }

    const canonical = model.signals[signalKey]?.snapshot;
    if (!canonical || typeof canonical.value !== "number") {
      return series;
    }

    return {
      ...series,
      value: canonical.value,
      record_date: canonical.observedAt.slice(0, 10),
      fetched_at: canonical.ingestedAt,
      isLive: true,
      sourceLabel: canonical.source.label,
      sourceUrl: canonical.source.url,
    };
  });

export const loadCanonicalReportInputs = async (options?: { fetcher?: typeof fetch; store?: IngestionStore }) => {
  const store = options?.store ?? getDefaultIngestionStore();
  let model = await loadMaterializedSignals(store);

  if (!model) {
    await ingestCanonicalSignals({ fetcher: options?.fetcher, store });
    model = await loadMaterializedSignals(store);
  }

  if (!model) {
    return null;
  }

  const treasury = buildCanonicalTreasuryFromReadModel(model);
  if (!treasury) {
    return null;
  }

  return {
    treasury,
    macroSeries: buildCanonicalMacroSeriesFromReadModel(model),
    materializedSignals: model,
  };
};
