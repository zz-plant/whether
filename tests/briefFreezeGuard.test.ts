import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { FREEZE_MAX_RECORD_AGE_DAYS, assessFreezeReadiness } from "../lib/report/briefFreezeGuard";

const NOW = new Date("2026-08-29T04:00:00Z");

const ready = (overrides: Partial<Parameters<typeof assessFreezeReadiness>[0]> = {}) =>
  assessFreezeReadiness({
    degraded: false,
    isFallback: false,
    isLive: true,
    fallbackReason: null,
    recordDate: "2026-08-27",
    now: NOW,
    ...overrides,
  });

describe("freeze readiness", () => {
  it("allows a live, current reading through", () => {
    assert.deepEqual(ready(), { ok: true });
  });

  it("refuses the outage that the old guard let through", () => {
    // Observed 2026-08-29: every FRED fetch 403s, the loader falls back to the
    // bundled snapshot, report assembly succeeds, so `degraded` is false. The
    // old guard checked only `degraded` and froze week 2026-w25 from a
    // 2026-06-17 record date, then exited 0.
    const result = ready({
      degraded: false,
      isFallback: true,
      isLive: false,
      fallbackReason: "FRED Treasury fetch error: 403",
      recordDate: "2026-06-17",
    });

    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : "", /fallback snapshot/i);
  });

  it("names the fallback reason so a failed run explains itself", () => {
    const result = ready({ isFallback: true, fallbackReason: "FRED Treasury fetch error: 403" });
    assert.match(result.ok === false ? result.reason : "", /403/);
  });

  it("refuses a stale record date even when nothing is flagged as fallback", () => {
    // Belt and braces: if a provider ever returns stale data without setting a
    // fallback flag, the derived week would still be the wrong week.
    const result = ready({ recordDate: "2026-06-17", isFallback: false, isLive: true });
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.reason : "", /not the week being published/);
  });

  it("allows a record date right at the staleness limit", () => {
    const atLimit = new Date(NOW.getTime() - FREEZE_MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000);
    assert.equal(ready({ recordDate: atLimit.toISOString().slice(0, 10) }).ok, true);
  });

  it("still refuses when report assembly failed outright", () => {
    assert.equal(ready({ degraded: true }).ok, false);
  });

  it("refuses an unreadable or future record date rather than guessing a week", () => {
    assert.equal(ready({ recordDate: "not-a-date" }).ok, false);
    assert.equal(ready({ recordDate: "2026-12-01" }).ok, false);
  });

  it("tolerates a record date a few hours ahead of the clock", () => {
    // Timezone skew between the data provider and the runner is not a fault.
    assert.equal(ready({ recordDate: "2026-08-29" }).ok, true);
  });
});

describe("staleness boundary", () => {
  it("measures age in whole UTC days, not fractions of one", () => {
    // Record dates are date-only, so an hour-of-day on the clock must not make a
    // ten-day-old reading read as eleven.
    for (const hour of ["T00:00:00Z", "T12:00:00Z", "T23:59:59Z"]) {
      const now = new Date(`2026-08-29${hour}`);
      assert.equal(
        assessFreezeReadiness({
          degraded: false,
          isFallback: false,
          isLive: true,
          recordDate: "2026-08-19",
          now,
        }).ok,
        true,
        `rejected at ${hour}`,
      );
    }
  });

  it("rejects the day past the limit at any hour", () => {
    for (const hour of ["T00:00:00Z", "T23:59:59Z"]) {
      assert.equal(
        assessFreezeReadiness({
          degraded: false,
          isFallback: false,
          isLive: true,
          recordDate: "2026-08-18",
          now: new Date(`2026-08-29${hour}`),
        }).ok,
        false,
        `accepted at ${hour}`,
      );
    }
  });
});
