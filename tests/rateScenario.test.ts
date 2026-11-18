import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import {
  describeFedSteps,
  describeRateDialAnswer,
  describeWholeFedSteps,
  formatShortRate,
  parseRateParam,
} from "../lib/report/fedSteps";
import { buildRateDial, buildRateMoves, fundingPressureRateLookup, type RateDialStop } from "../lib/report/rateScenario";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import type { TreasuryData } from "../lib/types";

/*
 * The reading at another short rate, everything else held: the brief's conditions chart
 * plots it after each Fed step, labels funding pressure's lines with the rate each comes
 * with, and /trust redraws funding pressure's composition across a range. These run the
 * real engine, so a number here is the engine's and not a copy of its formula.
 */
const reading = (oneMonth: number, curve = { twoYear: 4.0, tenYear: 4.2 }): TreasuryData => ({
  source: "https://fred.stlouisfed.org/series/DGS1MO",
  record_date: "2026-11-13",
  fetched_at: "2026-11-14T00:00:00Z",
  isLive: true,
  yields: { oneMonth, ...curve },
  /* Flat over the quarter: the tightening-speed term reads 0, as it does this week. */
  oneMonthHistory: [
    { date: "2026-08-13", value: oneMonth },
    { date: "2026-11-13", value: oneMonth },
  ],
});

const inputsAt = (treasury: TreasuryData) => {
  const assessment = evaluateRegime(treasury, DEFAULT_THRESHOLDS, [], null, { baseRateHistory: treasury.oneMonthHistory });
  return { assessment, treasury, macroSeries: [], evaluate: evaluateRegime };
};

const scoredAt = (treasury: TreasuryData, rate: number) =>
  evaluateRegime(
    { ...treasury, yields: { ...treasury.yields, oneMonth: rate } },
    DEFAULT_THRESHOLDS,
    [],
    null,
    { baseRateHistory: treasury.oneMonthHistory },
  ).scores;

const compositionOf = (inputs: ReturnType<typeof inputsAt>) =>
  buildScoreComposition({
    ...inputs,
    treasurySource: { label: "FRED", url: inputs.treasury.source },
    scoringBasis: resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment: inputs.assessment }),
  });

describe("buildRateMoves", () => {
  it("re-scores the reading after each Fed step through the engine, the rate moved one-for-one", () => {
    const week = reading(4.1);
    const inputs = inputsAt(week);
    assert.equal(inputs.assessment.scores.tightness, 90, "the rate part is at its top");
    const moves = buildRateMoves(inputs);
    /* A hike past the top moves nothing, so it is left out. */
    assert.deepEqual(moves.map((move) => move.key), ["cut-1", "cut-2", "cut-3"]);
    for (const [index, move] of moves.entries()) {
      const scores = scoredAt(week, 4.1 - (index + 1) * 0.25);
      assert.deepEqual({ tightness: move.tightness, riskAppetite: move.riskAppetite }, { tightness: scores.tightness, riskAppetite: scores.riskAppetite });
    }
    assert.deepEqual(moves.map((move) => move.tightness), [63, 18, 0]);
    assert.deepEqual(moves.map((move) => move.label), ["After one Fed cut", "After two", "After three"]);
    assert.equal(moves[1]?.name, "After two quarter-point Fed cuts");
    assert.equal(
      moves[1]?.how,
      "Two quarter-point Fed cuts would take the 1-month rate to 3.60% and funding pressure to 18, with everything else as this week.",
    );
  });

  it("leaves out a cut that draws the same picture as the one before it, and keeps a hike that moves the score", () => {
    const moves = buildRateMoves(inputsAt(reading(3.68)));
    assert.deepEqual(moves.map((move) => move.key), ["cut-1", "hike-1"]);
    assert.equal(moves[0]?.tightness, 0);
    assert.equal(moves[1]?.tightness, 77);
    assert.equal(moves[1]?.label, "After one Fed hike");
    assert.match(moves[1]?.how ?? "", /^One quarter-point Fed hike would take the 1-month rate to 3\.93% and funding pressure to 77, with everything else as this week\.$/);
  });

  it("moves nothing it cannot rebuild, and has no rate to move without one", () => {
    const inputs = inputsAt(reading(4.1));
    const stale = { ...inputs, assessment: { ...inputs.assessment, scores: { ...inputs.assessment.scores, tightness: 88 } } };
    assert.deepEqual(buildRateMoves(stale), []);
    const missing = inputsAt({ ...reading(4.1), yields: { oneMonth: null, twoYear: 4.0, tenYear: 4.2 } });
    assert.equal(missing.assessment.scores.baseRateUsed, "MISSING");
    assert.deepEqual(buildRateMoves(missing), []);
  });
});

describe("fundingPressureRateLookup", () => {
  it("gives the lowest hundredth at which the engine's rate ramp reaches each value, where the rate makes the whole score", () => {
    const inputs = inputsAt(reading(3.68));
    const lookup = fundingPressureRateLookup({ composition: compositionOf(inputs), assessment: inputs.assessment });
    assert.ok(lookup);
    assert.equal(lookup.name, "1-month rate");
    assert.deepEqual([66, 70, 76].map(lookup.at), [3.87, 3.89, 3.92]);
    for (const value of [1, 33, 66, 70, 76, 89]) {
      const rate = lookup.at(value);
      assert.ok(rate !== null);
      assert.ok(scoredAt(inputs.treasury, rate).tightness >= value, `${value} at ${rate}`);
      assert.ok(scoredAt(inputs.treasury, Math.round((rate - 0.01) * 100) / 100).tightness < value, `${value} below ${rate}`);
    }
    /* No one rate gives the top of the ramp or nothing at all. */
    assert.equal(lookup.at(90), null);
    assert.equal(lookup.at(0), null);
  });

  it("says nothing when another input adds to funding pressure, or when there is no composition", () => {
    /* The 10-year 0.3 below the 2-year: the curve's inversion adds 15 points. */
    const inverted = inputsAt(reading(3.68, { twoYear: 4.3, tenYear: 4.0 }));
    assert.ok((compositionOf(inverted)?.tightness.parts.find((part) => part.source === "inversion")?.points ?? 0) > 0);
    assert.equal(fundingPressureRateLookup({ composition: compositionOf(inverted), assessment: inverted.assessment }), undefined);
    const plain = inputsAt(reading(3.68));
    assert.equal(fundingPressureRateLookup({ composition: null, assessment: plain.assessment }), undefined);
  });
});

describe("buildRateDial", () => {
  const week = reading(4.1);
  const inputs = inputsAt(week);
  const scores = { tightness: inputs.assessment.scores.tightness, riskAppetite: inputs.assessment.scores.riskAppetite };
  const rules = buildCanonicalBoundedDecisionRules({ regime: inputs.assessment.regime, thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 }, scores });
  const dial = buildRateDial({ ...inputs, rules, changeLines: { tightness: 70, riskAppetite: 50 }, regime: inputs.assessment.regime });

  it("covers 3.00% to 4.50% in hundredths, end to end, with this week's rate inside", () => {
    assert.ok(dial);
    assert.deepEqual({ min: dial.min, max: dial.max, rate: dial.rate, rateName: dial.rateName }, { min: 3, max: 4.5, rate: 4.1, rateName: "the 1-month rate" });
    assert.equal(dial.readingLabel, "1-month Treasury bill");
    assert.equal(dial.stops[0]?.from, 3);
    assert.equal(dial.stops.at(-1)?.to, 4.5);
    for (const [index, stop] of dial.stops.entries()) {
      if (index > 0) assert.equal(Math.round((stop.from - (dial.stops[index - 1]?.to ?? 0)) * 100), 1, "no gap, no overlap");
      assert.equal(stop.parts.reduce((sum, part) => sum + part.points, 0), stop.tightness, "the parts add up");
    }
  });

  it("is the engine's score at every stop, and this week's at this week's rate", () => {
    assert.ok(dial);
    for (const rate of [3, 3.5, 3.61, 3.86, 3.89, 3.92, 4, 4.1, 4.5]) {
      const stop: RateDialStop | undefined = dial.stops.find((candidate) => rate >= candidate.from && rate <= candidate.to);
      assert.equal(stop?.tightness, scoredAt(week, rate).tightness, String(rate));
    }
    const thisWeek = dial.stops.find((candidate) => 4.1 >= candidate.from && 4.1 <= candidate.to);
    assert.equal(thisWeek?.tightness, 90);
    assert.equal(thisWeek?.lead, "No area would pause or restart.");
  });

  it("says first which areas would restart, judged against this week's rules", () => {
    assert.ok(dial);
    /* 3.86% is funding pressure 65, under Spending's 66: it restarts, and the scores land in Cloudy. */
    const stop = dial.stops.find((candidate) => 3.86 >= candidate.from && 3.86 <= candidate.to);
    assert.equal(stop?.tightness, 65);
    assert.match(stop?.lead ?? "", /^(Spending|.*Spending.*) would restart\./);
  });

  it("widens to keep this week's rate a quarter point inside", () => {
    const high = buildRateDial({ ...inputsAt(reading(5.3)), rules, changeLines: { tightness: 70, riskAppetite: 50 } });
    assert.deepEqual({ min: high?.min, max: high?.max }, { min: 3, max: 5.75 });
  });
});

describe("the Fed's step as a size", () => {
  it("words a move in steps, about, under or over, with counts in words", () => {
    assert.deepEqual(describeFedSteps(-0.5), { phrase: "about two quarter-point Fed cuts", plural: true });
    assert.deepEqual(describeFedSteps(0.1), { phrase: "less than one quarter-point Fed hike", plural: false });
    assert.deepEqual(describeFedSteps(-0.4), { phrase: "more than one quarter-point Fed cut", plural: false });
    assert.equal(describeWholeFedSteps(-3), "three quarter-point Fed cuts");
    assert.equal(describeWholeFedSteps(1), "one quarter-point Fed hike");
  });

  it("answers the rate control first with what would move, then the rate in steps from this week", () => {
    assert.equal(
      describeRateDialAnswer({ rate: 3.86, thisWeek: 4.1, rateName: "the 1-month rate", tightness: 65, lead: "Spending would restart." }),
      "Spending would restart. At 3.86%, about one quarter-point Fed cut below this week, funding pressure would be 65, with everything else as this week.",
    );
    assert.equal(
      describeRateDialAnswer({ rate: 4.1, thisWeek: 4.1, rateName: "the 1-month rate", tightness: 90, lead: "No area would pause or restart." }),
      "That's this week: the 1-month rate is 4.10% and funding pressure is 90.",
    );
    assert.doesNotMatch(
      describeRateDialAnswer({ rate: 3.6, thisWeek: 4.1, rateName: "the 1-month rate", tightness: 18, lead: "Spending would restart." }),
      /likely|chance|probab|odds|expected/i,
    );
  });

  it("reads a rate from the URL to the hundredth, and nothing else", () => {
    assert.equal(parseRateParam("3.85"), 3.85);
    assert.equal(parseRateParam("4"), 4);
    assert.equal(parseRateParam("3.855"), undefined);
    assert.equal(parseRateParam("-1"), undefined);
    assert.equal(parseRateParam(undefined), undefined);
    assert.equal(formatShortRate(3.6), "3.60%");
  });
});
