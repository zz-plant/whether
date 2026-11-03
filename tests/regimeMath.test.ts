import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { evaluateRegime } from "../lib/regimeEngine";
import {
  BASE_RATE_TIGHTNESS_MULTIPLIER,
  DEFAULT_THRESHOLDS,
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
  TIGHTNESS_CAP,
  computeTightnessPressure,
  computeTightnessScore,
} from "../lib/regimeEngineCore";
import {
  resolveConfidencePercent,
  resolveDistanceToFlip,
  resolveLineGaps,
  resolveNearestLineMargin,
} from "../lib/report/confidence";
import { buildReplayChicagoFciReading } from "../lib/timeMachine/regimeReplay";
import { getHistoricalAnalogPlaybook, type AnalogPlaybookInput } from "../lib/analogPlaybook";
import type { TreasuryData } from "../lib/types";

const treasury = (yields: Partial<TreasuryData["yields"]>): TreasuryData => ({
  yields: { oneMonth: null, twoYear: null, tenYear: null, ...yields },
  record_date: "2026-09-03",
  fetched_at: "2026-09-03T00:00:00.000Z",
  source: "test",
  isLive: true,
});

/*
 * These pin the arithmetic the rest of the suite never touched. Every defect
 * below shipped green: the full suite passed before and after each fix.
 */
describe("regime scoring", () => {
  it("does not report high confidence in a call built on stand-ins", () => {
    // Both stand-ins sit far from the regime boundaries, and distance from a
    // boundary is what confidence reads — so an empty payload used to score the
    // ceiling (92%, HIGH) while emitting two data warnings.
    const blank = evaluateRegime(treasury({}));

    assert.equal(blank.dataWarnings.length, 2);
    assert.equal(blank.diagnostics.confidence, "LOW");
    assert.ok(
      resolveConfidencePercent(blank) <= 30,
      `imputed inputs must cap confidence, got ${resolveConfidencePercent(blank)}`,
    );
  });

  it("caps confidence when only one input is missing", () => {
    for (const partial of [{ oneMonth: 5.25 }, { twoYear: 4.6, tenYear: 4.2 }]) {
      const assessment = evaluateRegime(treasury(partial));
      assert.equal(assessment.diagnostics.confidence, "LOW");
      assert.ok(resolveConfidencePercent(assessment) <= 30);
    }
  });

  it("still reports real confidence when every input is present", () => {
    const complete = evaluateRegime(treasury({ oneMonth: 5.25, twoYear: 4.6, tenYear: 4.2 }));
    assert.equal(complete.dataWarnings.length, 0);
    assert.ok(resolveConfidencePercent(complete) > 30);
  });

  it("keeps a usable magnitude where the published score saturates", () => {
    // The published score is flat above roughly a 4% base rate, so its
    // week-over-week delta is zero exactly where rates are moving most.
    const cheap = evaluateRegime(treasury({ oneMonth: 4.5, twoYear: 4.5, tenYear: 4.0 }));
    const dear = evaluateRegime(treasury({ oneMonth: 5.5, twoYear: 4.5, tenYear: 4.0 }));

    assert.equal(cheap.scores.tightness, dear.scores.tightness, "score is expected to saturate");
    assert.equal(cheap.scores.tightnessSaturated, true);
    assert.ok(
      (dear.scores.tightnessPressure ?? 0) > (cheap.scores.tightnessPressure ?? 0),
      "pressure must keep moving above the ceiling",
    );
  });

  it("leaves pressure equal to the score below the ceiling", () => {
    const rate = 3.75;
    const slope = -0.5;
    const score = computeTightnessScore(rate, slope, DEFAULT_THRESHOLDS.baseRateTightness);
    assert.ok(score < TIGHTNESS_CAP);
    assert.equal(computeTightnessPressure(rate, slope, DEFAULT_THRESHOLDS.baseRateTightness), score);
  });

  it("compares the two boundary gaps on one scale", () => {
    // Tightness moves 180 points per point of base rate, risk appetite 40 per
    // point of slope. A raw min() therefore picked the risk axis almost always,
    // because its scale is compressed rather than because it was nearer.
    assert.equal(RISK_GAP_TO_TIGHTNESS_EQUIVALENT, 4.5);

    const scores = { tightness: 40, riskAppetite: 60 };
    const thresholds = DEFAULT_THRESHOLDS;
    // Raw gaps: tightness 30, risk 10. Scaled, the risk gap is 45, so the
    // tightness axis is the nearer one.
    assert.equal(resolveDistanceToFlip({ scores, thresholds }), 30);
  });

  it("counts the pressure a pinned score hides before the published number can fall", () => {
    // The week of Oct 19, 2026: a 4.11% bill on a positive curve, so funding
    // pressure published 90 with a rate component of 110 behind its 90-point
    // ceiling, no speed term, risk appetite 55. The published gap is 20, but the
    // rate sheds 20 hidden points before the score moves, so the line it is
    // nearest is risk appetite's, 5 points (22.5 scaled) away.
    const thresholds = DEFAULT_THRESHOLDS;
    const pinned = {
      tightness: 90,
      tightnessPressure: 110,
      tightnessSaturated: true,
      curveSlope: 0.38,
      baseRateVelocityPoints: 0,
      riskAppetite: 55,
    };
    assert.deepEqual(resolveNearestLineMargin({ scores: pinned, thresholds }), { signal: "riskAppetite", points: 5 });
    assert.equal(resolveDistanceToFlip({ scores: { ...pinned, riskAppetite: 80 }, thresholds }), 40);
    // A Chicago Fed add-on of 5 publishes 95 on the same pressure, which leaves
    // the add-on out. The rate still sheds 20 before the score moves:
    // `pressure - score` counted 15.
    assert.equal(resolveDistanceToFlip({ scores: { ...pinned, tightness: 95, riskAppetite: 80 }, thresholds }), 45);
    // Unpinned, the same published scores keep the published gap.
    assert.deepEqual(
      resolveNearestLineMargin({ scores: { tightness: 90, riskAppetite: 55 }, thresholds }),
      { signal: "tightness", points: 20 },
    );
  });

  it("leaves out the inversion past its cap, which a falling rate does not shed", () => {
    const thresholds = DEFAULT_THRESHOLDS;
    // Nov 30, 2022: a 4.07% bill (103 rate points), a 0.70-point inversion
    // (35, capped at 25), the full 60-point speed term. The rate sheds 13 points
    // to its own ceiling and 75 more before the sum falls under 100, then 30 to
    // the line: 118. `pressure - score` counted the inversion's 10 too.
    const november2022 = {
      tightness: 100,
      tightnessPressure: 198,
      tightnessSaturated: true,
      curveSlope: -0.7,
      baseRateVelocityPoints: 60,
      riskAppetite: 11,
    };
    assert.deepEqual(resolveNearestLineMargin({ scores: november2022, thresholds }), { signal: "tightness", points: 118 });
    // A 3.78% bill under a 0.80-point inversion publishes 75 on 90 of pressure,
    // and the rate component (50) is under its ceiling, so a falling rate moves
    // the score at once: 5 points from the line, not 20.
    const nearTheLine = { tightness: 75, tightnessPressure: 90, tightnessSaturated: false, curveSlope: -0.8, riskAppetite: 8 };
    assert.deepEqual(resolveNearestLineMargin({ scores: nearTheLine, thresholds }), { signal: "tightness", points: 5 });
  });

  it("counts the rate points the engine's score sheds before it moves", () => {
    // The count's definition, held to the scorer: lower the bill one rate point
    // at a time, the curve, the speed term and the Chicago Fed index held, and
    // count the points shed before the published score moves.
    const day = "2026-09-03";
    const assess = (oneMonth: number, curveSlope: number, rise: number | null, chicagoFci: number | null) =>
      evaluateRegime(
        treasury({ oneMonth, twoYear: 4, tenYear: 4 + curveSlope }),
        undefined,
        chicagoFci === null
          ? []
          : [buildReplayChicagoFciReading({ value: chicagoFci, recordDate: day, fetchedAt: `${day}T00:00:00.000Z`, history: [] })],
        null,
        { baseRateHistory: rise === null ? [] : [{ date: "2026-06-04", value: 3 }, { date: day, value: 3 + rise }] },
      );
    const ratePoint = 1 / BASE_RATE_TIGHTNESS_MULTIPLIER;
    const line = DEFAULT_THRESHOLDS.tightnessRegime;
    const cases = { exact: 0, inversionPastCap: 0, addOnBelowCap: 0, addOnClipped: 0 };
    for (const bill of [3.95, 4.02, 4.11, 4.4]) {
      for (const slope of [0.38, 0, -0.3, -0.7]) {
        for (const rise of [null, 0.6, 1.2]) {
          for (const chicagoFci of [null, 0.4]) {
            const reading = assess(bill, slope, rise, chicagoFci);
            const { tightness } = reading.scores;
            if (tightness <= line) continue;
            let shed = 0;
            while (shed < 400 && assess(bill - (shed + 1) * ratePoint, slope, rise, chicagoFci).scores.tightness === tightness) {
              shed += 1;
            }
            const counted = resolveLineGaps(reading).tightness - (tightness - line);
            const label = `bill ${bill}, slope ${slope}, rise ${rise}, index ${chicagoFci}: published ${tightness}`;
            // An index of 0.4 adds 4 points to the published score.
            const addOn = chicagoFci !== null;
            if (addOn && tightness === TIGHTNESS_CAP) {
              // The add-on's points past the clip are on no score: the count can
              // fall short by up to the add-on (4 here), never over.
              assert.ok(counted <= shed && counted >= shed - 4, `${label}: counted ${counted}, shed ${shed}`);
              if (counted < shed) cases.addOnClipped += 1;
              continue;
            }
            assert.equal(counted, shed, label);
            cases.exact += 1;
            if (slope <= -0.6) cases.inversionPastCap += 1;
            if (addOn) cases.addOnBelowCap += 1;
          }
        }
      }
    }
    // The grid reaches every case the count distinguishes.
    for (const [name, count] of Object.entries(cases)) assert.ok(count > 0, `no ${name} case in the grid`);
  });
});

describe("historical analog match", () => {
  const assessment = (
    baseRate: number,
    curveSlope: number,
    tightness: number,
    riskAppetite: number,
  ): AnalogPlaybookInput => ({ scores: { baseRate, curveSlope, tightness, riskAppetite } });

  it("scores an exact coordinate match at 100", () => {
    // Q3 2007's own coordinates.
    assert.equal(getHistoricalAnalogPlaybook(assessment(5.25, -0.25, 70, 40)).matchScore, 100);
  });

  it("lets a poor match score low", () => {
    // The score was floored at 65, so the worst possible match still reported 65%
    // similarity to anything reading it through the API.
    const remote = getHistoricalAnalogPlaybook(assessment(15, 5, 100, 100));
    assert.ok(remote.matchScore < 65, `expected a low score, got ${remote.matchScore}`);
    assert.ok(remote.matchScore > 0);
  });
});
