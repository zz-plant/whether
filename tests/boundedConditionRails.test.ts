import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import {
  buildActionStripItems,
  buildBoundedConditionRails,
  formatPointsToLine,
  toThresholdDistance,
} from "../lib/report/operatingCalls";
import {
  buildCanonicalBoundedDecisionRules,
  buildRuleCondition,
  formatBoundedDecisionThreshold,
  guardrailMatchesRule,
} from "../lib/report/boundedDecisionRules";

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
        guardrailTripped: false,
        pointsToClear: 0,
        clearHolds: true,
      },
      {
        metric: "riskAppetite",
        label: "Risk appetite",
        current: 52,
        guardrail: 44,
        clearsAt: 54,
        invert: true,
        pointsToGuardrail: 8,
        guardrailTripped: false,
        pointsToClear: 2,
        clearHolds: false,
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
    /* A line the reading already meets says so, beside the one still to come. */
    assert.equal(hiring.resumeTrigger, "Resume the held roles when funding pressure is below 66 (already true at 32) and risk appetite is above 54.");
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
    assert.equal(formatPointsToLine(rails[0].pointsToGuardrail, "pause", rails[0].guardrailTripped), "44 pts away");
    assert.equal(formatPointsToLine(rails[0].pointsToClear, "resume", rails[0].clearHolds), "already met");
    assert.equal(formatPointsToLine(0, "pause", true), "crossed");
    assert.equal(formatPointsToLine(2.5, "resume", false), "2.5 pts away");
  });

  it("does not call a strict line crossed when the reading sits exactly on it", () => {
    // Scores and lines are both integers, so equality is a real case: 76 is
    // zero points from "> 76" and has not crossed it.
    const onTheLine = { tightness: 76, riskAppetite: 44 };
    const rails = buildBoundedConditionRails({
      pause: [buildRuleCondition("tightness", ">", 76), buildRuleCondition("riskAppetite", "<", 44)],
      resume: [buildRuleCondition("tightness", "<", 76)],
      scores: onTheLine,
    });
    assert.equal(rails[0].pointsToGuardrail, 0);
    assert.equal(rails[0].guardrailTripped, false);
    assert.equal(rails[0].clearHolds, false);
    assert.equal(formatPointsToLine(rails[0].pointsToGuardrail, "pause", rails[0].guardrailTripped), "at the line");

    const distance = toThresholdDistance(buildRuleCondition("tightness", ">=", 76), onTheLine);
    assert.equal(distance.satisfied, true, "an inclusive line is met at equality");

    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: onTheLine,
    });
    const hiring = buildActionStripItems(rules, onTheLine).find((item) => item.lever === "hiring-stance");
    assert.notEqual(hiring?.currentStateLabel, "Closed", "a reading on the line has not tripped the pause");
  });

  it("keeps a rule's qualifier on the action strip so a table can print the whole rule", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const items = buildActionStripItems(rules, scores);
    const product = items.find((item) => item.lever === "product-priorities");
    assert.equal(product?.pauseQualifier, "two weekly readings in a row come in weaker");
    assert.equal(product?.resumeQualifier, "the weekly reading holds or improves");
    const hiring = items.find((item) => item.lever === "hiring-stance");
    assert.equal(hiring?.pauseQualifier, undefined);
  });

  it("draws rails only for the guardrail sentence the surface actually prints", () => {
    const rules = buildCanonicalBoundedDecisionRules({
      regime: "EXPANSION",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores,
    });
    const hiring = rules[0];
    assert.equal(guardrailMatchesRule(hiring.pauseTrigger, hiring), true);
    assert.equal(guardrailMatchesRule(formatBoundedDecisionThreshold(hiring), hiring), true);
    assert.equal(guardrailMatchesRule("Funding pressure crosses 76", hiring, 76), true);
    // A stage-scoped or policy-override guardrail replaces the sentence with one
    // these lines do not describe; rails drawn for it would show the wrong rule.
    assert.equal(guardrailMatchesRule("Pause irreversible approvals while the policy override remains active.", hiring), false);
    assert.equal(guardrailMatchesRule("Funding pressure crosses 60", hiring, 60), false);
    assert.equal(guardrailMatchesRule(undefined, hiring), false);
  });
});

describe("a rule line the reading already meets", () => {
  it("says the pause applies instead of reading as a move still to come", () => {
    const [hiring] = buildCanonicalBoundedDecisionRules({
      regime: "SCARCITY",
      thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
      scores: { tightness: 90, riskAppetite: 48 },
    });
    assert.equal(
      hiring.pauseTrigger,
      "Pause net-new hiring if funding pressure is above 76 (already true at 90) or risk appetite falls below 44.",
    );
    assert.doesNotMatch(hiring.pauseTrigger, /rises above 76/);
  });
});
