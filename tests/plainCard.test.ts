import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { describeConditionFacts, describeConditionsSince } from "../lib/report/lastTimeCallChanged";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";

/*
 * The card for a reader without the macro background (2026-11-03): the two plain facts
 * the weather word stands for, each score set against the record, and since when the
 * conditions have held.
 */
const month = (index: number, regime: TimeMachineRegimeEntry["regime"], tightness: number, riskAppetite: number): TimeMachineRegimeEntry => {
  const year = 2012 + Math.floor(index / 12);
  const monthNumber = (index % 12) + 1;
  return { year, month: monthNumber, recordDate: `${year}-${String(monthNumber).padStart(2, "0")}-28`, regime, summary: "", tightness, riskAppetite };
};

/* 40 months: 36 Sunny months at funding pressure 30–65, then 4 Cloudy months at 80. */
const series: TimeMachineRegimeEntry[] = [
  ...Array.from({ length: 36 }, (_, index) => month(index, "EXPANSION", 30 + index, 40 + (index % 20))),
  ...Array.from({ length: 4 }, (_, index) => month(36 + index, "DEFENSIVE", 80, 55)),
];

describe("the card's plain facts", () => {
  it("names the two facts the weather word stands for, each against the record, the year once", () => {
    const facts = describeConditionFacts({ series, regime: "DEFENSIVE", tightness: 90, riskAppetite: 50 });
    assert.equal(
      facts,
      "Money is pricey: funding pressure 90, higher than almost every month since 2012. Investors are willing: risk appetite 50, about typical.",
    );
  });

  it("takes the sides from the conditions, not the raw scores, and says lower as well as higher", () => {
    /* Scores in another quadrant while a change waits on its second reading: the facts
       follow the weather word the card prints. */
    const facts = describeConditionFacts({ series, regime: "EXPANSION", tightness: 20, riskAppetite: 10 });
    assert.match(facts ?? "", /^Money is cheap: funding pressure 20, lower than almost every month since 2012\. Investors are willing: risk appetite 10, lower than almost every month\.$/);
    assert.equal(describeConditionFacts({ series, regime: "UNKNOWN", tightness: 50, riskAppetite: 50 }), null);
  });

  it("says nothing against a record too short to rank against", () => {
    const facts = describeConditionFacts({ series: series.slice(0, 10), regime: "EXPANSION", tightness: 40, riskAppetite: 60 });
    assert.equal(facts, "Money is cheap: funding pressure 40. Investors are willing: risk appetite 60.");
  });

  it("says since when the conditions have held, and nothing on a week they changed", () => {
    assert.equal(describeConditionsSince({ series, currentRegime: "DEFENSIVE" }), "Since Jan 2015");
    assert.equal(describeConditionsSince({ series, currentRegime: "SCARCITY" }), null, "the latest month-end is in other conditions");
    assert.equal(describeConditionsSince({ series: series.slice(0, 36), currentRegime: "EXPANSION" }), null, "no change on the record to date from");
  });
});
