import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeMarketMoveScale, describeRateMoveInFedSteps, describeScoreMoveBand } from "../lib/report/marketMoveScale";
import {
  getTimeMachineRegimeSeries,
  getTimeMachineYieldCurveSeries,
  type TimeMachineYieldCurveEntry,
} from "../lib/timeMachine/timeMachineCache";

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
  it("counts the record's months that moved as far, as a reader says it", () => {
    assert.equal(
      describeMarketMoveScale({ input: "baseRate", move: -0.18, baseRateUsed: "1M", series }),
      "The rate moved that far in about 1 month in 6 since 2020.",
    );
  });

  it("names the curve's instrument, says most months for a move most months make, and says never as never", () => {
    assert.equal(
      describeMarketMoveScale({ input: "curveSlope", move: 0.05, baseRateUsed: "1M", series }),
      "The recession warning gauge moved that far in most months since 2020.",
    );
    assert.equal(
      describeMarketMoveScale({ input: "curveSlope", move: 0.3, baseRateUsed: "1M", series }),
      "The recession warning gauge has not moved that far in one month since 2020.",
    );
  });

  it("leaves the federal funds rate to its Fed step, having no month-end series to count", () => {
    assert.equal(describeMarketMoveScale({ input: "baseRate", move: 0.1, baseRateUsed: "FED", series }), null);
  });

  it("does not count against a record under a year long", () => {
    assert.equal(describeMarketMoveScale({ input: "curveSlope", move: 0.05, baseRateUsed: "1M", series: series.slice(0, 6) }), null);
  });

  it("counts the bundled record from 2012", () => {
    const record = getTimeMachineYieldCurveSeries(Number.MAX_SAFE_INTEGER);
    const sentence = describeMarketMoveScale({ input: "baseRate", move: 0.18, baseRateUsed: "1M", series: record }) ?? "";
    const counted = /about 1 month in (\d+) since 2012\.$/.exec(sentence);
    assert.ok(counted, sentence);
    assert.ok(Number(counted[1]) > 2, "a 0.18 move is uncommon, not unheard of");
  });
});

describe("a short-rate move in Fed steps", () => {
  it("leads with the step, says a rise is a hike and a fall a cut, and ends on the conditions", () => {
    assert.equal(describeRateMoveInFedSteps(-0.17, "Stormy"), "Less than one quarter-point Fed cut turns conditions Stormy.");
    assert.equal(describeRateMoveInFedSteps(0.27, "Cloudy"), "About one quarter-point Fed hike turns conditions Cloudy.");
  });

  it("calls a move within three basis points of a whole step that many steps, and agrees the verb", () => {
    assert.equal(describeRateMoveInFedSteps(0.5, "Cloudy"), "About 2 quarter-point Fed hikes turn conditions Cloudy.");
    assert.equal(describeRateMoveInFedSteps(-0.4, "Sunny"), "More than one quarter-point Fed cut turns conditions Sunny.");
    assert.equal(describeRateMoveInFedSteps(-0.9, "Sunny"), "More than 3 quarter-point Fed cuts turn conditions Sunny.");
  });
});

describe("a score's distance as a move the record makes", () => {
  it("bands a distance by how often the month-end record moved the score that far in one month", () => {
    /* Risk appetite moved 2 or more in most months since 2012; 8 or more in about 1 in 5; 20 or more in under 1 in 12. */
    assert.equal(describeScoreMoveBand("riskAppetite", 2), "a common move");
    assert.equal(describeScoreMoveBand("riskAppetite", 8), "an unusual move");
    assert.equal(describeScoreMoveBand("riskAppetite", 20), "a rare move");
    assert.equal(describeScoreMoveBand("riskAppetite", 60), "a record move");
  });

  it("reads funding pressure off its own record, where most months it did not move at all", () => {
    assert.equal(describeScoreMoveBand("tightness", 2), "an unusual move");
    assert.equal(describeScoreMoveBand("tightness", 44), "a rare move");
  });

  it("names the score as the move's modifier when asked, and has nothing to say at no distance", () => {
    assert.equal(describeScoreMoveBand("riskAppetite", 2, { named: true }), "a common risk-appetite move");
    assert.equal(describeScoreMoveBand("tightness", 44, { named: true }), "a rare funding-pressure move");
    assert.equal(describeScoreMoveBand("riskAppetite", 0), null);
  });

  it("counts the same month-end scores the history pages read", () => {
    /* The extract it reads is the record `getTimeMachineRegimeSeries` replays: any
       distance bands the same against either. */
    const replay = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
    const moves = (key: "tightness" | "riskAppetite") =>
      replay.slice(1).map((entry, index) => Math.abs(entry[key] - (replay[index]?.[key] ?? entry[key])));
    const keys: Array<"tightness" | "riskAppetite"> = ["tightness", "riskAppetite"];
    for (const key of keys) {
      const record = moves(key);
      for (const points of [1, 4, 8, 14, 30]) {
        const share = record.filter((move) => move >= points).length / record.length;
        const expected = share === 0 ? "a record move" : share >= 1 / 3 ? "a common move" : share >= 1 / 12 ? "an unusual move" : "a rare move";
        assert.equal(describeScoreMoveBand(key, points), expected, `${key} ${points}`);
      }
    }
  });
});
