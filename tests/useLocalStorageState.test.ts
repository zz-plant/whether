import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { getCachedLocalStorageSnapshot } from "../lib/hooks/useLocalStorageState";

describe("getCachedLocalStorageSnapshot", () => {
  it("returns the same parsed object while stored content is unchanged", () => {
    const raw = JSON.stringify({ "2026-08-01": { reviewed: true } });
    const first = getCachedLocalStorageSnapshot("test:stored-object", raw, {});
    const second = getCachedLocalStorageSnapshot("test:stored-object", raw, {});

    assert.strictEqual(second, first);
  });

  it("keeps an object fallback stable until stored content changes", () => {
    const first = getCachedLocalStorageSnapshot("test:object-fallback", null, {});
    const second = getCachedLocalStorageSnapshot("test:object-fallback", null, {});
    const stored = getCachedLocalStorageSnapshot(
      "test:object-fallback",
      JSON.stringify({ reviewed: true }),
      {},
    );

    assert.strictEqual(second, first);
    assert.notStrictEqual(stored, first);
    assert.deepEqual(stored, { reviewed: true });
  });
});
