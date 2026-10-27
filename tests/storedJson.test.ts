import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { z } from "zod";
import { getJson, parseStoredJson, type KvNamespace } from "../lib/runtime/kv";

const pointSchema = z.object({ x: z.number() });

const memoryKv = (entries: Record<string, string> = {}): KvNamespace & { entries: Map<string, string> } => {
  const map = new Map(Object.entries(entries));
  return {
    entries: map,
    get: async (key) => map.get(key) ?? null,
    put: async (key, value) => {
      map.set(key, value);
    },
    list: async () => ({ keys: [], list_complete: true }),
  };
};

describe("parseStoredJson", () => {
  it("reads a value through a schema", () => {
    assert.deepEqual(parseStoredJson('{"x":1}', pointSchema), { x: 1 });
  });

  it("reads absent, unparseable and refused values alike, as no record", () => {
    assert.equal(parseStoredJson(null, pointSchema), null);
    assert.equal(parseStoredJson("", pointSchema), null);
    assert.equal(parseStoredJson("{not json", pointSchema), null);
    assert.equal(parseStoredJson('{"x":"one"}', pointSchema), null);
  });

  it("takes a hand-written parser, and a parser that throws refuses the record", () => {
    const parser = (value: unknown) => (typeof value === "number" ? value : null);
    assert.equal(parseStoredJson("7", parser), 7);
    assert.equal(parseStoredJson('"seven"', parser), null);
    assert.equal(
      parseStoredJson("7", () => {
        throw new Error("boom");
      }),
      null,
    );
  });
});

describe("getJson", () => {
  it("reads one key", async () => {
    assert.deepEqual(await getJson(memoryKv({ p: '{"x":2}' }), "p", pointSchema), { x: 2 });
    assert.equal(await getJson(memoryKv(), "p", pointSchema), null);
  });

  it("lets a failing read reject, because an outage is not a missing record", async () => {
    const failing: Pick<KvNamespace, "get"> = {
      get: async () => {
        throw new Error("kv down");
      },
    };
    await assert.rejects(getJson(failing, "p", pointSchema), /kv down/);
  });
});
