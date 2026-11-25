import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { DEFAULT_THRESHOLDS, ENGINE_VERSION, evaluateRegime } from "../lib/regimeEngine";
import { buildScoreComposition } from "../lib/report/scoreComposition";
import { resolveScoringBasis } from "../lib/report/scoringBasis";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

/*
 * `/trust` draws each published score as the points its inputs gave it, beside
 * the sentence that states the same sum. Both read `buildScoreComposition`, so
 * these run the real engine and hold what the drawing depends on: the counted
 * parts add up to the published score exactly, they are laid end to end on the
 * 0–100 scale, the inputs left out come from the scoring basis (the object the
 * "Not counted" line prints), and a reading the stages cannot rebuild yields
 * nothing rather than parts that disagree with the score beside them.
 */
const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org/series/DGS1MO",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 3.7, twoYear: 4.0, tenYear: 4.2 },
  oneMonthHistory: [
    { date: "2026-06-25", value: 3.1 },
    { date: "2026-09-25", value: 3.7 },
  ],
};

const macro = (id: MacroSeriesReading["id"], value: number): MacroSeriesReading => ({
  id,
  label: id,
  value,
  unit: "index",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: `https://fred.stlouisfed.org/series/${id}`,
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-09-25",
  fetched_at: "2026-09-26T00:00:00Z",
  isLive: true,
});

const compose = (macroSeries: MacroSeriesReading[], reading: TreasuryData = treasury) => {
  const assessment = evaluateRegime(reading, DEFAULT_THRESHOLDS, macroSeries, null, {
    baseRateHistory: reading.oneMonthHistory,
  });
  const scoringBasis = resolveScoringBasis({ engineVersion: ENGINE_VERSION, assessment });
  return {
    assessment,
    composition: buildScoreComposition({
      assessment,
      treasury: reading,
      macroSeries,
      treasurySource: { label: "Federal Reserve Economic Data (FRED)", url: reading.source },
      scoringBasis,
      evaluate: evaluateRegime,
    }),
  };
};

const sum = (parts: ReadonlyArray<{ points: number }>) => parts.reduce((total, part) => total + part.points, 0);

describe("buildScoreComposition", () => {
  it("splits each published score into parts that add up to it exactly, in the engine's order", () => {
    const { assessment, composition } = compose([macro("CHICAGO_FCI", 0.35), macro("VIX_INDEX", 28)]);
    assert.ok(composition);
    assert.equal(sum(composition.tightness.parts), assessment.scores.tightness);
    assert.equal(sum(composition.riskAppetite.parts), assessment.scores.riskAppetite);
    assert.deepEqual(
      composition.tightness.parts.map((part) => part.source),
      ["rateLevel", "inversion", "rateSpeed", "financialConditions"],
    );
    assert.deepEqual(composition.riskAppetite.parts.map((part) => part.source), ["curve", "marketStress"]);
    /* 0.2 points over the 3.5% line at 180 a point; the 0.6-point rise in a quarter clears 0.4 by 0.2 at 120. */
    assert.equal(composition.tightness.parts[0]?.points, 36);
    assert.equal(composition.tightness.parts[2]?.points, 24);
    assert.ok((composition.tightness.parts[3]?.points ?? 0) > 0, "the Chicago Fed index above zero adds");
    assert.ok((composition.riskAppetite.parts[1]?.points ?? 0) < 0, "the VIX above 20 subtracts");
  });

  it("lays the parts end to end on the 0–100 scale, a subtraction running back down", () => {
    const { composition } = compose([macro("VIX_INDEX", 28)]);
    assert.ok(composition);
    const [curve, volatility] = composition.riskAppetite.parts;
    assert.ok(curve && volatility);
    assert.deepEqual([curve.from, curve.to], [0, curve.points]);
    assert.equal(volatility.to, curve.to, "a subtraction starts where the total before it ends");
    assert.equal(volatility.from, composition.riskAppetite.published, "and ends at the published score");
  });

  it("states the sum as one copyable sentence and names the biggest input", () => {
    const { composition } = compose([macro("VIX_INDEX", 28)]);
    assert.ok(composition);
    assert.match(
      composition.tightness.sentence,
      /^Funding pressure 60 = 36 from the short-term borrowing rate \+ 0 from the recession warning gauge below zero \+ 24 from the recent pace of rate rises \+ 0 from financial-conditions stress\.$/,
    );
    assert.match(composition.riskAppetite.sentence, /^Risk appetite \d+ = \d+ from the recession warning gauge − \d+ from stock-market volatility\.$/);
    assert.equal(composition.tightness.largest, "rateLevel");
    assert.equal(composition.riskAppetite.largest, "curve");
  });

  it("draws the inputs left out from the scoring basis, apart from the sum", () => {
    const { assessment, composition } = compose([
      macro("VIX_INDEX", 28),
      macro("VC_FUNDING_VELOCITY", -15),
      macro("TECH_LAYOFF_TREND", 80),
    ]);
    assert.ok(composition);
    const offRecord = assessment.scores.offRecord;
    assert.ok(offRecord, "the startup-market reads move the score with every input counted");
    const left = composition.riskAppetite.notCounted;
    assert.ok(left);
    assert.equal(left.counted, false);
    assert.equal(left.points, offRecord.riskAppetite - assessment.scores.riskAppetite);
    assert.deepEqual([left.from, left.to], [offRecord.riskAppetite, assessment.scores.riskAppetite]);
    assert.equal(composition.riskAppetite.notCountedSentence, `Not counted: startup-market inputs, which would take it down ${Math.abs(left.points)} points.`);
    assert.equal(sum(composition.riskAppetite.parts), assessment.scores.riskAppetite, "the left-out inputs are no part of the sum");
    assert.equal(composition.tightness.notCounted, null);
    assert.deepEqual(
      left.sources.map((source) => source.url),
      ["https://fred.stlouisfed.org/series/VC_FUNDING_VELOCITY", "https://fred.stlouisfed.org/series/TECH_LAYOFF_TREND"],
    );
  });

  it("gives the clipped term only the points below 100, and says so", () => {
    const { assessment, composition } = compose([], {
      ...treasury,
      yields: { oneMonth: 4.6, twoYear: 4.8, tenYear: 4.3 },
      oneMonthHistory: undefined,
    });
    assert.ok(composition);
    assert.equal(assessment.scores.tightness, 100);
    const [level, inversion] = composition.tightness.parts;
    assert.equal(level?.points, 90);
    assert.equal(inversion?.points, 10, "25 inversion points on top of 90 stop at the ceiling");
    assert.match(inversion?.weight ?? "", /stops at 100/);
    assert.equal(sum(composition.tightness.parts), 100);
  });

  it("returns nothing when the stages cannot rebuild the published scores", () => {
    const { assessment } = compose([]);
    const composition = buildScoreComposition({
      assessment: { ...assessment, scores: { ...assessment.scores, tightness: assessment.scores.tightness + 7 } },
      treasury,
      macroSeries: [],
      treasurySource: { label: "FRED", url: treasury.source },
      evaluate: evaluateRegime,
    });
    assert.equal(composition, null);
  });
});
