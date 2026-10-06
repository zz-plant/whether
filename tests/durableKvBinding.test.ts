import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { getWhetherKv, type KvNamespace } from "../lib/runtime/kv";

/*
 * WHETHER_DURABLE_KV is the only data namespace wrangler.toml declares. The
 * accessor used to fall back to per-domain names (INGESTION_KV,
 * POSTURE_EVENTS_KV, DECISION_MEMORY_KV), and the regime-alert and
 * decision-event stores read two more off globalThis (REGIME_ALERTS_KV,
 * DECISION_EVENTS_KV). None was ever bound, and every store now resolves its
 * binding here, so this pins the one name that counts.
 */
const LEGACY_NAMES = [
  "INGESTION_KV",
  "POSTURE_EVENTS_KV",
  "DECISION_MEMORY_KV",
  "DECISION_EVENTS_KV",
  "REGIME_ALERTS_KV",
];

const fakeKv = (): KvNamespace => ({
  get: async () => null,
  put: async () => {},
  list: async () => ({ keys: [], list_complete: true }),
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  for (const name of LEGACY_NAMES) Reflect.deleteProperty(globalThis, name);
});

describe("durable KV binding", () => {
  it("resolves WHETHER_DURABLE_KV", () => {
    const kv = fakeKv();
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", kv);
    assert.equal(getWhetherKv(), kv);
  });

  it("ignores the per-domain names no environment binds", () => {
    for (const name of LEGACY_NAMES) Reflect.set(globalThis, name, fakeKv());
    assert.equal(getWhetherKv(), null);
  });

  it("rejects a binding that cannot list, which the event logs need", () => {
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", { get: async () => null, put: async () => {} });
    assert.equal(getWhetherKv(), null);
  });
});
