import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import rawArchive from "../data/summary_archive.json";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { getWeeklyPostureHistory } from "../lib/summary/weeklyPostureHistory";
import { getTimeMachineSnapshots } from "../lib/timeMachine/timeMachineCache";

const byAsOfAscending = (left: { asOf: string }, right: { asOf: string }) =>
  new Date(left.asOf).getTime() - new Date(right.asOf).getTime();

const byRecordDateAscending = (left: { record_date: string }, right: { record_date: string }) =>
  new Date(left.record_date).getTime() - new Date(right.record_date).getTime();

describe("derived summary history artifacts", () => {
  it("keeps the homepage weekly posture history artifact aligned to the latest four weekly archive records", () => {
    const expected = rawArchive
      .filter((entry) => entry.cadence === "weekly")
      .sort(byAsOfAscending)
      .slice(-4)
      .map((entry) => ({
        record_date: entry.record_date,
        regime: entry.summary.regime,
      }))
      .sort(byRecordDateAscending);

    assert.deepEqual(getWeeklyPostureHistory(), expected);
  });

  it("keeps monthly forecast history aligned to the canonical summary archive regimes", () => {
    const expected = rawArchive
      .filter((entry) => entry.cadence === "monthly")
      .sort(byAsOfAscending)
      .map((entry) => ({
        record_date: entry.record_date,
        regime: entry.summary.regime,
        tightness: entry.tightness,
        riskAppetite: entry.riskAppetite,
      }))
      .sort(byRecordDateAscending);

    assert.deepEqual(getMonthlyRegimeHistory(), expected);
  });

  it("keeps the time machine cache aligned to the latest monthly archive month", () => {
    const latestMonthly = rawArchive
      .filter((entry) => entry.cadence === "monthly")
      .sort(byAsOfAscending)
      .at(-1);
    const latestSnapshot = getTimeMachineSnapshots().at(-1);

    assert.ok(latestMonthly);
    assert.ok(latestSnapshot);
    assert.equal(latestSnapshot?.year, latestMonthly?.year);
    assert.equal(latestSnapshot?.month, latestMonthly?.month);
    assert.equal(latestSnapshot?.record_date, latestMonthly?.record_date);
  });

  /*
   * Every other assertion in this file checks these artifacts against each other, which
   * is why the month rail froze for a month without one of them going red: the four data
   * files were uniformly stale, so they still agreed. `data/time_machine_cache.json` held
   * nothing past 2026-07-31 from 2026-08-10 to 2026-09-09, and the only symptom was an
   * August that never appeared in the picker.
   *
   * The bundled series is the floor for the month rail (the KV copy the cron writes only
   * ever records the month *in progress*, and skips a degraded read entirely, so it cannot
   * backfill a completed month). That makes wall-clock staleness a data defect this suite
   * has to be able to see.
   *
   * The grace window exists because the refresh runs weekly, on Mondays. The latest a
   * month's first Monday can fall is day 7 (month ends, next day is a Tuesday), so
   * enforcing past day 8 always gives the routine one scheduled attempt and never fires
   * before it has had one. Set to 10 first, which would not have caught the outage that
   * motivated this test — July-only data on 2026-09-09 still passed.
   */
  it("does not let the monthly archive fall behind the last completed month", () => {
    const now = new Date();
    const GRACE_DAY_OF_MONTH = 8;

    const latestMonthly = rawArchive
      .filter((entry) => entry.cadence === "monthly")
      .sort(byAsOfAscending)
      .at(-1);
    assert.ok(latestMonthly, "expected at least one monthly archive record");

    // The month before the current one, in UTC — the newest month that can be complete.
    const lastCompleted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const monthIndex = (year: number, month: number) => year * 12 + month;
    // From `record_date`, which is always present, rather than the archive's optional
    // `year`/`month` fields — this reads the same value without a non-null assertion.
    const newestDate = new Date(`${latestMonthly.record_date}T00:00:00Z`);
    assert.ok(!Number.isNaN(newestDate.valueOf()), `unparseable record_date: ${latestMonthly.record_date}`);
    const newestHave = monthIndex(newestDate.getUTCFullYear(), newestDate.getUTCMonth() + 1);
    const newestWant = monthIndex(lastCompleted.getUTCFullYear(), lastCompleted.getUTCMonth() + 1);
    const monthsBehind = newestWant - newestHave;

    if (monthsBehind > 0 && now.getUTCDate() > GRACE_DAY_OF_MONTH) {
      assert.fail(
        `The monthly archive is ${monthsBehind} month(s) behind: newest record is ` +
          `${latestMonthly.record_date}, but ${lastCompleted.toISOString().slice(0, 7)} has completed. ` +
          "The weekly regime-history routine has not delivered. Regenerate with " +
          "`bun scripts/generateMonthlySummaries.ts && bun scripts/generateQuarterlyYearlySummaries.ts`; " +
          "if that fails on a FRED 403 (`connect_rejected`), the routine's egress allowlist is the " +
          "real problem — see CLAUDE.md, \"Scheduled automation\".",
      );
    }
  });

  it("keeps quarterly and yearly archive coverage aligned to the latest completed periods", () => {
    const latestMonthly = rawArchive
      .filter((entry) => entry.cadence === "monthly")
      .sort(byAsOfAscending)
      .at(-1);
    const latestQuarterly = rawArchive
      .filter((entry) => entry.cadence === "quarterly")
      .sort(byAsOfAscending)
      .at(-1);
    const latestYearly = rawArchive
      .filter((entry) => entry.cadence === "yearly")
      .sort(byAsOfAscending)
      .at(-1);

    assert.ok(latestMonthly);
    assert.ok(latestQuarterly);
    assert.ok(latestYearly);

    const completedQuarter = Math.floor((latestMonthly?.month ?? 0) / 3);
    const expectedQuarterYear = completedQuarter === 0
      ? (latestMonthly?.year ?? 0) - 1
      : (latestMonthly?.year ?? 0);
    const expectedQuarter = completedQuarter === 0 ? 4 : completedQuarter;
    const expectedYear = (latestMonthly?.month ?? 0) === 12
      ? (latestMonthly?.year ?? 0)
      : (latestMonthly?.year ?? 0) - 1;

    assert.equal(latestQuarterly?.year, expectedQuarterYear);
    assert.equal(latestQuarterly?.quarter, expectedQuarter);
    assert.equal(latestYearly?.year, expectedYear);
  });
});
