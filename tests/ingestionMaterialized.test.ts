import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCanonicalMacroSeriesFromReadModel,
  buildCanonicalTreasuryFromReadModel,
  buildMaterializedReadModel,
  resolveSignalFamiliesToRefresh,
} from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot } from "../lib/ingestion/types";
import type { TreasuryData } from "../lib/types";

const mockSnapshotFallback: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-06-17",
  fetched_at: "2026-06-22T17:05:18.881Z",
  isLive: false,
  yields: {
    oneMonth: 3.68,
    threeMonth: 3.83,
    twoYear: 4.2,
    tenYear: 4.49,
  },
};

const baseSnapshots: SignalEntitySnapshot[] = [
  {
    signalKey: "TREASURY_1M",
    family: "rates",
    value: 5.2,
    unit: "%",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS1MO", seriesId: "DGS1MO" },
    observedAt: "2026-01-10T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
  {
    signalKey: "TREASURY_3M",
    family: "rates",
    value: 5.1,
    unit: "%",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS3MO", seriesId: "DGS3MO" },
    observedAt: "2026-01-10T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
  {
    signalKey: "TREASURY_2Y",
    family: "rates",
    value: 4.8,
    unit: "%",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS2", seriesId: "DGS2" },
    observedAt: "2026-01-10T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
  {
    signalKey: "TREASURY_10Y",
    family: "rates",
    value: 4.5,
    unit: "%",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS10", seriesId: "DGS10" },
    observedAt: "2026-01-10T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
  {
    signalKey: "CPI_YOY",
    family: "inflation",
    value: 3.1,
    unit: "%",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/CPIAUCSL", seriesId: "CPIAUCSL" },
    observedAt: "2026-01-01T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
  {
    signalKey: "VIX_INDEX",
    family: "volatility",
    value: 18,
    unit: "index",
    source: { label: "FRED", url: "https://fred.stlouisfed.org/series/VIXCLS", seriesId: "VIXCLS" },
    observedAt: "2026-01-10T00:00:00.000Z",
    ingestedAt: "2026-01-10T01:00:00.000Z",
    quality: "observed",
    confidence: "high",
  },
];

describe("materialized ingestion model", () => {
  it("marks stale status from cadence windows", () => {
    const model = buildMaterializedReadModel(baseSnapshots, new Date("2026-01-12T10:00:00.000Z"));

    assert.equal(model.signals.TREASURY_1M?.staleness.status, "stale");
  });

  it("builds canonical treasury when all required rates are present", () => {
    const model = buildMaterializedReadModel(baseSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const treasury = buildCanonicalTreasuryFromReadModel(model);

    assert.ok(treasury);
    assert.equal(treasury?.yields.oneMonth, 5.2);
    assert.equal(treasury?.yields.tenYear, 4.5);
  });

  it("hydrates matching macro series values from canonical snapshots", () => {
    const model = buildMaterializedReadModel(baseSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const macro = buildCanonicalMacroSeriesFromReadModel(model);

    const cpi = macro.find((series) => series.id === "CPI_YOY");
    const vix = macro.find((series) => series.id === "VIX_INDEX");
    assert.equal(cpi?.value, 3.1);
    assert.equal(cpi?.isLive, true);
    assert.equal(vix?.value, 18);
    assert.equal(vix?.isLive, true);
  });

  it("hydrates recent macro history from stored signal snapshots", () => {
    const snapshots: SignalEntitySnapshot[] = [
      ...baseSnapshots,
      {
        signalKey: "BBB_CREDIT_SPREAD",
        family: "spreads",
        value: 2.4,
        unit: "%",
        source: { label: "FRED", url: "https://fred.stlouisfed.org/series/BAA10Y", seriesId: "BAA10Y" },
        observedAt: "2025-11-28T00:00:00.000Z",
        ingestedAt: "2025-11-28T01:00:00.000Z",
        quality: "observed",
        confidence: "high",
      },
      {
        signalKey: "BBB_CREDIT_SPREAD",
        family: "spreads",
        value: 2.3,
        unit: "%",
        source: { label: "FRED", url: "https://fred.stlouisfed.org/series/BAA10Y", seriesId: "BAA10Y" },
        observedAt: "2025-12-15T00:00:00.000Z",
        ingestedAt: "2025-12-15T01:00:00.000Z",
        quality: "observed",
        confidence: "high",
      },
      {
        signalKey: "BBB_CREDIT_SPREAD",
        family: "spreads",
        value: 2.2,
        unit: "%",
        source: { label: "FRED", url: "https://fred.stlouisfed.org/series/BAA10Y", seriesId: "BAA10Y" },
        observedAt: "2026-01-10T00:00:00.000Z",
        ingestedAt: "2026-01-10T01:00:00.000Z",
        quality: "observed",
        confidence: "high",
      },
    ];
    const model = buildMaterializedReadModel(snapshots, new Date("2026-01-10T02:00:00.000Z"));
    const macro = buildCanonicalMacroSeriesFromReadModel(model, undefined, snapshots);

    const bbb = macro.find((series) => series.id === "BBB_CREDIT_SPREAD");
    assert.deepEqual(
      bbb?.history?.map((point) => point.date),
      ["2025-11-28", "2025-12-15", "2026-01-10"],
    );
    assert.equal(bbb?.value, 2.2);
    assert.equal(bbb?.record_date, "2026-01-10");
  });

  it("refreshes missing families before the model goes stale", () => {
    const model = buildMaterializedReadModel(baseSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const dueFamilies = resolveSignalFamiliesToRefresh(model, new Date("2026-01-10T02:30:00.000Z"));

    assert.deepEqual(dueFamilies, ["spreads", "labor", "credit"]);
  });

  it("refreshes fast families again after their poll windows elapse", () => {
    const model = buildMaterializedReadModel(baseSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const dueFamilies = resolveSignalFamiliesToRefresh(model, new Date("2026-01-10T03:30:01.000Z"));

    assert.deepEqual(dueFamilies, ["rates", "spreads", "labor", "credit", "volatility"]);
  });

  it("fills missing treasury series from snapshot fallback and marks degraded", () => {
    const partialSnapshots = baseSnapshots.filter(
      (s) => s.signalKey !== "TREASURY_2Y" && s.signalKey !== "TREASURY_10Y",
    );
    const model = buildMaterializedReadModel(partialSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const treasury = buildCanonicalTreasuryFromReadModel(model, mockSnapshotFallback);

    assert.ok(treasury);
    assert.equal(treasury?.isLive, false);
    assert.equal(
      treasury?.fallback_reason,
      "Partial treasury data — missing series filled from snapshot",
    );
    assert.equal(treasury?.yields.oneMonth, 5.2);
    assert.equal(treasury?.yields.threeMonth, 5.1);
    assert.equal(treasury?.yields.twoYear, 4.2);
    assert.equal(treasury?.yields.tenYear, 4.49);
  });

  it("returns degraded treasury when all series come from snapshot", () => {
    const nonRatesSnapshots = baseSnapshots.filter((s) => s.family !== "rates");
    const model = buildMaterializedReadModel(nonRatesSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const treasury = buildCanonicalTreasuryFromReadModel(model, mockSnapshotFallback);

    assert.ok(treasury);
    assert.equal(treasury?.isLive, false);
    assert.equal(treasury?.yields.oneMonth, 3.68);
    assert.equal(treasury?.yields.threeMonth, 3.83);
    assert.equal(treasury?.yields.twoYear, 4.2);
    assert.equal(treasury?.yields.tenYear, 4.49);
  });

  it("returns null when no series available from model or snapshot", () => {
    const nonRatesSnapshots = baseSnapshots.filter((s) => s.family !== "rates");
    const model = buildMaterializedReadModel(nonRatesSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const emptySnapshot: TreasuryData = {
      ...mockSnapshotFallback,
      yields: { oneMonth: null, threeMonth: null, twoYear: null, tenYear: null },
    };
    const treasury = buildCanonicalTreasuryFromReadModel(model, emptySnapshot);

    assert.equal(treasury, null);
  });

  it("returns null when some series missing and no snapshot provided", () => {
    const partialSnapshots = baseSnapshots.filter((s) => s.signalKey !== "TREASURY_10Y");
    const model = buildMaterializedReadModel(partialSnapshots, new Date("2026-01-10T02:00:00.000Z"));
    const treasury = buildCanonicalTreasuryFromReadModel(model);

    assert.equal(treasury, null);
  });
});
