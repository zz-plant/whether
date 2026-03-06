import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveDecisionKnobs } from "../lib/report/decisionKnobs";

describe("deriveDecisionKnobs", () => {
  it("uses per-dial level labels and rationale", () => {
    const knobs = deriveDecisionKnobs("EXPANSION", 0, {
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
});
