import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { buildBoundedConditionRails } from "../lib/report/operatingCalls";
import { buildCanonicalBoundedDecisionRules, buildRuleCondition } from "../lib/report/boundedDecisionRules";

const scores = { tightness: 32, riskAppetite: 52 };

describe("buildBoundedConditionRails", () => {
  it("draws both lines from the rule's own clause data", () => {
    const rails = buildBoundedConditionRails({
      pause: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
      resume: [buildRuleCondition("tightness", "<", 66), buildRuleCondition("riskAppetite", ">", 54)],
      scores,
    });

    assert.deepEqual(rails, [
      {
        metric: "tightness",
        label: "Funding pressure",
        current: 32,
        guardrail: 76,
        clearsAt: 66,
        invert: false,
        pointsToGuardrail: 44,
        pointsToClear: 0,
      },
      {
        metric: "riskAppetite",
        label: "Risk appetite",
        current: 52,
        guardrail: 44,
        clearsAt: 54,
        invert: true,
        pointsToGuardrail: 8,
        pointsToClear: 2,
      },
    ]);
  });

  it("states the same lines the derived sentence does", () => {
    const [hiring] = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const rails = buildBoundedConditionRails({
      pause: hiring.pause.conditions,
      resume: hiring.resume.conditions,
      scores,
    });

    assert.equal(hiring.pauseTrigger, "Pause net-new hiring if funding pressure rises above 76 or risk appetite falls below 44.");
    assert.equal(hiring.resumeTrigger, "Resume staged approvals when funding pressure falls below 66 and risk appetite is above 54.");
    assert.deepEqual(rails.map((rail) => [rail.guardrail, rail.clearsAt]), [[76, 66], [44, 54]]);
  });

  it("inverts the rail whose rule trips downward so both put trouble on the right", () => {
    const rails = buildBoundedConditionRails({
      pause: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
      scores,
    });

    assert.deepEqual(
      rails.map((rail) => rail.invert),
      [false, true],
      "a rule that trips high already draws trouble on the right; one that trips low has to be flipped",
    );
  });

  it("draws one rail per signal when a rule names the same signal twice", () => {
    const rails = buildBoundedConditionRails({
      pause: [buildRuleCondition("tightness", ">", 70), buildRuleCondition("tightness", ">", 80)],
      scores,
    });

    assert.equal(rails.length, 1);
    assert.equal(rails[0].guardrail, 70, "the binding line is stated first");
  });

  it("renders no rail when there is no line or no reading to place on it", () => {
    assert.deepEqual(buildBoundedConditionRails({ pause: [], scores }), []);
    assert.deepEqual(buildBoundedConditionRails({ pause: undefined, scores }), []);
    assert.deepEqual(
      buildBoundedConditionRails({
        pause: [buildRuleCondition("tightness", ">", 76)],
        scores: undefined,
      }),
      [],
      "without current scores there is nothing to place on the rail",
    );
  });

  it("keeps a rail whose rule states no clearing line", () => {
    const rails = buildBoundedConditionRails({
      pause: [buildRuleCondition("tightness", ">", 76)],
      resume: [buildRuleCondition("riskAppetite", ">", 54)],
      scores,
    });

    assert.equal(rails.length, 1);
    assert.equal(rails[0].clearsAt, undefined, "the clears-when line is for a different signal");
  });
});

describe("buildSharedCorridorRails", () => {
  it("draws the corridor once from the first line each lever states per signal", async () => {
    const { buildActionStripItems, buildSharedCorridorRails, formatPointsToLine } = await import("../lib/report/operatingCalls");
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const items = buildActionStripItems(rules, scores);
    const rails = buildSharedCorridorRails(items, scores);

    assert.deepEqual(
      rails.map((rail) => [rail.metric, rail.guardrail, rail.clearsAt]),
      [["tightness", 76, 66], ["riskAppetite", 44, 54]],
      "five levers, one corridor",
    );
    assert.equal(formatPointsToLine(rails[0].pointsToGuardrail, "pause"), "44 pts away");
    assert.equal(formatPointsToLine(rails[0].pointsToClear, "resume"), "holds");
    assert.equal(formatPointsToLine(0, "pause"), "tripped");
    assert.equal(formatPointsToLine(2.5, "resume"), "2.5 pts away");
  });
});
