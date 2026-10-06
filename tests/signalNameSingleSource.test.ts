import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildSignalInfluence } from "../lib/regimeEngineDiagnostics";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { buildRuleCondition, ruleMetricLabel } from "../lib/report/boundedDecisionRules";
import { regimeSignalLabel } from "../lib/report/signalTranslations";

/*
 * The two composite scores were named in about thirty label positions — rule
 * conditions, the plan-lines form, the phase-space axes, alert copy, the flip
 * watch, the email's score rows — each as its own string literal beside a
 * table (`regimeSignalLabel`) that exists so a rename lands everywhere. These
 * pin the outputs that carry a score's name to that table rather than to a
 * spelling, so a renamed signal cannot leave a stale label behind.
 */
describe("signal names come from one table", () => {
  it("names rule conditions, and so plan lines and area tables, from regimeSignalLabel", () => {
    assert.deepEqual(ruleMetricLabel, {
      tightness: regimeSignalLabel.tightness,
      riskAppetite: regimeSignalLabel.riskAppetite,
    });
    assert.ok(buildRuleCondition("tightness", ">", 76).label.startsWith(`${regimeSignalLabel.tightness} >`));
    assert.ok(buildRuleCondition("riskAppetite", "<", 44).label.startsWith(`${regimeSignalLabel.riskAppetite} <`));
  });

  it("labels each signal's influence on the call from regimeSignalLabel", () => {
    const influence = buildSignalInfluence({
      tightness: 90,
      riskAppetite: 47,
      baseRate: null,
      curveSlope: null,
      thresholds: DEFAULT_THRESHOLDS,
    });
    const byKey = new Map(influence.map((entry) => [entry.key, entry.label]));
    assert.equal(byKey.get("tightness"), regimeSignalLabel.tightness);
    assert.equal(byKey.get("riskAppetite"), regimeSignalLabel.riskAppetite);
  });
});
