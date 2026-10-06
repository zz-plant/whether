import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { selectStoreByBinding } from "../lib/runtime/storeSelection";
import type { KvNamespace } from "../lib/runtime/kv";
import { getSubscriberStore, resetSubscriberStore } from "../lib/email/subscriberStore";
import { getOperatingSnapshotStore, resetOperatingSnapshotStore } from "../lib/operatingState/snapshotStore";

const fakeKv = (): KvNamespace => ({
  get: async () => null,
  put: async () => {},
  list: async () => ({ keys: [], list_complete: true }),
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
  resetSubscriberStore();
  resetOperatingSnapshotStore();
});

describe("selectStoreByBinding", () => {
  it("keeps one store while the binding stays the same, and rebuilds when it changes", () => {
    let binding: object | null = null;
    let builds = 0;
    const selection = selectStoreByBinding(
      () => binding,
      (current) => ({ current, build: ++builds }),
    );

    const fallback = selection.get();
    assert.equal(fallback.current, null);
    assert.equal(selection.get(), fallback, "no binding twice is the same fallback store");

    binding = { kv: true };
    const durable = selection.get();
    assert.equal(durable.current, binding, "a binding that appears after a fallback takes over");
    assert.equal(selection.get(), durable);
    assert.equal(builds, 2);
  });

  it("holds a store a test installs until the next reset", () => {
    let binding: object | null = null;
    const selection = selectStoreByBinding(() => binding, (current) => ({ current }));
    const held = selection.reset({ current: null });

    binding = { kv: true };
    assert.equal(selection.get(), held);
    assert.equal(selection.reset().current, binding, "a bare reset rebuilds from the binding");
  });
});

/* Every repository picked its backend on first use and kept it for the isolate's life, so an
   early call without the binding left the rest of the isolate writing to memory. */
describe("repositories re-check the binding", () => {
  it("moves the subscriber store to KV once the binding is installed", () => {
    Reflect.deleteProperty(globalThis, "WHETHER_DURABLE_KV");
    resetSubscriberStore();
    assert.equal(getSubscriberStore().backendStatus(), "local-fallback");

    Reflect.set(globalThis, "WHETHER_DURABLE_KV", fakeKv());
    const durable = getSubscriberStore();
    assert.equal(durable.backendStatus(), "durable");
    assert.equal(getSubscriberStore(), durable, "the same binding keeps the same store");
  });

  /* operatingSnapshotConsistency writes a snapshot into a reset store and then installs a KV
     double for the alert path; the reset must keep meaning "this in-memory store". */
  it("keeps a store a test reset to, after a binding appears", () => {
    const held = resetOperatingSnapshotStore();
    Reflect.set(globalThis, "WHETHER_DURABLE_KV", fakeKv());
    assert.equal(getOperatingSnapshotStore(), held);
  });
});
