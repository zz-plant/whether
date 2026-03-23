import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import type { loadReportDataSafe } from "../lib/report/reportData";

const createFakeUnstableCache = () => {
  const cache = new Map<string, unknown>();

  return ((loader: (cacheKey: string) => Promise<unknown>) => {
    return async (cacheKey: string) => {
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = await loader(cacheKey);
      cache.set(cacheKey, result);
      return result;
    };
  }) as typeof import("next/cache").unstable_cache;
};

describe("createHomePageReportDataLoader", () => {
  it("retries fallback results instead of caching degraded payloads", async () => {
    const transientError = new Error("transient treasury timeout");
    const fallbackResult = {
      ok: false,
      error: transientError,
      fallback: { marker: "fallback" },
    } as Awaited<ReturnType<typeof loadReportDataSafe>>;
    const liveResult = {
      ok: true,
      data: { marker: "live" },
    } as Awaited<ReturnType<typeof loadReportDataSafe>>;

    let callCount = 0;
    const loader = createHomePageReportDataLoader({
      unstableCache: createFakeUnstableCache(),
      loadReportDataSafe: async () => {
        callCount += 1;
        return callCount === 1 ? fallbackResult : liveResult;
      },
    });

    const firstResult = await loader({ month: "3", year: "2026" });
    assert.equal(firstResult.ok, false);
    if (!firstResult.ok) {
      assert.equal(firstResult.error, transientError);
      assert.deepEqual(firstResult.fallback, fallbackResult.fallback);
    }

    const secondResult = await loader({ year: "2026", month: " 3 " });
    assert.equal(secondResult.ok, true);
    assert.equal(callCount, 2);

    const thirdResult = await loader({ month: "3", year: "2026" });
    assert.equal(thirdResult.ok, true);
    assert.equal(callCount, 2);
  });
});
