/**
 * Playbook selector unit tests for regime mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlaybookForRegime } from "../lib/playbook";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildRoleAwareOperatingTemplates } from "../lib/report/operatingCalls";

describe("playbook selector", () => {
  it("returns playbook for known regime", () => {
    const playbook = getPlaybookForRegime("SCARCITY");
    assert.ok(playbook);
    assert.equal(playbook?.key, "SCARCITY");
  });
});


it("builds role-aware templates with bounded do/avoid/flip structure", () => {
  const rules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
    scores: { tightness: 58, riskAppetite: 46 },
  });

  const templates = buildRoleAwareOperatingTemplates(rules);
  assert.equal(templates.length, 2);
  assert.equal(templates[0]?.role, "startup-leadership");
  assert.match(templates[0]?.doNow ?? "", /hiring|roadmap|spend|reversible/i);
  assert.match(templates[0]?.avoidNow ?? "", /tightness|risk appetite/i);
  assert.match(templates[0]?.flipTrigger ?? "", /tightness|risk appetite/i);
  assert.equal(templates[1]?.role, "vc-partner");
});
