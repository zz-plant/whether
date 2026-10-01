import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { formatMonthAfter } from "../lib/timeMachine/monthFormatting";

// Dates are built from local fields, because the month is the reader's: these hold in any time zone.
describe("formatMonthAfter: calendar months on the reader's calendar", () => {
  const oct1 = new Date(2026, 9, 1, 12);

  it("adds whole months as calendar months", () => {
    // 30.44-day months put Oct 1 plus one in October, and months 1-3 at Oct-Dec.
    assert.equal(formatMonthAfter(oct1, 0), "Oct 2026");
    assert.deepEqual([1, 2, 3].map((months) => formatMonthAfter(oct1, months)), ["Nov 2026", "Dec 2026", "Jan 2027"]);
    assert.equal(formatMonthAfter(oct1, 14), "Dec 2027");
  });

  it("holds a late day at the end of a short month instead of spilling into the next", () => {
    assert.equal(formatMonthAfter(new Date(2026, 0, 30, 12), 1), "Feb 2026");
    assert.equal(formatMonthAfter(new Date(2026, 0, 31, 23, 30), 1), "Feb 2026");
    assert.equal(formatMonthAfter(new Date(2026, 7, 31, 12), 6), "Feb 2027");
  });

  it("counts a fraction as that share of the month after, by days", () => {
    assert.equal(formatMonthAfter(oct1, 0.3), "Oct 2026");
    assert.equal(formatMonthAfter(oct1, 1.5), "Nov 2026");
    assert.equal(formatMonthAfter(oct1, 2.9), "Dec 2026");
    assert.equal(formatMonthAfter(new Date(2026, 9, 20, 12), 0.5), "Nov 2026");
  });

  it("reads the month from the local calendar, not UTC", () => {
    const lateEvening = new Date(2026, 8, 30, 23, 30);
    assert.equal(formatMonthAfter(lateEvening, 0), "Sep 2026");
  });
});
