import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DurableEventLog } from "../lib/storage/eventLog";

type Entry = { id: number; tag: string };

const createKv = (topic: string, count: number) => {
  const store = new Map<string, string>();
  const gets: string[] = [];
  let listCalls = 0;

  for (let index = 0; index < count; index++) {
    store.set(
      `${topic}:${String(index).padStart(12, "0")}`,
      JSON.stringify({ id: index, tag: index % 2 === 0 ? "even" : "odd" } satisfies Entry),
    );
  }
  store.set(`meta:${topic}:index`, String(count - 1));

  return {
    gets,
    listCalls: () => listCalls,
    store,
    kv: {
      async get(key: string) {
        gets.push(key);
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async list(options?: { prefix?: string; cursor?: string; limit?: number }) {
        listCalls++;
        const keys = [...store.keys()]
          .filter((key) => key.startsWith(options?.prefix ?? ""))
          .sort()
          .map((name) => ({ name }));
        return { keys, list_complete: true as const };
      },
    },
  };
};

const entryGets = (gets: string[], topic: string) =>
  gets.filter((key) => key.startsWith(`${topic}:`));

describe("DurableEventLog.list", () => {
  it("does not read the whole log to satisfy a small limit", async () => {
    const { kv, gets } = createKv("alerts", 5_000);
    const log = new DurableEventLog<Entry>("alerts", kv);

    await log.list({ limit: 10 });

    // Regression guard: the previous implementation fetched every key in the topic and
    // only then sliced to the limit.
    assert.equal(entryGets(gets, "alerts").length <= 1_000, true);
  });

  it("returns the newest entries when no cursor is supplied", async () => {
    const { kv } = createKv("alerts", 5_000);
    const log = new DurableEventLog<Entry>("alerts", kv);

    const { items } = await log.list({ limit: 3 });

    // Newest-first, and actually recent rather than the oldest three ever written.
    assert.deepEqual(items.map((item) => item.id), [4_999, 4_998, 4_997]);
  });

  it("pages forward from a cursor", async () => {
    const { kv } = createKv("alerts", 500);
    const log = new DurableEventLog<Entry>("alerts", kv);

    const { items, nextCursor } = await log.list({ cursor: "10", limit: 3 });

    assert.deepEqual(items.map((item) => item.id), [13, 12, 11]);
    assert.equal(nextCursor, "13");
  });

  it("applies filters within the scanned window", async () => {
    const { kv } = createKv("alerts", 200);
    const log = new DurableEventLog<Entry>("alerts", kv);

    const { items } = await log.list({ limit: 4, filter: (entry) => entry.tag === "even" });

    assert.equal(items.every((item) => item.tag === "even"), true);
    assert.deepEqual(items.map((item) => item.id), [198, 196, 194, 192]);
  });

  it("reads latest without listing the namespace", async () => {
    const { kv, listCalls } = createKv("alerts", 300);
    const log = new DurableEventLog<Entry>("alerts", kv);

    const latest = await log.latest();

    assert.equal(latest?.id, 299);
    assert.equal(listCalls(), 0);
  });

  it("falls back to listing when the index key is absent", async () => {
    const { kv, listCalls, store } = createKv("alerts", 40);
    store.delete("meta:alerts:index");
    const log = new DurableEventLog<Entry>("alerts", kv);

    const { items } = await log.list({ limit: 2 });

    assert.equal(listCalls() > 0, true);
    assert.deepEqual(items.map((item) => item.id), [39, 38]);
  });

  it("keeps appends out of isolate memory when backed by KV", async () => {
    const { kv } = createKv("alerts", 1);
    const log = new DurableEventLog<Entry>("alerts", kv);

    await log.append({ id: 999, tag: "even" });

    const inMemory = (log as unknown as { inMemoryEntries: unknown[] }).inMemoryEntries;
    assert.equal(inMemory.length, 0);
  });

  it("still works fully in memory when no binding is present", async () => {
    const log = new DurableEventLog<Entry>("alerts", null);

    await log.append({ id: 1, tag: "odd" });
    await log.append({ id: 2, tag: "even" });

    const { items } = await log.list({ limit: 1 });
    assert.deepEqual(items.map((item) => item.id), [2]);
  });
});
