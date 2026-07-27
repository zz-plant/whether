import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { KvIngestionStore } from "../lib/ingestion/store";
import type { SignalEntitySnapshot } from "../lib/ingestion/types";

const SNAPSHOT_PREFIX = "ingestion:snapshot:";
const SNAPSHOT_INDEX_KEY = "ingestion:snapshot:index";

const buildSnapshot = (sequence: number): SignalEntitySnapshot => ({
  signalKey: "TREASURY_1M",
  family: "rates",
  value: sequence,
  unit: "%",
  source: { label: "FRED", url: "https://fred.stlouisfed.org/series/DGS1MO", seriesId: "DGS1MO" },
  observedAt: new Date(Date.UTC(2020, 0, 1) + sequence * 86_400_000).toISOString(),
  ingestedAt: new Date(Date.UTC(2020, 0, 1) + sequence * 86_400_000).toISOString(),
  quality: "observed",
  confidence: "high",
});

const createKv = (count: number) => {
  const store = new Map<string, string>();

  for (let sequence = 0; sequence < count; sequence++) {
    store.set(
      `${SNAPSHOT_PREFIX}${String(sequence).padStart(12, "0")}`,
      JSON.stringify({ sequence, snapshot: buildSnapshot(sequence) }),
    );
  }
  store.set(SNAPSHOT_INDEX_KEY, String(count - 1));

  const gets: string[] = [];

  return {
    gets,
    listCalls: { count: 0 },
    kv: {
      async get(key: string) {
        gets.push(key);
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
        this.listCalls.count++;
        const keys = [...store.keys()]
          .filter((key) => key.startsWith(options?.prefix ?? ""))
          .sort()
          .map((name) => ({ name }));
        return { keys, list_complete: true as const };
      },
      listCalls: { count: 0 },
    },
  };
};

describe("KvIngestionStore.readSnapshots", () => {
  it("bounds an unpaginated read instead of fetching every snapshot ever written", async () => {
    const { kv, gets } = createKv(7_500);
    const snapshots = await new KvIngestionStore(kv).readSnapshots();

    // Regression guard: the previous implementation issued one get per key in the
    // namespace, which stalled every request that touched report data in production.
    const snapshotGets = gets.filter((key) => key !== SNAPSHOT_INDEX_KEY);
    assert.equal(snapshotGets.length, 1_500);
    assert.equal(snapshots.length, 1_500);
  });

  it("returns the newest snapshots when the read is capped", async () => {
    const { kv } = createKv(7_500);
    const snapshots = await new KvIngestionStore(kv).readSnapshots();

    assert.equal(snapshots.at(0)?.value, 6_000);
    assert.equal(snapshots.at(-1)?.value, 7_499);
  });

  it("keeps ascending sequence order", async () => {
    const { kv } = createKv(50);
    const snapshots = await new KvIngestionStore(kv).readSnapshots();

    const values = snapshots.map((snapshot) => snapshot.value);
    assert.deepEqual(values, [...values].sort((left, right) => Number(left) - Number(right)));
  });

  it("honors cursor and limit as a forward page", async () => {
    const { kv, gets } = createKv(7_500);
    const snapshots = await new KvIngestionStore(kv).readSnapshots({ cursor: "10", limit: 5 });

    assert.deepEqual(snapshots.map((snapshot) => snapshot.value), [11, 12, 13, 14, 15]);
    assert.equal(gets.filter((key) => key !== SNAPSHOT_INDEX_KEY).length, 5);
  });

  it("avoids listing the namespace when the sequence index is present", async () => {
    const { kv } = createKv(100);
    await new KvIngestionStore(kv).readSnapshots();

    assert.equal(kv.listCalls.count, 0);
  });

  it("falls back to listing when the sequence index is missing", async () => {
    const { kv } = createKv(20);
    await kv.put(SNAPSHOT_INDEX_KEY, "not-a-number");

    const snapshots = await new KvIngestionStore(kv).readSnapshots();

    assert.equal(kv.listCalls.count > 0, true);
    assert.equal(snapshots.length, 20);
  });
});
