import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    });

    const approvalVelocity = knobs.find((item) => item.key === "approvalVelocity");
    const reversibility = knobs.find((item) => item.key === "reversibility");

    assert.equal(approvalVelocity?.value, 2);
    assert.equal(approvalVelocity?.delta, -1);
    assert.equal(reversibility?.value, 2);
    assert.equal(reversibility?.delta, 1);
  });
});

describe("buildWeeklyLockCommitment", () => {
  it("returns measurable flip conditions and owner cadence", () => {
    const commitment = buildWeeklyLockCommitment({
      regime: "DEFENSIVE",
      tightnessRegime: 70,
      riskAppetiteRegime: 45,
      confidenceDegraded: false,
      freshnessDegraded: false,
    });

    assert.equal(commitment.currentCall, "Gate net-new commitments to short-payback work only.");
    assert.equal(commitment.flipConditions.length, 3);
    assert.match(commitment.flipConditions[0], /Tightness ≤ 66/);
    assert.match(commitment.flipConditions[1], /Risk appetite ≥ 49/);
    assert.match(commitment.ownerCadence, /Mon\/Thu operating review/);
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

    assert.deepEqual(commitment.trustMarkers, ["Confidence: Guarded", "Freshness: Stale"]);
    assert.match(commitment.ownerCadence, /daily 10:00 review/);
  });
});
