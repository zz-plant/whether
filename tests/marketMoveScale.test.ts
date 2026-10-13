import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeMarketMoveScale } from "../lib/report/marketMoveScale";
import { getTimeMachineYieldCurveSeries, type TimeMachineYieldCurveEntry } from "../lib/timeMachine/timeMachineCache";

const month = (index: number, oneMonth: number, spread: number): TimeMachineYieldCurveEntry => ({
  year: 2020 + Math.floor(index / 12),
  month: (index % 12) + 1,
  recordDate: `${2020 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-28`,
  oneMonth,
  threeMonth: oneMonth + 0.1,
  twoYear: 4,
  tenYear: 4 + spread,
  spread10Y2Y: spread,
  spread2Y3M: null,
});

/* Thirteen month-ends: the bill steps by a quarter point twice and is still otherwise; the curve drifts 0.05 a month. */
const bills = [4, 4, 4.25, 4.25, 4.25, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5];
const series = bills.map((bill, index) => month(index, bill, 0.1 + index * 0.05));

describe("the size of a market move", () => {
  it("holds a short-rate move against a Fed step and counts the record's months that moved as far", () => {
    assert.equal(
      describeMarketMoveScale({ input: "baseRate", move: -0.18, baseRateUsed: "1M", series }),
      "Less than one quarter-point Fed move. The rate moved that far in one month in 2 of the 12 months on record.",
    );
  });

  it("calls a move within three basis points of a whole step that many steps", () => {
    assert.match(describeMarketMoveScale({ input: "baseRate", move: 0.27, baseRateUsed: "1M", series }) ?? "", /^About one quarter-point Fed move\./);
    assert.match(describeMarketMoveScale({ input: "baseRate", move: 0.5, baseRateUsed: "1M", series }) ?? "", /^About 2 quarter-point Fed moves\./);
    assert.match(describeMarketMoveScale({ input: "baseRate", move: 0.4, baseRateUsed: "1M", series }) ?? "", /^More than one quarter-point Fed move\./);
  });

  it("gives the curve no Fed step, since the Fed does not set it", () => {
    assert.equal(
      describeMarketMoveScale({ input: "curveSlope", move: 0.05, baseRateUsed: "1M", series }),
      "The gauge moved that far in one month in 12 of the 12 months on record.",
    );
    assert.equal(
      describeMarketMoveScale({ input: "curveSlope", move: 0.3, baseRateUsed: "1M", series }),
      "The gauge has not moved that far in one month since the record began.",
    );
  });

  it("gives the federal funds rate the Fed step alone, having no month-end series to count", () => {
    assert.equal(describeMarketMoveScale({ input: "baseRate", move: 0.1, baseRateUsed: "FED", series }), "Less than one quarter-point Fed move.");
  });

  it("does not count against a record under a year long", () => {
    assert.equal(describeMarketMoveScale({ input: "curveSlope", move: 0.05, baseRateUsed: "1M", series: series.slice(0, 6) }), null);
  });

  it("counts the bundled record from 2012", () => {
    const record = getTimeMachineYieldCurveSeries(Number.MAX_SAFE_INTEGER);
    const sentence = describeMarketMoveScale({ input: "baseRate", move: 0.18, baseRateUsed: "1M", series: record }) ?? "";
    const counted = /in (\d+) of the (\d+) months on record/.exec(sentence);
    assert.ok(counted, sentence);
    assert.ok(Number(counted[2]) >= 170, "the record runs from 2012");
    assert.ok(Number(counted[1]) > 0 && Number(counted[1]) < Number(counted[2]) / 2, "a 0.18 move is uncommon, not unheard of");
  });
});
