import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildReportDataMemoizationKey,
  REPORT_DATA_CACHE_BUCKET_SECONDS,
} from "../lib/report/reportData";

describe("report data memoization", () => {
  it("uses the same cache bucket key within the revalidation window", () => {
    const baselineMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const withinWindowMs = baselineMs + (REPORT_DATA_CACHE_BUCKET_SECONDS - 1) * 1000;

    const firstKey = buildReportDataMemoizationKey(undefined, undefined, baselineMs);
    const secondKey = buildReportDataMemoizationKey(undefined, undefined, withinWindowMs);

    assert.equal(firstKey, secondKey);
  });

  it("rolls cache bucket key once the revalidation window elapses", () => {
    const baselineMs = Date.UTC(2026, 0, 1, 12, 0, 0);
    const nextWindowMs = baselineMs + REPORT_DATA_CACHE_BUCKET_SECONDS * 1000;

    const firstKey = buildReportDataMemoizationKey(undefined, undefined, baselineMs);
    const secondKey = buildReportDataMemoizationKey(undefined, undefined, nextWindowMs);

    assert.notEqual(firstKey, secondKey);
  });

  it("includes search params in the memoization key payload", () => {
    const nowMs = Date.UTC(2026, 0, 1, 12, 0, 0);

    const defaultKey = buildReportDataMemoizationKey(undefined, undefined, nowMs);
    const historicalKey = buildReportDataMemoizationKey({ month: "3", year: "2025" }, undefined, nowMs);

    assert.notEqual(defaultKey, historicalKey);
  });

  it("includes load options in the memoization key payload", () => {
    const nowMs = Date.UTC(2026, 0, 1, 12, 0, 0);

    const defaultKey = buildReportDataMemoizationKey(undefined, undefined, nowMs);
    const optimizedKey = buildReportDataMemoizationKey(
      undefined,
      { includeHistoricalLiveComparison: false },
      nowMs,
    );

    assert.notEqual(defaultKey, optimizedKey);
  });
});
