import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import rawArchive from "../data/summary_archive.json";
import { getMonthlyRegimeHistory } from "../lib/summary/monthlyRegimeHistory";
import { getWeeklyPostureHistory } from "../lib/summary/weeklyPostureHistory";

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
});
