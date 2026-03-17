import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanonicalMacroSeriesFromReadModel,
  buildCanonicalTreasuryFromReadModel,
  buildMaterializedReadModel,
  resolveSignalFamiliesToRefresh,
} from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot } from "../lib/ingestion/types";

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
    source: { label: "BLS public API", url: "https://api.bls.gov/publicAPI/v2/timeseries/data/", seriesId: "CUUR0000SA0" },
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
});
