import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  calibrationForDistance,
  confidenceCalibration,
  confidenceCalibrationTotals,
} from "../lib/report/confidenceCalibration";
import { resolveConfidencePercentFromDistance } from "../lib/report/confidence";

/*
 * The published confidence percent is `55 + distance-to-boundary`, capped at 92,
 * and nothing had ever checked it against whether calls at a given distance held.
 * These assert the properties of that check rather than its current values: the
 * monthly refresh regenerates `data/summary_archive.json`, so a test pinned to
 * 169-of-175 would fail every month for the wrong reason. What must stay true is
 * the shape of the finding, and the arithmetic underneath it.
 */
describe("confidence calibration", () => {
  const buckets = confidenceCalibration();
  const populated = buckets.filter((bucket) => bucket.months > 0);

  it("covers the distance range in ascending, touching bands", () => {
    assert.ok(buckets.length >= 3);
    assert.equal(buckets[0].from, 0);
    assert.equal(buckets.at(-1)?.to, null, "the top band is open");

    for (let index = 0; index + 1 < buckets.length; index += 1) {
      assert.equal(buckets[index].to, buckets[index + 1].from, "no gap between bands");
    }
  });

  it("counts every held month inside its own band, and the totals add up", () => {
    const totals = confidenceCalibrationTotals();
    assert.equal(totals.months, buckets.reduce((sum, bucket) => sum + bucket.months, 0));
    assert.equal(totals.held, buckets.reduce((sum, bucket) => sum + bucket.held, 0));
    assert.ok(totals.months > 100, `only ${totals.months} month-ends compared`);
    for (const bucket of buckets) assert.ok(bucket.held <= bucket.months, "held cannot exceed months");
  });

  it("puts a reading in the band that contains its distance", () => {
    for (const bucket of populated) {
      const inside = calibrationForDistance(bucket.from);
      assert.equal(inside?.from, bucket.from, `distance ${bucket.from} landed outside its own band`);
      if (bucket.to !== null) {
        assert.notEqual(calibrationForDistance(bucket.to)?.from, bucket.from, "the upper bound is exclusive");
      }
    }
  });

  /*
   * The first of the two findings. Every populated band held more often than the
   * percent those months reported — the number is not a probability that runs
   * low, it is a distance wearing a probability's clothes. If a later archive
   * ever breaks this, the sentence published on /trust is the thing to revisit.
   */
  it("shows the percent understating the outcome in every band", () => {
    for (const bucket of populated) {
      const observed = (bucket.held / bucket.months) * 100;
      const claimed = resolveConfidencePercentFromDistance(bucket.from, false);
      assert.ok(
        observed > claimed,
        `band ${bucket.from}: reported ${claimed}% but held ${observed.toFixed(1)}% of ${bucket.months}`,
      );
    }
  });

  /*
   * The second, and the one that matters more. Distance is the entire signal the
   * percent carries, so if it ordered the outcome the hold rate would rise with
   * it. Across the least-confident bands it does not. This asserts the archive
   * still shows a band that outperforms a more-confident one, because that is
   * the claim; the day it stops being true, distance has started earning its
   * name and the copy should say so.
   */
  it("shows distance failing to order the outcome", () => {
    const rates = populated.map((bucket) => bucket.held / bucket.months);
    const monotone = rates.every((rate, index) => index === 0 || rate >= rates[index - 1]);
    assert.ok(!monotone, "hold rate now rises with distance; the /trust copy needs revisiting");
  });
});
