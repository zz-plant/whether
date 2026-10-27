import { describe, it } from "bun:test";
import assert from "node:assert/strict";

import { evaluateRegime } from "../lib/regimeEngine";
import {
  DEFAULT_THRESHOLDS,
  RISK_GAP_TO_TIGHTNESS_EQUIVALENT,
  TIGHTNESS_CAP,
  computeTightnessPressure,
  computeTightnessScore,
} from "../lib/regimeEngineCore";
import { resolveConfidencePercent, resolveDistanceToFlip, resolveNearestLineMargin } from "../lib/report/confidence";
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
    // The week of Oct 19, 2026: funding pressure published 90 with 110 of
    // pressure behind the component ceiling, risk appetite 55. The published gap is 20,
    // but the score sheds 20 hidden points before it moves, so the line it is
    // nearest is risk appetite's, 5 points (22.5 scaled) away.
    const thresholds = DEFAULT_THRESHOLDS;
    const pinned = { tightness: 90, tightnessPressure: 110, tightnessSaturated: true, riskAppetite: 55 };
    assert.deepEqual(resolveNearestLineMargin({ scores: pinned, thresholds }), { signal: "riskAppetite", points: 5 });
    assert.equal(resolveDistanceToFlip({ scores: { ...pinned, riskAppetite: 80 }, thresholds }), 40);
    // Unpinned, the same published scores keep the published gap.
    assert.deepEqual(
      resolveNearestLineMargin({ scores: { tightness: 90, riskAppetite: 55 }, thresholds }),
      { signal: "tightness", points: 20 },
    );
  });

  it("counts pressure hidden by a component cap before the global saturation flag turns on", () => {
    const scores = { tightness: 90, tightnessPressure: 95, tightnessSaturated: false, riskAppetite: 80 };
    assert.equal(resolveDistanceToFlip({ scores, thresholds: DEFAULT_THRESHOLDS }), 25);
    assert.deepEqual(resolveNearestLineMargin({ scores, thresholds: DEFAULT_THRESHOLDS }), { signal: "tightness", points: 25 });
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
