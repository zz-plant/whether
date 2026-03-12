import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
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
    scores: { tightness: 62, riskAppetite: 45, baseRate: 5.25, curveSlope: -0.4 },
    diagnostics: { confidence: "HIGH", nearestThresholdDelta: 9 },
  },
  reportDynamics: {
    directionLabel: "deteriorating",
    changedSignals: [
      { key: "tightness", delta: -6 },
      { key: "baseRate", delta: 0.25 },
      { key: "curveSlope", delta: -0.15 },
    ],
  },
  playbook: { insight: "Proceed selectively while protecting downside." },
  actionNowShort: "Stage decisions. Avoid irreversible spend.",
  startItems: ["Selective hiring for revenue-linked roles"],
  stopItems: ["Broad headcount expansion"],
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
  },
} as any;

describe("cli contracts", () => {
  it("builds status/call/changes/regime contracts", () => {
    const status = buildCliStatusContract({ reportData, postureState, degraded: false });
    assert.equal(status.version, "v1");
    assert.equal(status.decisionStability, "unstable");
    assert.match(status.freshness.line, /Updated/);
    assert.equal(status.call.do[0], "Selective hiring for revenue-linked roles");

    const call = buildCliCallContract({ reportData, postureState, degraded: false });
    assert.match(call.call, /Stage decisions/);
    assert.match(call.freshness.line, /Updated/);

    const changes = buildCliChangesContract({ reportData, postureState, degraded: false });
    assert.equal(changes.changed[0].from, 68);
    assert.equal(changes.changed[0].to, 62);
    assert.equal(changes.changed[1].metric, "base_rate");
    assert.equal(changes.changed[1].to, 5.25);
    assert.equal(changes.changed[2].metric, "curve_slope");
    assert.equal(changes.changed[2].to, -0.4);

    assert.equal(status.cyclePhase, "Late");

    const regime = buildCliRegimeContract({ reportData, postureState, degraded: false });
    assert.equal(regime.regime, "Guarded Expansion");

    const expanded = buildCliStatusExpandedContract({ reportData, postureState, degraded: false });
    assert.equal(expanded.view, "expanded");
    assert.ok(expanded.boundedDecision.flipConditionsCompact.length >= 1);
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

  it("documents commands that route with common params", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts", "whether-cli.mjs"), "utf8");

    const expectedRoutes = [
      "/api/cli/status",
      "/api/cli/call",
      "/api/cli/regime",
      "/api/cli/changes",
      "/api/cli/diagnostics",
      "/api/cli/history",
    ];

    for (const route of expectedRoutes) {
      assert.ok(script.includes(`routeWithCommonParams("${route}"`));
    }
    assert.match(script, /if \(flags\["as-of"\]\) params\.set\("asOf"/);
    assert.match(script, /if \(flags\.company\) params\.set\("company"/);
    assert.match(script, /if \(flags\.stage\) params\.set\("stage"/);
    assert.match(script, /if \(flags\.weeks\) params\.set\("weeks"/);
    assert.match(script, /if \(flags\.view\) params\.set\("view"/);
  });

});
