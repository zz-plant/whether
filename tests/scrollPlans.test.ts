import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideScrollPlan,
  homeScrollPlan,
  methodScrollPlan,
  operationsScrollPlan,
  signalsScrollPlan,
} from "../lib/navigation/scrollPlans";

const plans = [
  ["home", homeScrollPlan],
  ["signals", signalsScrollPlan],
  ["operations", operationsScrollPlan],
  ["decide", decideScrollPlan],
  ["method", methodScrollPlan],
] as const;

describe("scroll plans", () => {
  it("keeps every plan ordered, non-empty, and anchor-based", () => {
    for (const [, plan] of plans) {
      assert.ok(plan.title.length > 0);
      assert.ok(plan.description.length > 0);
      assert.ok(plan.items.length >= 3);

      const hrefs = new Set(plan.items.map((item) => item.href));
      assert.equal(hrefs.size, plan.items.length);

      for (const item of plan.items) {
        assert.ok(item.href.startsWith("#"));
        assert.ok(item.label.length > 0);
        assert.ok(item.summary.length > 0);
      }
    }
  });

  it("keeps the primary page scroll sequences aligned to their intended first stops", () => {
    assert.equal(homeScrollPlan.items[0]?.href, "#audit-this-call");
    assert.equal(signalsScrollPlan.items[0]?.href, "#decision-summary");
    assert.equal(operationsScrollPlan.items[0]?.href, "#ops-monthly-action-summary");
    assert.equal(operationsScrollPlan.items[1]?.href, "#ops-failure-patterns");
    assert.equal(decideScrollPlan.items[0]?.href, "#run-this-now");
    assert.equal(methodScrollPlan.items[0]?.href, "#trust-hub-links");
  });

  it("keeps operations and signals ending in depth checks rather than primary decisions", () => {
    assert.equal(signalsScrollPlan.items.at(-1)?.href, "#thresholds");
    assert.equal(operationsScrollPlan.items.at(-1)?.href, "#ops-edge-case-gate");
  });
});
