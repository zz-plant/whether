import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { classifyIngestModelFreshness } from "../lib/ingestion/cadence";

describe("classifyIngestModelFreshness", () => {
  // Production on 2026-10-13: the cron ingested at 02:01 UTC and the hourly alarm added nothing.
  const asOf = "2026-10-13T02:01:46.905Z";

  it("is ok while the hourly alarm has runs in hand", () => {
    assert.equal(classifyIngestModelFreshness(asOf, new Date("2026-10-13T05:00:00.000Z")), "ok");
  });

  it("is stale once the alarm has missed three refreshes", () => {
    assert.equal(classifyIngestModelFreshness(asOf, new Date("2026-10-13T08:30:00.000Z")), "stale");
    assert.equal(classifyIngestModelFreshness(asOf, new Date("2026-10-13T20:16:47.989Z")), "stale");
  });

  it("says unknown, not stale, when there is no model to judge", () => {
    assert.equal(classifyIngestModelFreshness(null, new Date()), "unknown");
    assert.equal(classifyIngestModelFreshness("not a date", new Date()), "unknown");
  });
});
