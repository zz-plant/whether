/**
 * Playbook selector unit tests for regime mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlaybookForRegime, getPlaybookGuidance } from "../lib/playbook";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildRoleAwareOperatingTemplates, decisionAreaToOperatingLever } from "../lib/report/operatingCalls";

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

it("derives playbook operating levers from canonical bounded rules", () => {
  const thresholds = { tightnessRegime: 70, riskAppetiteRegime: 50 };
  const scores = { tightness: 74, riskAppetite: 45 };

  const canonicalRules = buildCanonicalBoundedDecisionRules({
    regime: "DEFENSIVE",
    thresholds,
    scores,
  });
  const guidance = getPlaybookGuidance("DEFENSIVE", { thresholds, scores });

  for (const rule of canonicalRules) {
    const lever = decisionAreaToOperatingLever[rule.area];
    const mapped = guidance.operatingLevers.find((item) => item.lever === lever);
    assert.ok(mapped);
    assert.equal(mapped?.actionNow, rule.recommendation);
    assert.equal(mapped?.triggerThreshold, rule.pauseTrigger);
    assert.equal(mapped?.reversalCondition, rule.resumeTrigger);
  }
});
