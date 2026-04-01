import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { createHomePageReportDataLoader } from "../lib/report/homePageData";
import type { LoadReportDataSafeResult } from "../lib/report/reportData";

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

const createFakeRevalidatingUnstableCache = () => {
  const cache = new Map<string, unknown>();
  const staleKeys = new Set<string>();

  const unstableCache = ((loader: (cacheKey: string) => Promise<unknown>) => {
    return async (cacheKey: string) => {
      if (!cache.has(cacheKey)) {
        const result = await loader(cacheKey);
        cache.set(cacheKey, result);
        return result;
      }

      if (!staleKeys.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      staleKeys.delete(cacheKey);

      try {
        const refreshedResult = await loader(cacheKey);
        cache.set(cacheKey, refreshedResult);
        return refreshedResult;
      } catch {
        return cache.get(cacheKey);
      }
    };
  }) as typeof import("next/cache").unstable_cache;

  return {
    unstableCache,
    markStale(cacheKey: string) {
      staleKeys.add(cacheKey);
    },
  };
};

describe("createHomePageReportDataLoader", () => {
  it("retries fallback results instead of caching degraded payloads", async () => {
    type FallbackReportResult = Extract<LoadReportDataSafeResult, { ok: false }>;
    type LiveReportResult = Extract<LoadReportDataSafeResult, { ok: true }>;
    const transientError = new Error("transient treasury timeout");
    const fallbackResult = {
      ok: false,
      error: transientError,
      fallback: { marker: "fallback" },
    } as unknown as FallbackReportResult;
    const liveResult = {
      ok: true,
      data: { marker: "live" },
    } as unknown as LiveReportResult;

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

  it("surfaces fallback mode when stale cached live data fails revalidation", async () => {
    type FallbackReportResult = Extract<LoadReportDataSafeResult, { ok: false }>;
    type LiveReportResult = Extract<LoadReportDataSafeResult, { ok: true }>;
    const transientError = new Error("macro feed unavailable");
    const liveResult = {
      ok: true,
      data: { marker: "live" },
    } as unknown as LiveReportResult;
    const fallbackResult = {
      ok: false,
      error: transientError,
      fallback: { marker: "fallback" },
    } as unknown as FallbackReportResult;
    const fakeCache = createFakeRevalidatingUnstableCache();

    let callCount = 0;
    const loader = createHomePageReportDataLoader({
      unstableCache: fakeCache.unstableCache,
      loadReportDataSafe: async () => {
        callCount += 1;

        if (callCount === 1) {
          return liveResult;
        }

        if (callCount === 2) {
          return fallbackResult;
        }

        return liveResult;
      },
    });

    const searchParams = { month: "3", year: "2026" };
    const cacheKey = JSON.stringify({ month: "3", year: "2026" });

    const firstResult = await loader(searchParams);
    assert.equal(firstResult.ok, true);
    assert.equal(callCount, 1);

    fakeCache.markStale(cacheKey);
    const secondResult = await loader(searchParams);
    assert.equal(secondResult.ok, false);
    if (!secondResult.ok) {
      assert.equal(secondResult.error, transientError);
      assert.deepEqual(secondResult.fallback, fallbackResult.fallback);
    }
    assert.equal(callCount, 2);

    const thirdResult = await loader(searchParams);
    assert.equal(thirdResult.ok, false);
    if (!thirdResult.ok) {
      assert.deepEqual(thirdResult.fallback, fallbackResult.fallback);
    }
    assert.equal(callCount, 2);

    fakeCache.markStale(cacheKey);
    const fourthResult = await loader(searchParams);
    assert.equal(fourthResult.ok, true);
    assert.equal(callCount, 3);
  });
});
