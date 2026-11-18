import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCalibrationChoice,
  buildCalibrationChoiceHref,
  calibrationForDistance,
  calibrationGroupFor,
  confidenceCalibration,
  confidenceCalibrationTotals,
  formatCalibrationDistance,
  formatCalibrationGroup,
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

/*
 * /trust lets a reader pick a distance and see how often conditions held there, beside the
 * strip that quotes this week's distance alone. The groups are the strip's own: picked by
 * default where the strip looks, counted from the same entries, and said in its words.
 */
describe("buildCalibrationChoice", () => {
  const populated = confidenceCalibration().filter((bucket) => bucket.months > 0);

  it("offers every group with month-ends, named as /calibration's table names them", () => {
    const choice = buildCalibrationChoice({ distance: 12, requested: undefined });
    assert.deepEqual(choice.map((group) => group.from), populated.map((bucket) => bucket.from));
    assert.equal(formatCalibrationGroup({ from: 10, to: 20 }), "10 to 20");
    assert.equal(formatCalibrationDistance({ from: 10, to: 20 }), "10 to 20 points");
    assert.equal(formatCalibrationDistance({ from: 37, to: null }), "37 or more points");
    for (const group of choice) {
      assert.equal(group.entries.length, group.months, "one entry per month counted");
      assert.equal(group.entries.filter((entry) => entry.next === entry.regime).length, group.held);
      assert.match(group.sentence, new RegExp(`^[A-Z][a-z ]+: conditions held ${group.held} of ${group.months} months at ${group.label}\\.$`));
    }
  });

  /* The answer first, as a person would say it, then the count: never a chance. */
  it("answers how often in a word before the count", () => {
    for (const group of buildCalibrationChoice({ distance: 0, requested: undefined })) {
      const lead = group.sentence.split(":")[0];
      if (group.held === group.months) assert.equal(lead, "Every month");
      else if (group.held / group.months >= 0.7) assert.equal(lead, "Mostly");
      assert.doesNotMatch(group.sentence, /\b(likely|chance|odds|probability|confidence)\b/i);
    }
  });

  it("links each group to its URL, the default one without the key, keeping the rest of the query", () => {
    const [first, second] = buildCalibrationChoice({ distance: 0, requested: undefined });
    assert.ok(first && second);
    assert.equal(first.isDefault, true);
    assert.equal(
      buildCalibrationChoiceHref({ path: "/trust", params: { derivation: "1", distance: String(second.from) }, group: first, extra: { sources: "1" } }),
      "/trust?derivation=1&sources=1#distance-held",
    );
    assert.equal(
      buildCalibrationChoiceHref({ path: "/trust", params: undefined, group: second }),
      `/trust?distance=${second.from}#distance-held`,
    );
  });

  it("picks this week's group, the one the strip quotes, unless the URL names another", () => {
    const strip = calibrationForDistance(12);
    const byDefault = buildCalibrationChoice({ distance: 12, requested: undefined });
    const picked = byDefault.filter((group) => group.selected);
    assert.equal(picked.length, 1);
    assert.equal(picked[0]?.from, strip?.from);
    assert.equal(picked[0]?.thisWeek, true);
    assert.equal(calibrationGroupFor(12), strip?.from);

    const other = populated.find((bucket) => bucket.from !== strip?.from);
    assert.ok(other);
    const asked = buildCalibrationChoice({ distance: 12, requested: String(other.from) });
    assert.deepEqual(asked.filter((group) => group.selected).map((group) => group.from), [other.from]);
    assert.ok(asked.some((group) => group.thisWeek && !group.selected), "this week's group stays marked");

    for (const nonsense of ["7", "abc", ""]) {
      assert.deepEqual(
        buildCalibrationChoice({ distance: 12, requested: nonsense }).filter((group) => group.selected).map((group) => group.from),
        [strip?.from],
        nonsense,
      );
    }
    const unmeasured = buildCalibrationChoice({ distance: null, requested: undefined });
    assert.ok(unmeasured.every((group) => !group.thisWeek));
    assert.equal(unmeasured.filter((group) => group.selected).length, 1);
    assert.deepEqual(unmeasured.filter((group) => group.isDefault).map((group) => group.from), [populated[0]?.from]);
    assert.deepEqual(asked.filter((group) => group.isDefault).map((group) => group.from), [strip?.from], "the default stays this week's");
  });
});

describe("the confidence record's archive extract", () => {
  it("is exactly what the full archive yields, so `bun run archive:index` was run after the archive changed", async () => {
    const { extractCalibrationMonths } = await import("../lib/report/confidenceCalibration");
    const archive: unknown = JSON.parse(readFileSync(new URL("../data/summary_archive.json", import.meta.url), "utf8"));
    const extract: unknown = JSON.parse(readFileSync(new URL("../data/confidence_record_months.json", import.meta.url), "utf8"));
    assert.deepEqual(extract, extractCalibrationMonths(archive));
  });
});
