import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  PERCENTILE_WINDOW_MONTHS,
  isRampSaturated,
  isTightReading,
  readRamp,
  replayRamp,
  trailingMonthEndWindow,
  type RampInputs,
} from "../lib/research/candidateRamps";
import { buildTimeMachineReplaySteps, getTimeMachineRegimeSeries } from "../lib/timeMachine/timeMachineCache";

/*
 * The registered candidate ramps (docs/research/premise-test-preregistration.md
 * §7) as arithmetic, and the one property that makes a candidate's record
 * comparable with the published one: with the current ramp, the parallel scorer
 * is the engine, month for month.
 */

const inputs = (oneMonth: number | null, extra: Partial<RampInputs> = {}): RampInputs => ({
  oneMonth,
  threeMonth: null,
  trailingMonthEnds: [],
  ...extra,
});

/** A window of the 120 values 0.01%, 0.02%, … 1.20%. */
const ladderWindow = Array.from({ length: PERCENTILE_WINDOW_MONTHS }, (_, index) => (index + 1) / 100);

describe("the current ramp (C0)", () => {
  it("spends 0 to 90 points across 3.5% to 4.0%", () => {
    assert.equal(readRamp("current", inputs(3.4)).ratePoints, 0);
    assert.equal(readRamp("current", inputs(3.5)).ratePoints, 0);
    assert.equal(readRamp("current", inputs(3.79)).ratePoints, 52);
    assert.equal(readRamp("current", inputs(4.0)).ratePoints, 90);
    assert.equal(readRamp("current", inputs(5.3)).ratePoints, 90);
  });
});

describe("C1, the wide ramp", () => {
  it("spends 0 to 90 points across 2.0% to 5.5%", () => {
    assert.equal(readRamp("wide", inputs(1.0)).ratePoints, 0);
    assert.equal(readRamp("wide", inputs(2.0)).ratePoints, 0);
    assert.equal(readRamp("wide", inputs(3.75)).ratePoints, 45);
    assert.equal(readRamp("wide", inputs(4.02)).ratePoints, 52);
    assert.equal(readRamp("wide", inputs(5.5)).ratePoints, 90);
    assert.equal(readRamp("wide", inputs(6.0)).ratePoints, 90);
  });
});

describe("C2, the trailing ten-year percentile", () => {
  it("scores the mid-rank percentile against the 120 prior month-ends", () => {
    // 89 below and 1 equal: p = 89.5 / 120, points = (p − 0.5) × 180 = 44.25.
    assert.equal(readRamp("trailing-percentile", inputs(0.9, { trailingMonthEnds: ladderWindow })).ratePoints, 44);
    assert.equal(readRamp("trailing-percentile", inputs(1.21, { trailingMonthEnds: ladderWindow })).ratePoints, 90);
    assert.equal(readRamp("trailing-percentile", inputs(0.6, { trailingMonthEnds: ladderWindow })).ratePoints, 0);
  });

  it("refuses a short window instead of ranking against fewer years", () => {
    const reading = readRamp("trailing-percentile", inputs(0.9, { trailingMonthEnds: ladderWindow.slice(1) }));
    assert.deepEqual(reading, { input: 0.9, ratePoints: null, flag: "window-short" });
  });
});

describe("C3, the current ramp behind the bill median", () => {
  it("reads the mean of the one- and three-month bills on the current ramp", () => {
    // (3.70 + 3.85) / 2 = 3.775; (3.775 − 3.5) × 180 = 49.5, an exact tie that rounds up.
    assert.deepEqual(readRamp("bill-median", inputs(3.7, { threeMonth: 3.85 })), { input: 3.775, ratePoints: 50, flag: null });
    assert.equal(readRamp("bill-median", inputs(3.4, { threeMonth: 5.12 })).ratePoints, 90);
  });

  it("falls back to the one-month bill, flagged, when the three-month bill is missing", () => {
    assert.deepEqual(readRamp("bill-median", inputs(3.79)), { input: 3.79, ratePoints: 52, flag: "unguarded" });
  });
});

describe("every ramp", () => {
  it("cannot read a missing one-month bill", () => {
    for (const ramp of ["current", "wide", "trailing-percentile", "bill-median"] as const) {
      assert.deepEqual(readRamp(ramp, inputs(null)), { input: null, ratePoints: null, flag: "no-input" });
    }
  });
});

describe("saturation (§8.1)", () => {
  it("is a ceiling a 25bp rise cannot move, in the upper half of the range", () => {
    assert.equal(isRampSaturated("current", inputs(4.0)), true);
    assert.equal(isRampSaturated("current", inputs(3.9)), false);
    assert.equal(isRampSaturated("current", inputs(3.0)), false, "the floor is not the ceiling");
    assert.equal(isRampSaturated("wide", inputs(5.5)), true);
    assert.equal(isRampSaturated("wide", inputs(5.2)), false);
    assert.equal(isRampSaturated("trailing-percentile", inputs(1.3, { trailingMonthEnds: ladderWindow })), true);
    assert.equal(isRampSaturated("trailing-percentile", inputs(1.0, { trailingMonthEnds: ladderWindow })), false);
  });
});

describe("the percentile window", () => {
  it("holds the 120 month-ends before the reading's month, oldest first, and stops at a gap", () => {
    const monthEnds = new Map<string, number>();
    for (let year = 2010; year <= 2020; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        monthEnds.set(`${year}-${String(month).padStart(2, "0")}`, year + month / 100);
      }
    }
    const window = trailingMonthEndWindow("2020-06", monthEnds);
    assert.equal(window.length, PERCENTILE_WINDOW_MONTHS);
    assert.equal(window[0], 2010 + 6 / 100);
    assert.equal(window.at(-1), 2020 + 5 / 100);

    monthEnds.delete("2015-03");
    assert.equal(trailingMonthEndWindow("2020-06", monthEnds).length, 62);
  });
});

describe("the tight reading (§3)", () => {
  it("is funding pressure above 70, or Freezing or Stormy", () => {
    assert.equal(isTightReading(71, "EXPANSION"), true);
    assert.equal(isTightReading(70, "EXPANSION"), false);
    assert.equal(isTightReading(10, "VOLATILE"), true);
    assert.equal(isTightReading(10, "SCARCITY"), true);
    assert.equal(isTightReading(60, "DEFENSIVE"), false);
    assert.equal(isTightReading(null, "SCARCITY"), null);
  });
});

describe("the parallel scorer with the current ramp", () => {
  it("reproduces the published month-end record exactly", () => {
    const steps = buildTimeMachineReplaySteps();
    const replay = replayRamp(
      "current",
      steps.map((step) => ({ ...step, trailingMonthEnds: [] })),
    );
    const published = getTimeMachineRegimeSeries(steps.length);
    assert.equal(published.length, replay.length);
    published.forEach((entry, index) => {
      const score = replay[index];
      assert.deepEqual(
        { date: entry.recordDate, conditions: score.conditions, fundingPressure: score.fundingPressure, riskAppetite: score.riskAppetite },
        { date: entry.recordDate, conditions: entry.regime, fundingPressure: entry.tightness, riskAppetite: entry.riskAppetite },
      );
    });
  });
});
