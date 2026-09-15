import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { KV_BULK_READ_MAX_KEYS, KV_SINGLE_READ_CONCURRENCY, readKvValues, type KvNamespace } from "../lib/runtime/kv";
import { DurableEventLog } from "../lib/storage/eventLog";

type Call = { keys: string[]; options?: { cacheTtl?: number } };

/**
 * A namespace shaped like the runtime's: `getWithMetadata` exists, and `get` answers an
 * array of keys with a Map. Records every call so the chunking can be asserted. The
 * overloads are what make the double assignable to the repo's KvNamespace, which types
 * `get` for one key on purpose.
 */
const createBulkKv = (entries: Record<string, string>) => {
  const store = new Map(Object.entries(entries));
  const bulkCalls: Call[] = [];
  const singleCalls: string[] = [];

  async function get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  async function get(key: string[], options?: { cacheTtl?: number }): Promise<Map<string, string | null>>;
  async function get(key: string | string[], options?: { cacheTtl?: number }) {
    if (Array.isArray(key)) {
      bulkCalls.push({ keys: key, options });
      return new Map(key.map((name) => [name, store.get(name) ?? null]));
    }
    singleCalls.push(key);
    return store.get(key) ?? null;
  }

  const kv: KvNamespace & { getWithMetadata(): Promise<unknown> } = {
    get,
    async getWithMetadata() {
      return { value: null, metadata: null };
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async list() {
      return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true as const };
    },
  };
  return { bulkCalls, singleCalls, kv };
};

/** This repo's structural double: no `getWithMetadata`, and `get` only understands a string. */
const createSingleKv = (entries: Record<string, string>) => {
  const store = new Map(Object.entries(entries));
  const calls: unknown[] = [];
  let inFlight = 0;
  let peakInFlight = 0;
  return {
    calls,
    peakInFlight: () => peakInFlight,
    kv: {
      async get(key: string) {
        calls.push(key);
        inFlight++;
        peakInFlight = Math.max(peakInFlight, inFlight);
        await Promise.resolve();
        inFlight--;
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async list() {
        return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true as const };
      },
    },
  };
};

describe("readKvValues", () => {
  it("reads through the bulk get in chunks of at most 100 keys, preserving order and nulls", async () => {
    const entries = Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`k:${i}`, `v${i}`]));
    const { kv, bulkCalls, singleCalls } = createBulkKv(entries);
    const keys = [...Array.from({ length: 250 }, (_, i) => `k:${i}`), "k:missing"];

    const values = await readKvValues(kv, keys, { cacheTtl: 60 });

    assert.equal(values.length, 251);
    assert.equal(values[0], "v0");
    assert.equal(values[249], "v249");
    assert.equal(values[250], null);
    assert.equal(singleCalls.length, 0, "no single reads when bulk is available");
    assert.deepEqual(bulkCalls.map((call) => call.keys.length), [100, 100, 51]);
    assert.ok(bulkCalls.every((call) => call.keys.length <= KV_BULK_READ_MAX_KEYS));
    assert.ok(bulkCalls.every((call) => call.options?.cacheTtl === 60), "cacheTtl travels with the bulk read");
  });

  it("never hands an array to a double that lacks getWithMetadata, and bounds its fan-out", async () => {
    const entries = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k:${i}`, `v${i}`]));
    const single = createSingleKv(entries);

    const values = await readKvValues(single.kv, Object.keys(entries));

    assert.deepEqual(values, Object.values(entries));
    assert.ok(single.calls.every((call) => typeof call === "string"), "every call carried a string key");
    assert.ok(single.peakInFlight() <= KV_SINGLE_READ_CONCURRENCY, `peak in flight ${single.peakInFlight()}`);
  });

  it("falls back to single reads when a binding's bulk read answers with something other than a Map, and remembers", async () => {
    const attempts: unknown[] = [];
    const kv: KvNamespace & { getWithMetadata(): Promise<unknown> } = {
      async get(key: string | string[]) {
        attempts.push(key);
        return Array.isArray(key) ? null : `value:${key}`;
      },
      async getWithMetadata() {
        return { value: null, metadata: null };
      },
      async put() {},
      async list() {
        return { keys: [], list_complete: true as const };
      },
    };

    assert.deepEqual(await readKvValues(kv, ["a", "b"]), ["value:a", "value:b"]);
    assert.deepEqual(await readKvValues(kv, ["c"]), ["value:c"]);

    const arrayAttempts = attempts.filter((attempt) => Array.isArray(attempt));
    assert.equal(arrayAttempts.length, 1, "the array form is tried once per binding, then remembered as unsupported");
  });

  it("returns an empty list for no keys without touching the binding", async () => {
    const { kv, bulkCalls, singleCalls } = createBulkKv({});
    assert.deepEqual(await readKvValues(kv, []), []);
    assert.equal(bulkCalls.length + singleCalls.length, 0);
  });
});

describe("DurableEventLog over a bulk-capable namespace", () => {
  it("scans a full 1,000-entry window in a handful of operations instead of one per entry", async () => {
    const topic = "alerts";
    const entries: Record<string, string> = {};
    for (let index = 0; index < 1_000; index++) {
      entries[`${topic}:${String(index).padStart(12, "0")}`] = JSON.stringify({ id: index });
    }
    entries[`meta:${topic}:index`] = "999";
    const { kv, bulkCalls, singleCalls } = createBulkKv(entries);

    const log = new DurableEventLog<{ id: number }>(topic, kv);
    const page = await log.list({ limit: 10 });

    assert.equal(page.items.length, 10);
    assert.equal(page.items[0]?.id, 999, "newest first");
    assert.equal(bulkCalls.length, 10, "1,000 entries read as ten bulk operations");
    // The index key is the one single read the scan needs.
    assert.deepEqual(singleCalls, [`meta:${topic}:index`]);
  });
});
