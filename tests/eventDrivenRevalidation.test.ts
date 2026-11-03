import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";
import { REPORT_DATA_CACHE_TAG } from "../lib/report/cacheTags";

/**
 * Event-driven revalidation is the primary freshness mechanism: an ingest that
 * lands invalidates the report tag, and the page timers are only a fallback.
 *
 * The 15-minute timers were the old way — 96 renders a day for data that changes
 * once — and they are the failure mode this pins against: a page that looks
 * fresh because it re-rendered, not because the data moved. A source-level
 * assertion, the same shape `tests/homeDecisionPicker.test.tsx` uses for an
 * architectural contract that a unit test cannot see through the network.
 */

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("event-driven revalidation", () => {
  it("invalidates the report tag wherever canonical inputs are written", () => {
    for (const path of [
      "lib/ingestion/executeIngest.ts",
      "lib/ingestion/materialized.ts",
      "lib/operatingState/refreshOperatingState.ts",
    ]) {
      assert.match(
        read(path),
        /revalidateReportDataCaches\(\)/,
        `${path} must invalidate the report tag when it writes inputs`,
      );
    }
  });

  it("keeps the tag name in one place", () => {
    assert.equal(REPORT_DATA_CACHE_TAG, "report-data");
  });

  it("treats the page timer as a fallback, not the freshness mechanism", () => {
    for (const path of [
      "app/answers/[slug]/page.tsx",
      "app/signals/[cluster]/[decision-scenario]/page.tsx",
    ]) {
      const source = read(path);
      assert.match(source, /revalidate = 3600/, `${path} should not re-render every 15 minutes`);
      assert.match(source, /revalidateTag|tag invalidation|invalidates on ingest/i, `${path} should say the tag is primary`);
    }
  });
});
