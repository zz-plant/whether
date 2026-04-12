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
