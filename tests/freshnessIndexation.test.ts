import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isCallStaleForIndexing, isStaleForIndexing, shouldNoindexPayload, INDEXATION_FRESHNESS_WINDOW_HOURS } from "../lib/seo/freshnessIndexation";
import { CALL_FRESHNESS_WINDOW_HOURS, DEFAULT_FRESHNESS_WINDOW_HOURS } from "../lib/report/seoQualityGates";

const now = new Date("2026-09-15T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

describe("freshness indexation", () => {
  it("uses the same window as the payload freshness gate", () => {
    assert.equal(INDEXATION_FRESHNESS_WINDOW_HOURS, DEFAULT_FRESHNESS_WINDOW_HOURS);
  });

  it("keeps a reading a few hours past its refresh indexed, and withholds one past the window", () => {
    assert.equal(isStaleForIndexing({ fetchedAtIso: hoursAgo(5), now }), false);
    assert.equal(isStaleForIndexing({ fetchedAtIso: hoursAgo(INDEXATION_FRESHNESS_WINDOW_HOURS - 1), now }), false);
    assert.equal(isStaleForIndexing({ fetchedAtIso: hoursAgo(INDEXATION_FRESHNESS_WINDOW_HOURS + 1), now }), true);
  });

  it("withholds the bundled snapshot whatever its stamp says, and an unreadable stamp", () => {
    assert.equal(isStaleForIndexing({ fetchedAtIso: hoursAgo(1), isFallbackSnapshot: true, now }), true);
    assert.equal(isStaleForIndexing({ fetchedAtIso: "not a date", now }), true);
    assert.equal(isStaleForIndexing({ fetchedAtIso: null, now }), true);
  });

  it("judges indexing on the call's own clock, not the reading's", () => {
    /* A read that is a few days old — a missed daily ingest — is not a stale
       call, so it must not de-index the page. */
    assert.equal(isCallStaleForIndexing({ recordDateIso: hoursAgo(24 * 4), now }), false);
    assert.equal(isCallStaleForIndexing({ recordDateIso: hoursAgo(CALL_FRESHNESS_WINDOW_HOURS - 1), now }), false);
    assert.equal(isCallStaleForIndexing({ recordDateIso: hoursAgo(CALL_FRESHNESS_WINDOW_HOURS + 1), now }), true);
    assert.equal(isCallStaleForIndexing({ recordDateIso: null, now }), true);
    assert.equal(isCallStaleForIndexing({ recordDateIso: hoursAgo(1), isFallbackSnapshot: true, now }), true);
  });

  it("reads a payload's own verdict, plus freshness and provenance reasons", () => {
    assert.equal(shouldNoindexPayload(undefined), true);
    assert.equal(shouldNoindexPayload({ degraded: false, noindex: false, noindexReasons: [] }), false);
    assert.equal(shouldNoindexPayload({ degraded: true, noindex: false, noindexReasons: [] }), true);
    assert.equal(shouldNoindexPayload({ degraded: false, noindex: false, noindexReasons: ["freshness-stale"] }), true);
    assert.equal(shouldNoindexPayload({ degraded: false, noindex: false, noindexReasons: ["provenance-links-missing"] }), true);
  });
});
