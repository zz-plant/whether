import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildCanonicalBoundedDecisionRules,
  type BoundedDecisionRule,
} from "../lib/report/boundedDecisionRules";
import {
  decisionLatencyByArea,
  formatDecisionLatencyLine,
} from "../lib/report/decisionLatency";
import { buildActionStripItems } from "../lib/report/operatingCalls";

const RULE_CONTEXT = {
  regime: "DEFENSIVE" as const,
  thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
  scores: { tightness: 72, riskAppetite: 45 },
};

describe("decision latency", () => {
  it("carries a latency entry for every decision area", () => {
    for (const rule of buildCanonicalBoundedDecisionRules(RULE_CONTEXT)) {
      const latency = decisionLatencyByArea[rule.area];
      assert.ok(latency, `no latency defined for ${rule.area}`);
      assert.ok(latency.effectLandsLabel.length > 0);
      assert.ok(latency.reversalLabel.length > 0);
    }
  });

  it("attaches its own area's latency to each canonical rule", () => {
    const rules = buildCanonicalBoundedDecisionRules(RULE_CONTEXT);
    for (const rule of rules) {
      assert.deepEqual(rule.latency, decisionLatencyByArea[rule.area]);
    }
  });

  it("formats one line from effect and reversal segments", () => {
    const line = formatDecisionLatencyLine(decisionLatencyByArea.hiring);
    assert.match(line, /Headcount from a decision this week lands in 4–6 weeks; unwinding costs 2–4 weeks of runway\./);
  });

  it("surfaces the latency line on action strip items", () => {
    const rules: BoundedDecisionRule[] = buildCanonicalBoundedDecisionRules(RULE_CONTEXT);
    const items = buildActionStripItems(rules, RULE_CONTEXT.scores);
    assert.equal(items.length, rules.length);
    for (const item of items) {
      assert.ok(item.latencyLine, `no latency line on ${item.lever}`);
      assert.match(item.latencyLine, /; unwinding/);
    }
  });

  it("omits the latency line when a rule carries none (fallback rows)", () => {
    const items = buildActionStripItems([], RULE_CONTEXT.scores);
    assert.equal(items.length, 5);
    for (const item of items) {
      assert.equal(item.latencyLine, undefined);
    }
  });

  it("names an owner for every canonical action strip row", () => {
    const rules: BoundedDecisionRule[] = buildCanonicalBoundedDecisionRules(RULE_CONTEXT);
    const items = buildActionStripItems(rules, RULE_CONTEXT.scores);
    for (const item of items) {
      assert.ok(item.ownerLabel, `no owner on ${item.lever}`);
      assert.ok(item.ownerLabel.length > 0);
    }
  });
});
