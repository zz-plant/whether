/**
 * Validation fallback tests to prevent import-time exceptions when cached data drifts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSnapshotData } from "../lib/snapshot";
import { parseTimeMachineCache } from "../lib/timeMachineCache";
import { parseSummaryArchive } from "../lib/summaryArchive";

const withConsoleErrorSpy = async (run: (calls: unknown[][]) => void | Promise<void>) => {
  const originalError = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    await run(calls);
  } finally {
    console.error = originalError;
  }
};

describe("validation fallbacks", () => {
  it("builds a safe snapshot when validation fails", async () => {
    await withConsoleErrorSpy((calls) => {
      const snapshot = parseSnapshotData({ invalid: true });

      assert.equal(snapshot.isLive, false);
      assert.equal(snapshot.fallback_reason, "Snapshot fallback data failed validation.");
      assert.equal(snapshot.yields.oneMonth, null);
      assert.equal(snapshot.yields.twoYear, null);
      assert.equal(snapshot.yields.tenYear, null);
      assert.ok(calls.length > 0);
    });
  });

  it("returns a fallback cache entry instead of throwing", async () => {
    await withConsoleErrorSpy((calls) => {
      const cache = parseTimeMachineCache({ invalid: true });

      assert.equal(cache.length, 1);
      assert.equal(cache[0]?.isLive, false);
      assert.ok(cache[0]?.year);
      assert.ok(cache[0]?.month);
      assert.ok(calls.length > 0);
    });
  });

  it("returns an empty archive when validation fails", async () => {
    await withConsoleErrorSpy((calls) => {
      const archive = parseSummaryArchive({ invalid: true });

      assert.deepEqual(archive, []);
      assert.ok(calls.length > 0);
    });
  });
});
