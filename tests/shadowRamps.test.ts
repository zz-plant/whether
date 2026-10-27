import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "bun:test";

import rateInputs from "../data/research/premise-test-rate-inputs.json";
import { scoreShadowRamps, type ShadowRampRecord } from "../lib/research/shadowRamps";
import { readRamp, replayRamp, trailingMonthEndWindow } from "../lib/research/candidateRamps";
import { buildTimeMachineReplaySteps } from "../lib/timeMachine/timeMachineCache";
import { refreshOperatingState } from "../lib/operatingState/refreshOperatingState";
import { KvOperatingSnapshotStore, resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";
import { briefSourceFromSnapshot, buildBriefDocument } from "../lib/report/briefDocument";
import { buildMaterializedReadModel } from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot, SignalFamily, SignalKey } from "../lib/ingestion/types";
import { buildLineage } from "../lib/storage/lineage";
import { resetFredCircuitBreaker } from "../lib/fred";
import { resetPrimedMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { resetRegimeMachineSnapshotCache } from "../lib/storage/regimeMachineSnapshotStore";
import type { KvNamespace } from "../lib/runtime/kv";
import { snapshotData } from "../lib/snapshot";
import { macroSeries } from "../lib/macroSnapshot";
import type { TreasuryData } from "../lib/types";

/*
 * Shadow scoring (docs/research/premise-test-preregistration.md §10): the three
 * registered candidate ramps are scored beside every weekly reading, stored on
 * the operating snapshot, and read by nothing that publishes.
 */

const CANDIDATES = ["wide", "trailing-percentile", "bill-median"];

/** The bundled reading, marked live in October 2026, with a daily one-month-bill tail. */
const liveTreasury: TreasuryData = {
  ...snapshotData,
  isLive: true,
  record_date: "2026-10-06",
  fetched_at: "2026-10-06T12:00:00.000Z",
  yields: { oneMonth: 4.06, threeMonth: 4.21, twoYear: 4.9, tenYear: 5.3 },
  oneMonthHistory: [
    { date: "2026-07-31", value: 3.78 },
    { date: "2026-08-31", value: 3.85 },
    { date: "2026-09-30", value: 4.02 },
    { date: "2026-10-06", value: 4.06 },
  ],
};

describe("scoreShadowRamps", () => {
  it("scores each registered candidate, says it is not the guidance, and seeds on a cold start", () => {
    const record = scoreShadowRamps({ treasury: liveTreasury, macroSeries, previous: null });
    assert.ok(record);
    assert.equal(record.usedForGuidance, false);
    assert.equal(record.registration, "docs/research/premise-test-preregistration.md");
    assert.equal(record.machineStateFrom, "seeded");
    assert.deepEqual(record.scores.map((score) => score.ramp), CANDIDATES);
    for (const score of record.scores) {
      assert.notEqual(score.ratePoints, null, score.ramp);
      assert.notEqual(score.conditions, null, score.ramp);
      assert.ok(score.machineState, score.ramp);
    }
  });

  it("gives each candidate the points its ramp gives this reading's inputs", () => {
    const record = scoreShadowRamps({ treasury: liveTreasury, macroSeries, previous: null });
    const byRamp = new Map(record?.scores.map((score) => [score.ramp, score]));
    assert.equal(byRamp.get("wide")?.ratePoints, readRamp("wide", { oneMonth: 4.06, threeMonth: null, trailingMonthEnds: [] }).ratePoints);
    assert.equal(byRamp.get("bill-median")?.input, (4.06 + 4.21) / 2);
    assert.equal(byRamp.get("trailing-percentile")?.flag, null, "the cache holds the ten years before October 2026");
  });

  it("carries each candidate's machine state from the previous record", () => {
    const first = scoreShadowRamps({ treasury: liveTreasury, macroSeries, previous: null });
    assert.ok(first);
    const second = scoreShadowRamps({
      treasury: { ...liveTreasury, record_date: "2026-10-13", fetched_at: "2026-10-13T12:00:00.000Z" },
      macroSeries,
      previous: first,
    });
    assert.equal(second?.machineStateFrom, "previous-record");
  });

  it("seeds instead of reading a stored state that is not one", () => {
    const first = scoreShadowRamps({ treasury: liveTreasury, macroSeries, previous: null });
    assert.ok(first);
    // As it would come back out of KV: JSON the store does not check field by field.
    const corrupted: ShadowRampRecord = JSON.parse(
      JSON.stringify({
        ...first,
        scores: first.scores.map((score) => ({ ...score, machineState: { committedState: "SUNNY", pendingState: null, pendingCount: 0 } })),
      }),
    );
    const next = scoreShadowRamps({ treasury: liveTreasury, macroSeries, previous: corrupted });
    assert.equal(next?.machineStateFrom, "seeded");
  });

  it("returns null rather than throwing when a reading cannot be scored", () => {
    const unreadable = { ...liveTreasury };
    Object.defineProperty(unreadable, "yields", {
      get() {
        throw new Error("unreadable yields");
      },
    });
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal(scoreShadowRamps({ treasury: unreadable, macroSeries, previous: null }), null);
    } finally {
      console.error = originalError;
    }
  });

  it("seeds from January 2022 to the same machine state the full record reaches", () => {
    // The full replay reads 2002–2011 month-ends from the research inputs; the seed needs only the bundle.
    const monthEnds = new Map<string, number>(rateInputs.oneMonthBillMonthEnds.map((entry) => [entry.month, entry.value]));
    const steps = buildTimeMachineReplaySteps();
    for (const step of steps) {
      if (typeof step.treasury.yields.oneMonth === "number") {
        monthEnds.set(step.treasury.record_date.slice(0, 7), step.treasury.yields.oneMonth);
      }
    }
    const withWindows = steps.map((step) => ({ ...step, trailingMonthEnds: trailingMonthEndWindow(step.treasury.record_date.slice(0, 7), monthEnds) }));
    for (const ramp of ["wide", "trailing-percentile", "bill-median"] as const) {
      const full = replayRamp(ramp, withWindows).at(-1)?.machineState;
      const seeded = replayRamp(ramp, withWindows.filter((step) => step.treasury.record_date >= "2022-01-01")).at(-1)?.machineState;
      assert.deepEqual(seeded, full, ramp);
    }
  });
});

/* ------------------------------------------------------------------------ */
/* The weekly pipeline                                                       */
/* ------------------------------------------------------------------------ */

const FAMILIES: Array<[SignalFamily, SignalKey[]]> = [
  ["rates", ["TREASURY_1M", "TREASURY_3M", "TREASURY_2Y", "TREASURY_10Y"]],
  ["spreads", ["BBB_CREDIT_SPREAD", "HY_CREDIT_SPREAD"]],
  ["labor", ["UNEMPLOYMENT_RATE"]],
  ["inflation", ["CPI_YOY"]],
  ["credit", ["CHICAGO_FCI"]],
  ["volatility", ["VIX_INDEX"]],
];

/** A complete materialized model, every family ingested a moment ago, so the refresh ingests nothing. */
const freshModel = () => {
  const now = new Date();
  const ingestedAt = now.toISOString();
  const snapshots: SignalEntitySnapshot[] = FAMILIES.flatMap(([family, keys]) =>
    keys.map((signalKey) => ({
      signalKey,
      family,
      value: signalKey === "TREASURY_1M" ? 3.9 : 3,
      unit: "%",
      source: { label: "FRED", url: `https://fred.stlouisfed.org/series/${signalKey}`, seriesId: signalKey },
      observedAt: ingestedAt,
      ingestedAt,
      quality: "observed",
      confidence: "high",
    })),
  );
  return JSON.stringify({ ...buildLineage("request-received-at"), model: buildMaterializedReadModel(snapshots, now) });
};

const memoryKv = (seed: Record<string, string>): KvNamespace => {
  const store = new Map(Object.entries(seed));
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { keys: [], list_complete: true };
    },
  };
};

describe("the weekly pipeline stores the shadow record beside the reading", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetOperatingSnapshotStore();
    resetFredCircuitBreaker();
    resetPrimedMonthlyRegimeHistory();
    resetRegimeMachineSnapshotCache();
    Object.assign(globalThis, { WHETHER_DURABLE_KV: memoryKv({ "ingestion:materialized:latest": freshModel() }) });
    globalThis.fetch = async () => new Response("not served by this test", { status: 404 });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetOperatingSnapshotStore();
    resetFredCircuitBreaker();
    // The refresh records the month in progress (which the report read primes into the
    // process) and saves its machine state; drop both so the next file starts clean.
    resetPrimedMonthlyRegimeHistory();
    resetRegimeMachineSnapshotCache();
  });

  it("writes it on the snapshot, threads it to the next run, and keeps it out of everything published", async () => {
    const first = await refreshOperatingState({ now: new Date() });
    assert.ok(first.ok, first.ok ? "" : first.error);
    const stored = first.snapshot.shadowRamps;
    assert.ok(stored, "the snapshot carries the shadow record");
    assert.equal(stored.machineStateFrom, "seeded");
    assert.deepEqual(stored.scores.map((score) => score.ramp), CANDIDATES);

    const second = await refreshOperatingState({ now: new Date() });
    assert.ok(second.ok, second.ok ? "" : second.error);
    assert.equal(second.snapshot.shadowRamps?.machineStateFrom, "previous-record");

    // Stored as JSON and read back through the store's own guard.
    const kvStore = new KvOperatingSnapshotStore(memoryKv({}));
    await kvStore.write(second.snapshot);
    assert.deepEqual((await kvStore.readLatest())?.shadowRamps, second.snapshot.shadowRamps);

    // Nothing published reads it: the assessment and the weekly call never mention a candidate,
    // and the brief document every paste and send renders is the same without the record.
    const published = JSON.stringify({ assessment: second.snapshot.assessment, weeklyCall: second.snapshot.weeklyCall });
    for (const marker of ["shadow", ...CANDIDATES]) {
      assert.ok(!published.includes(marker), marker);
    }
    const { shadowRamps: _omitted, ...withoutShadow } = second.snapshot;
    assert.deepEqual(
      buildBriefDocument(briefSourceFromSnapshot(second.snapshot), second.snapshot.weeklyCall),
      buildBriefDocument(briefSourceFromSnapshot(withoutShadow), withoutShadow.weeklyCall),
    );
  });
});
