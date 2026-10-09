import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  DECISION_RULE,
  blockBootstrapIndices,
  evaluateDecisionRule,
  hitRates,
  meanDifference,
  p1Verdict,
  p2Verdict,
  premiseScore,
  spearman,
  type Estimate,
  type P1Outcome,
  type RampMetrics,
  type SignalQuarter,
} from "../scripts/research/premiseTestAnalysis";

/*
 * The registered statistics and decision rule
 * (docs/research/premise-test-preregistration.md §6, §9), on fixtures small
 * enough to check by hand.
 */

const current: RampMetrics = {
  ramp: "current",
  premiseScore: 0.06,
  premiseBeatsCurrentShare: 0,
  deltaValue: -0.06,
  deltaCount: -0.06,
  saturationShare: 0.2,
  changes: 7,
  dislocation: 1.2,
};

/** A candidate that clears all four conditions against `current`. */
const passing: RampMetrics = {
  ramp: "passing",
  premiseScore: 0.12,
  premiseBeatsCurrentShare: 0.9,
  deltaValue: -0.1,
  deltaCount: -0.14,
  saturationShare: 0.05,
  changes: 8,
  dislocation: 0.6,
};

describe("the decision rule (§9)", () => {
  it("chooses a candidate that clears all four conditions", () => {
    const { decisions, chosen } = evaluateDecisionRule(current, [passing]);
    assert.equal(chosen, "passing");
    assert.deepEqual(
      { premise: decisions[0].premise, saturation: decisions[0].saturation, turnover: decisions[0].turnover, dislocation: decisions[0].dislocation },
      { premise: true, saturation: true, turnover: true, dislocation: true },
    );
  });

  it("keeps the current ramp when any one condition fails", () => {
    const failures: Array<[string, Partial<RampMetrics>]> = [
      ["premise margin", { premiseScore: current.premiseScore + DECISION_RULE.premiseMargin - 0.001 }],
      ["premise share", { premiseBeatsCurrentShare: 0.79 }],
      ["a positive Δ", { deltaValue: 0.01 }],
      ["saturation", { saturationShare: 0.11 }],
      ["turnover", { changes: 11 }],
      ["dislocation", { dislocation: 0.91 }],
    ];
    for (const [label, change] of failures) {
      const { chosen } = evaluateDecisionRule(current, [{ ...passing, ...change }]);
      assert.equal(chosen, null, label);
    }
  });

  it("prefers the larger premise gain, then the fewer changes in conditions", () => {
    const stronger = { ...passing, ramp: "stronger", premiseScore: 0.2 };
    assert.equal(evaluateDecisionRule(current, [passing, stronger]).chosen, "stronger");

    const calmer = { ...passing, ramp: "calmer", changes: 6 };
    assert.equal(evaluateDecisionRule(current, [passing, calmer]).chosen, "calmer");
  });

  it("chooses nothing when no candidate passes", () => {
    assert.equal(evaluateDecisionRule(current, [{ ...current, ramp: "same" }]).chosen, null);
  });
});

const estimate = (value: number, low: number, high: number): Estimate => ({ value, low, high, discarded: 0 });
const outcome = (difference: Estimate, tight: number, base: number): P1Outcome => ({
  meanDifference: difference,
  hitRate: { tight, notTight: 0, base, difference: 0, tightCount: 1, notTightCount: 1 },
  hitRateDifference: estimate(0, 0, 0),
});

describe("the P1 verdict (§6.2)", () => {
  const meets = outcome(estimate(-0.2, -0.3, -0.05), 0.6, 0.4);
  const misses = outcome(estimate(-0.1, -0.3, 0.1), 0.6, 0.4);
  const wrongWay = outcome(estimate(0.2, 0.05, 0.3), 0.2, 0.4);

  it("needs both outcomes for support, one for partial support", () => {
    assert.equal(p1Verdict(meets, meets), "supported");
    assert.equal(p1Verdict(meets, misses), "partly supported");
    assert.equal(p1Verdict(misses, misses), "not supported");
  });

  it("does not count an interval below zero when the tight hit rate is not above the base rate", () => {
    assert.equal(p1Verdict(outcome(estimate(-0.2, -0.3, -0.05), 0.3, 0.4), meets), "partly supported");
  });

  it("reports a significant wrong-way result as contradicted", () => {
    assert.equal(p1Verdict(meets, wrongWay), "contradicted");
  });
});

describe("the P2 verdict (§6.3)", () => {
  it("is two-sided on the interval for the skill difference", () => {
    assert.equal(p2Verdict(estimate(0.3, 0.1, 0.5)), "funding pressure predicts better");
    assert.equal(p2Verdict(estimate(-0.3, -0.5, -0.1)), "risk appetite predicts better");
    assert.equal(p2Verdict(estimate(0.1, -0.2, 0.4)), "no detectable difference");
  });
});

describe("the statistics", () => {
  const rows: SignalQuarter[] = [
    { quarter: "2020Q1", tight: true, fundingPressure: 80, riskAppetite: 20, forwardValue: -0.2, forwardCount: -0.1 },
    { quarter: "2020Q2", tight: true, fundingPressure: 90, riskAppetite: 30, forwardValue: 0.1, forwardCount: -0.3 },
    { quarter: "2020Q3", tight: false, fundingPressure: 10, riskAppetite: 70, forwardValue: 0.3, forwardCount: 0.1 },
    { quarter: "2020Q4", tight: false, fundingPressure: 20, riskAppetite: 80, forwardValue: -0.1, forwardCount: 0.3 },
  ];

  it("computes the mean difference, hit rates and premise score by hand", () => {
    assert.ok(Math.abs(meanDifference(rows, "forwardValue") - (-0.05 - 0.1)) < 1e-12);
    assert.ok(Math.abs(meanDifference(rows, "forwardCount") - (-0.2 - 0.2)) < 1e-12);
    assert.deepEqual(hitRates(rows, "forwardCount"), { tight: 1, notTight: 0, base: 0.5, difference: 1, tightCount: 2, notTightCount: 2 });
    assert.ok(Math.abs(premiseScore(rows) - (0.15 + 0.4) / 2) < 1e-12);
  });

  it("is undefined for a group that is empty, not zero", () => {
    assert.ok(Number.isNaN(meanDifference(rows.filter((row) => row.tight), "forwardValue")));
  });

  it("ranks ties at their average in the Spearman correlation", () => {
    assert.ok(Math.abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12);
    assert.ok(Math.abs(spearman([1, 1, 2, 2], [1, 2, 3, 4]) - 0.894427191) < 1e-6);
  });
});

describe("the block bootstrap (§6.1)", () => {
  it("reproduces from its seed and draws wrapping blocks of consecutive quarters", () => {
    const settings = { blockLength: 4, resamples: 50, seed: 7 };
    const first = blockBootstrapIndices(10, settings);
    assert.deepEqual(first, blockBootstrapIndices(10, settings));
    for (const indices of first) {
      assert.equal(indices.length, 10);
      for (let position = 1; position < indices.length; position += 1) {
        if (position % settings.blockLength !== 0) {
          assert.equal(indices[position], (indices[position - 1] + 1) % 10);
        }
      }
    }
  });
});
