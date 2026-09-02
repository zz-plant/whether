import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { IngestCoordinator, REFRESH_ALARM_INTERVAL_MS } from "../worker/ingestCoordinator";
import { DurableStorageIngestionStore, type CoordinatorStorage } from "../lib/ingestion/durableStorageStore";
import { IngestCoordinatorStore, resolveIngestCoordinatorNamespace } from "../lib/ingestion/coordinatorStore";
import { COORDINATOR_ORIGIN, COORDINATOR_ROUTES, type CoordinatorNamespace } from "../lib/ingestion/coordinatorProtocol";
import { getDefaultIngestionStore, KvIngestionStore } from "../lib/ingestion/store";
import { buildMaterializedReadModel, loadCanonicalReportInputs } from "../lib/ingestion/materialized";
import type { SignalEntitySnapshot, SignalKey } from "../lib/ingestion/types";

/**
 * A Map that behaves like DurableObjectStorage for the calls the store makes: sorted `list`
 * with prefix/start/limit, a `transaction` that hands back the same storage, and an alarm slot.
 */
class FakeStorage implements CoordinatorStorage {
  readonly map = new Map<string, unknown>();
  alarm: number | null = null;
  writes = 0;

  async get(key: string): Promise<unknown> {
    return this.map.get(key);
  }

  async put(key: string, value: unknown): Promise<void> {
    this.writes += 1;
    this.map.set(key, value);
  }

  async list(options?: { prefix?: string; start?: string; limit?: number }): Promise<Map<string, unknown>> {
    const keys = [...this.map.keys()].sort();
    const selected = keys.filter(
      (key) => (!options?.prefix || key.startsWith(options.prefix)) && (!options?.start || key >= options.start),
    );
    const page = options?.limit === undefined ? selected : selected.slice(0, options.limit);
    return new Map(page.map((key) => [key, this.map.get(key)]));
  }

  async transaction<T>(closure: (txn: CoordinatorStorage) => Promise<T>): Promise<T> {
    return closure(this);
  }

  async getAlarm() {
    return this.alarm;
  }

  async setAlarm(scheduledTime: number) {
    this.alarm = scheduledTime;
  }
}

const snapshot = (signalKey: SignalKey, value: number, ingestedAt = "2026-09-02T12:00:00.000Z"): SignalEntitySnapshot => ({
  signalKey,
  family: "rates",
  value,
  unit: "%",
  source: { label: "FRED", url: `https://fred.stlouisfed.org/series/${signalKey}`, seriesId: signalKey },
  observedAt: ingestedAt,
  ingestedAt,
  quality: "observed",
  confidence: "high",
});

const ALL_KEYS: SignalKey[] = [
  "TREASURY_1M", "TREASURY_3M", "TREASURY_2Y", "TREASURY_10Y", "BBB_CREDIT_SPREAD",
  "HY_CREDIT_SPREAD", "UNEMPLOYMENT_RATE", "CPI_YOY", "CHICAGO_FCI", "VIX_INDEX",
];

const fullModel = (ingestedAt: string) =>
  buildMaterializedReadModel(ALL_KEYS.map((key) => snapshot(key, 3, ingestedAt)), new Date(ingestedAt));

/** FRED served from a generator: 500 daily rows per series, CPI drifting so year-over-year exists. */
const fixtureFetch: typeof fetch = async (input) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.host !== "fred.stlouisfed.org") return new Response("not served", { status: 404 });
  const seriesId = url.searchParams.get("id") ?? "X";
  const rows = ["observation_date,VALUE"];
  const today = new Date();
  for (let day = 500; day >= 0; day -= 1) {
    const date = new Date(today.getTime() - day * 86_400_000).toISOString().slice(0, 10);
    rows.push(`${date},${seriesId === "CPIAUCSL" ? 300 + (500 - day) * 0.03 : 4}`);
  }
  return new Response(rows.join("\n"), { status: 200 });
};

/** The object and a client talking to it in-process: the stub is the object's own fetch. */
const coordinatorPair = (options: { now?: () => number; fetcher?: typeof fetch } = {}) => {
  const storage = new FakeStorage();
  const object = new IngestCoordinator({ storage }, options.fetcher ?? fixtureFetch, options.now);
  const client = new IngestCoordinatorStore({ fetch: (request) => object.fetch(request) });
  return { storage, object, client };
};

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_INGEST_COORDINATOR");
  Reflect.deleteProperty(globalThis, "INGEST_COORDINATOR");
});

describe("DurableStorageIngestionStore", () => {
  it("appends snapshots under dense sequence numbers and reads them back in order", async () => {
    const storage = new FakeStorage();
    const store = new DurableStorageIngestionStore(storage);

    await store.appendSnapshots([snapshot("TREASURY_10Y", 4.2), snapshot("TREASURY_2Y", 3.9)]);
    await store.appendSnapshots([snapshot("VIX_INDEX", 16)]);

    assert.equal(await store.latestSnapshotSequence(), 2);
    const all = await store.readSnapshots();
    assert.deepEqual(all.map((entry) => entry.signalKey), ["TREASURY_10Y", "TREASURY_2Y", "VIX_INDEX"]);

    const page = await store.readSnapshots({ cursor: "0", limit: 1 });
    assert.deepEqual(page.map((entry) => entry.signalKey), ["TREASURY_2Y"], "a limit pages forward from the cursor");
  });

  it("round-trips the materialized model and answers null before one exists", async () => {
    const store = new DurableStorageIngestionStore(new FakeStorage());
    assert.equal(await store.readLatestMaterialized(), null);

    const model = fullModel("2026-09-02T12:00:00.000Z");
    await store.writeLatestMaterialized(model);
    assert.deepEqual(await store.readLatestMaterialized(), model);
  });

  it("grants the refresh lock to one caller until it expires", async () => {
    let now = 1_000_000;
    const store = new DurableStorageIngestionStore(new FakeStorage(), () => now);

    assert.equal(await store.acquireRefreshLock(120), true);
    assert.equal(await store.acquireRefreshLock(120), false, "held: the second caller is refused");

    now += 121_000;
    assert.equal(await store.acquireRefreshLock(120), true, "expired: the lock can be taken again");
  });
});

describe("IngestCoordinator", () => {
  it("serves the store over its fetch surface for the Worker-side client", async () => {
    const { client, storage } = coordinatorPair();

    assert.equal(await client.readLatestMaterialized(), null);
    await client.appendSnapshots([snapshot("TREASURY_10Y", 4.2)]);
    const model = fullModel("2026-09-02T12:00:00.000Z");
    await client.writeLatestMaterialized(model);

    assert.deepEqual(await client.readLatestMaterialized(), model);
    assert.deepEqual((await client.readSnapshots()).map((entry) => entry.value), [4.2]);
    assert.equal(client.backendStatus(), "durable");
    assert.ok(storage.alarm !== null, "writing a model arms the refresh alarm");
  });

  it("arbitrates the lock across clients because every call lands on one object", async () => {
    const { object } = coordinatorPair({ now: () => 5_000_000 });
    const first = new IngestCoordinatorStore({ fetch: (request) => object.fetch(request) });
    const second = new IngestCoordinatorStore({ fetch: (request) => object.fetch(request) });

    assert.equal(await first.acquireRefreshLock(120), true);
    assert.equal(await second.acquireRefreshLock(120), false);
  });

  it("rejects malformed bodies and unknown routes without touching storage", async () => {
    const { object, storage } = coordinatorPair();

    const badModel = await object.fetch(
      new Request(`${COORDINATOR_ORIGIN}${COORDINATOR_ROUTES.materialized}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: { nope: true } }),
      }),
    );
    assert.equal(badModel.status, 400);

    const unknown = await object.fetch(new Request(`${COORDINATOR_ORIGIN}/nowhere`));
    assert.equal(unknown.status, 404);
    assert.equal(storage.writes, 0);
  });

  it("refreshes due families on its alarm and re-arms it", async () => {
    const { object, client, storage } = coordinatorPair();
    // A stale model: every family is past its poll window.
    await client.writeLatestMaterialized(fullModel(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()));
    storage.alarm = null;

    const before = Date.now();
    await object.alarm();

    const model = await client.readLatestMaterialized();
    assert.ok(model, "a model is materialized");
    assert.ok(Date.parse(model.signals.TREASURY_10Y?.snapshot.ingestedAt ?? "") >= before, "the due family was re-ingested");
    assert.ok(storage.alarm !== null && storage.alarm >= before + REFRESH_ALARM_INTERVAL_MS - 1000, "the next check is armed");
  });

  it("serves a cold read path end to end, so Invariant 1b holds on this backend too", async () => {
    const { client } = coordinatorPair();
    const inputs = await loadCanonicalReportInputs({ store: client, fetcher: fixtureFetch, refresh: "inline" });

    assert.ok(inputs, "the cold store ingested inline and served the report inputs");
    assert.equal(inputs.treasury.isLive, true);
    assert.ok((await client.readSnapshots()).length >= 4, "the object holds the ingested snapshots");
  });
});

describe("getDefaultIngestionStore backend selection", () => {
  const fakeNamespace = (object: IngestCoordinator): CoordinatorNamespace => ({
    idFromName: (name: string) => name,
    get: () => ({ fetch: (request: Request) => object.fetch(request) }),
  });

  it("stays on KV until the deployment opts in, then prefers the coordinator", () => {
    const trackingKv = {
      async get() {
        return null;
      },
      async put() {},
      async delete() {},
      async list() {
        return { keys: [], list_complete: true };
      },
    };
    Object.assign(globalThis, { WHETHER_DURABLE_KV: trackingKv, INGEST_COORDINATOR: fakeNamespace(coordinatorPair().object) });

    try {
      assert.equal(resolveIngestCoordinatorNamespace(), null, "the binding alone does not opt in");
      assert.ok(getDefaultIngestionStore() instanceof KvIngestionStore);

      Object.assign(globalThis, { WHETHER_INGEST_COORDINATOR: "1" });
      assert.ok(resolveIngestCoordinatorNamespace(), "flag plus binding opts in");
      assert.ok(getDefaultIngestionStore() instanceof IngestCoordinatorStore);

      Reflect.deleteProperty(globalThis, "WHETHER_INGEST_COORDINATOR");
      assert.ok(getDefaultIngestionStore() instanceof KvIngestionStore, "the selection is re-checked, not memoized for good");
    } finally {
      Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    }
  });
});
