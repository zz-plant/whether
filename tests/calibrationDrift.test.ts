import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { calculateCalibrationDrift, type CalibrationDriftResult } from "../lib/report/calibrationDrift";
import { calibrationMonthRows } from "../lib/report/confidenceCalibration";

/*
 * `confidenceCalibration.ts` grades the whole archive; this grades the recent window of it.
 * The module's own header records why the check is a direction — still understates, or not —
 * rather than a rate delta. These pin that direction, the three states, and the current
 * verdict on the real archive. The last one matters because `confidenceRecord.tsx` publishes
 * a sentence that says the finding is current; the day the archive breaks it, that sentence
 * and this test fail together.
 */

/*
 * The regime thresholds are tightness 70 and risk appetite 50, and a risk score of 0
 * converts to a gap far wider than any tightness gap used here, so distance is
 * `|tightness - 70|` and the fixture names it.
 */
const month = (asOf: string, distance: number, regime: string) => ({
  asOf,
  tightness: 70 + distance,
  riskAppetite: 0,
  regime,
});

/** Dates are labels for the reader; ascending and unique so the fixture reads like the archive it stands in for. */
const asOf = (index: number) => {
  const year = 2020 + Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}-28`;
};

describe("calibration drift", () => {
  it("reports stable when every band with recent readings still held above its published percent", () => {
    const result: CalibrationDriftResult = calculateCalibrationDrift(
      12,
      Array.from({ length: 24 }, (_, index) => month(asOf(index), 5, "one-regime")),
    );

    assert.equal(result.status, "stable");
    assert.equal(result.bands.length, 1);
    assert.deepEqual(result.bands[0], {
      from: 5,
      to: 10,
      months: 11,
      held: 11,
      publishedPercent: 60,
      percentUnderstates: true,
    });
  });

  it("reports drifting when a band's recent readings did no better than its published percent", () => {
    /* Thirteen months: one before the window, five at distance 5 with two changes among
       them, seven at distance 25 that never change. The distance-5 band holds 3 of 5 —
       exactly its published 60%, and "at or below" is not understating. */
    const months = [
      month(asOf(0), 30, "one-regime"),
      month(asOf(1), 5, "one-regime"),
      month(asOf(2), 5, "one-regime"),
      month(asOf(3), 5, "one-regime"),
      month(asOf(4), 5, "another-regime"),
      month(asOf(5), 5, "another-regime"),
      ...Array.from({ length: 7 }, (_, index) => month(asOf(index + 6), 25, "one-regime")),
    ];

    const result = calculateCalibrationDrift(12, months);

    assert.equal(result.status, "drifting");
    assert.equal(
      result.bands.reduce((total, band) => total + band.months, 0),
      months.length - 2,
      "the window's twelve readings hold eleven comparisons, and every one lands in a band",
    );

    const near = result.bands.find((band) => band.from === 5);
    assert.deepEqual(
      near ? { months: near.months, held: near.held, percentUnderstates: near.percentUnderstates } : null,
      { months: 5, held: 3, percentUnderstates: false },
      "holding exactly the published percent is not understating it",
    );

    const far = result.bands.find((band) => band.from === 20);
    assert.ok(far);
    assert.equal(far.months, 6);
    assert.equal(far.held, 6);
    assert.equal(far.publishedPercent, 75);
    assert.equal(far.percentUnderstates, true);
  });

  it("says unmeasured rather than guessing from a window it cannot fill", () => {
    assert.deepEqual(calculateCalibrationDrift(12, []), { status: "unmeasured", bands: [] });
    assert.deepEqual(
      calculateCalibrationDrift(12, Array.from({ length: 12 }, (_, index) => month(asOf(index), 5, "one-regime"))),
      { status: "unmeasured", bands: [] },
      "twelve readings cannot fill a twelve-reading window and still compare against the month before it",
    );
    assert.deepEqual(
      calculateCalibrationDrift(1, Array.from({ length: 24 }, (_, index) => month(asOf(index), 5, "one-regime"))),
      { status: "unmeasured", bands: [] },
    );
  });

  it("still finds the percent understating across the recent year of the real archive", () => {
    const result = calculateCalibrationDrift();

    assert.equal(
      result.status,
      "stable",
      "the recent year stopped understating; the record's copy needs revisiting",
    );
    assert.ok(result.bands.length > 0, "the archive holds more than a year, so the window is full");
    assert.equal(
      result.bands.reduce((total, band) => total + band.months, 0),
      11,
      "twelve readings in the window, eleven of them with a following month to compare",
    );
    assert.ok(calibrationMonthRows().length > 12);

    /* The filtered bands keep bucket order: ascending floors, not a re-ordering. */
    for (let index = 1; index < result.bands.length; index += 1) {
      assert.ok(
        (result.bands[index - 1]?.from ?? -1) < (result.bands[index]?.from ?? -1),
        "reported bands must ascend by floor",
      );
    }
  });
});
