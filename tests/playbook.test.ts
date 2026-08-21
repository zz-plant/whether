/**
 * Playbook selector unit tests for regime mapping.
 */
import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { getPlaybookForRegime, getPlaybookGuidance } from "../lib/playbook";
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


it("derives operating levers from canonical bounded rules with assessment context", () => {
  const guidance = getPlaybookGuidance("DEFENSIVE", {
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 74, riskAppetite: 46 },
  });

  const hiringLever = guidance.operatingLevers.find((item) => item.lever === "hiring-stance");
  assert.match(hiringLever?.actionNow ?? "", /Limit hiring to backfills and mission-critical roles tied to delivery risk/i);
  assert.match(hiringLever?.triggerThreshold ?? "", /funding pressure rises above 76/i);
  assert.match(hiringLever?.triggerThreshold ?? "", /risk appetite falls below 44/i);
  assert.match(hiringLever?.reversalCondition ?? "", /funding pressure falls below 66/i);
  assert.match(hiringLever?.reversalCondition ?? "", /risk appetite is above 54/i);
});


it("keeps operating levers in canonical businessAreaOrder", () => {
  const guidance = getPlaybookGuidance("DEFENSIVE", {
    thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
    scores: { tightness: 74, riskAppetite: 46 },
  });

  assert.deepEqual(
    guidance.operatingLevers.map((item) => item.lever),
    [
      "hiring-stance",
      "investment-pace",
      "sales-posture",
      "product-priorities",
      "risk-tolerance",
    ],
  );
});
