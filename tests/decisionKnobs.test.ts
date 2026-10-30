import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildWeeklyLockCommitment, deriveDecisionKnobs } from "../lib/report/decisionKnobs";

describe("deriveDecisionKnobs", () => {
  it("uses committed state labels and rationale", () => {
    const knobs = deriveDecisionKnobs({
      committedState: "EXPANSION",
      transition: {
        pending: false,
        committed: false,
        candidateState: "EXPANSION",
        transitionReason: "No threshold crossing changed the committed state.",
      },
      nearestThresholdGap: 4,
      weakSignalCount: 2,
      tightnessScore: 15,
      riskAppetiteScore: 85,
    });

    const approvalVelocity = knobs.find((item) => item.key === "approvalVelocity");
    const experimentTolerance = knobs.find((item) => item.key === "experimentTolerance");

    assert.ok(approvalVelocity);
    assert.ok(experimentTolerance);
    assert.equal(approvalVelocity.levelLabels[3], "3 · Fast");
    assert.equal(experimentTolerance.levelLabels[3], "3 · High");
    assert.equal(typeof approvalVelocity.rationale, "string");
    assert.notEqual(approvalVelocity.rationale.length, 0);
  });

  it("applies conservative pending bias before transition commitment", () => {
    const knobs = deriveDecisionKnobs({
      committedState: "EXPANSION",
      transition: {
        pending: true,
        committed: false,
        candidateState: "VOLATILE",
        transitionReason: "Risk appetite crossed below 50.",
      },
      nearestThresholdGap: 3,
      weakSignalCount: 1,
      tightnessScore: 60,
      riskAppetiteScore: 55,
    });

    const approvalVelocity = knobs.find((item) => item.key === "approvalVelocity");
    const reversibility = knobs.find((item) => item.key === "reversibility");

    // With continuous playbook: tightness=60/riskAppetite=55 pulls toward moderate knob values.
    // EXPANSION base (3) blended with continuous interpolation, then pending bias (-1) applied.
    assert.equal(approvalVelocity?.value, 1);
    assert.equal(approvalVelocity?.delta, -1);
    // Reversibility: EXPANSION base is 1, continuous raises it, pending bias (+1) adds conservatism
    assert.ok(typeof reversibility?.value === "number", "reversibility should have a numeric value");
    assert.equal(reversibility?.delta, 1);
  });
});

describe("buildWeeklyLockCommitment", () => {
  it("returns the edges of the reading's quadrant and owner cadence", () => {
    const commitment = buildWeeklyLockCommitment({
      regime: "DEFENSIVE",
      tightnessRegime: 70,
      riskAppetiteRegime: 45,
      confidenceDegraded: false,
      freshnessDegraded: false,
    });

    /* Cloudy sits above the funding-pressure line and above the risk-appetite
       line: it changes by falling to either. */
    assert.deepEqual(commitment.flipConditions, ["Funding pressure at or below 70", "Risk appetite at or below 45"]);
    assert.deepEqual(
      commitment.flipLines.map((lines) => lines.map(({ metric, operator, value }) => ({ metric, operator, value }))),
      [[{ metric: "tightness", operator: "<=", value: 70 }], [{ metric: "riskAppetite", operator: "<=", value: 45 }]],
    );
    assert.match(commitment.ownerCadence, /next weekly review/);
    assert.equal(commitment.trustMarkers.length, 0);
  });

  it("adds compact trust markers and tighter cadence when trust is degraded", () => {
    const commitment = buildWeeklyLockCommitment({
      regime: "VOLATILE",
      tightnessRegime: 62,
      riskAppetiteRegime: 52,
      confidenceDegraded: true,
      freshnessDegraded: true,
    });

    assert.deepEqual(commitment.trustMarkers, ["Room before a change: close to the line", "Freshness: Stale"]);
    assert.deepEqual(commitment.flipConditions, ["Funding pressure above 62", "Risk appetite above 52"]);
    assert.match(commitment.ownerCadence, /daily until live data/);
  });
});

describe("buildWeeklyLockCommitment across the four conditions", () => {
  const exits = (regime: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION") =>
    buildWeeklyLockCommitment({ regime, tightnessRegime: 70, riskAppetiteRegime: 50, confidenceDegraded: false, freshnessDegraded: false })
      .flipConditions;

  it("names the lines each quadrant leaves by, never a pause or restart line", () => {
    assert.deepEqual(exits("SCARCITY"), ["Funding pressure at or below 70", "Risk appetite above 50"]);
    assert.deepEqual(exits("DEFENSIVE"), ["Funding pressure at or below 70", "Risk appetite at or below 50"]);
    assert.deepEqual(exits("VOLATILE"), ["Funding pressure above 70", "Risk appetite above 50"]);
    assert.deepEqual(exits("EXPANSION"), ["Funding pressure above 70", "Risk appetite at or below 50"]);
    for (const regime of ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"] as const) {
      assert.ok(exits(regime).every((line) => !/tighten again|two readings|66|54|76|44/.test(line)), regime);
    }
  });
});
