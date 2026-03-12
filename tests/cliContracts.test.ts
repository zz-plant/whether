import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCliCallContract,
  buildCliChangesContract,
  buildCliRegimeContract,
  buildCliStatusContract,
  buildCliStatusExpandedContract,
  buildScenarioContract,
} from "../lib/cli/contracts";

const reportData = {
  treasury: {
    fetched_at: "2026-03-12T12:00:00.000Z",
    fed_funds: 5.25,
    yield_curve_spread: -0.4,
  },
  assessment: {
    regime: "EXPANSION",
    scores: { tightness: 62, riskAppetite: 45 },
  },
  reportDynamics: {
    directionLabel: "deteriorating",
    changedSignals: [{ key: "tightness", delta: -6 }],
    anomalySignals: [{ reason: "spread divergence" }, { reason: "macro drift" }],
  },
  playbook: { why: "Proceed selectively while protecting downside." },
  actionNowShort: "Stage decisions. Avoid irreversible spend.",
  startItems: ["Selective hiring for revenue-linked roles"],
  stopItems: ["Broad headcount expansion"],
  guardrailThreshold: "Do not approve broad hiring without 2-cycle confirmation.",
  flipThreshold: "Flip if tightness stays below 60.",
  treasuryProvenance: { statusLabel: "Cached (fallback)", ageLabel: "26h" },
} as any;

const postureState = {
  currentState: {
    postureLabel: "Guarded Expansion",
    confidenceLabel: "HIGH",
    confidencePercent: 92,
    transitionWatch: "ON",
  },
  whatFlipsNext: {
    thresholds: ["tightness < 60 for 2 consecutive refreshes"],
    reversalConditions: ["risk appetite > 50 for 2 consecutive refreshes"],
    flipTrigger: "tightness < 60 for 2 consecutive refreshes",
  },
} as any;

describe("cli contracts", () => {
  it("builds status/call/changes/regime contracts", () => {
    const status = buildCliStatusContract({ reportData, postureState, degraded: false });
    assert.equal(status.version, "v1");
    assert.equal(status.decisionStability, "unstable");
    assert.equal(status.call.do[0], "Selective hiring for revenue-linked roles");

    const call = buildCliCallContract({ reportData, postureState, degraded: false });
    assert.match(call.call, /Stage decisions/);

    const changes = buildCliChangesContract({ reportData, postureState, degraded: false });
    assert.equal(changes.changed[0].from, 68);
    assert.equal(changes.changed[0].to, 62);

    const regime = buildCliRegimeContract({ reportData, postureState, degraded: false });
    assert.equal(regime.regime, "Guarded Expansion");
  });

  it("builds expanded status contract", () => {
    const status = buildCliStatusExpandedContract({ reportData, postureState, degraded: false });
    assert.equal(status.version, "v1");
    assert.equal(status.view, "expanded");
    assert.equal(status.guardrails.threshold, "Do not approve broad hiring without 2-cycle confirmation.");
    assert.equal(status.boundedDecisionSummary.topSignalDeltas[0]?.metric, "tightness");
    assert.equal(status.trust.fallback, false);
    assert.match(status.trust.cueLine, /Signal reliability HIGH/);
    assert.ok(status.trust.warnings.length >= 1);
  });

  it("builds scenario contract", () => {
    const scenario = buildScenarioContract({
      postureBefore: "Guarded Expansion",
      postureAfter: "Expansion",
      inputs: { tightness: 58, riskAppetite: 56 },
    });
    assert.equal(scenario.version, "v1");
    assert.equal(scenario.likelyOutcome.changed, true);
  });
});
