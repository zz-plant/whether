import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getGovernanceParametersForPosture } from "../lib/policy/governance";

describe("policy governance parameters", () => {
  it("maps risk-on posture to faster governance defaults", () => {
    const params = getGovernanceParametersForPosture("RISK_ON", false);
    assert.equal(params.hiringThreshold, "MODERATE");
    assert.equal(params.approvalVelocity, "FASTER");
  });

  it("forces reversible controls during refusal", () => {
    const params = getGovernanceParametersForPosture("RISK_ON", true);
    assert.equal(params.rollbackRequirement, "REVERSIBLE_ONLY");
    assert.equal(params.approvalVelocity, "SLOWER_STRUCTURED");
    assert.equal(params.experimentationTolerance, "LOW");
  });
});
