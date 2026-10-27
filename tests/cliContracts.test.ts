import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_THRESHOLDS } from "../lib/regimeEngineCore";
import { buildCanonicalBoundedDecisionRules } from "../lib/report/boundedDecisionRules";
import { buildActionStripItems } from "../lib/report/operatingCalls";
import {
  buildCliCallContract,
  buildCliChangesContract,
  buildCliRegimeContract,
  buildCliStatusContract,
  buildCliStatusExpandedContract,
  buildScenarioContract,
} from "../lib/cli/contracts";
import { buildPostureState } from "../lib/report/postureStateSource";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

/* Over a whole report: the guidance is the week's call, which reads the full reading
   (`resolveWeekGuidance`), so a hand-built partial one cannot produce it. */
const fixture = buildReportDataFixture();
const reportData = {
  ...fixture,
  treasury: {
    ...fixture.treasury,
    fetched_at: "2026-03-12T12:00:00.000Z",
    fed_funds: 5.25,
    yield_curve_spread: -0.4,
  },
  assessment: {
    ...fixture.assessment,
    regime: "EXPANSION",
    scores: { tightness: 62, riskAppetite: 45, baseRate: 5.25, curveSlope: -0.4 },
    diagnostics: { confidence: "HIGH", nearestThresholdDelta: 9 },
    policyAssessment: { refusal: { refused: false, reasons: [] } },
  },
  reportDynamics: {
    ...fixture.reportDynamics,
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

const realPosture = await buildPostureState({
  record: reportData.treasury,
  assessment: reportData.assessment,
  reportDynamics: reportData.reportDynamics,
});
const postureState = {
  ...realPosture,
  currentState: {
    ...realPosture.currentState,
    postureLabel: "Guarded Expansion",
    confidenceLabel: "HIGH",
    confidencePercent: 92,
    transitionWatch: "ON",
  },
  whatFlipsNext: {
    ...realPosture.whatFlipsNext,
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
    assert.equal(call.call, status.call.summary, "`whether call` and the status print one guidance");
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

  /*
   * The changes were headed "Since Last Refresh" while measuring against the previous month-end
   * snapshot, and named the signals by engine key. The contract carries the reading it compared
   * with, the name a reader sees, and what each score's move is made of.
   */
  it("names the reading the changes are measured against, what each signal is called, and what a score's move is made of", () => {
    const dated = {
      ...reportData,
      reportDynamics: {
        ...reportData.reportDynamics,
        comparedWith: { recordDate: "2026-02-28", label: "Feb 28" },
        changedSignals: [
          { key: "tightness", label: "Funding pressure", delta: -6 },
          { key: "riskAppetite", label: "Risk appetite", delta: -13 },
          { key: "baseRate", label: "Base rate", delta: 0.25 },
        ],
        movement: {
          riskAppetite: { parts: [{ source: "curve", points: -2 }, { source: "startupMarket", points: -11 }] },
        },
      },
    };
    const changes = buildCliChangesContract({ reportData: dated, postureState, degraded: false });

    assert.equal(changes.basis, "since Feb 28");
    assert.deepEqual(changes.comparedWith, { recordDate: "2026-02-28", label: "Feb 28" });
    assert.deepEqual(changes.changed.map((item) => item.label), ["Funding pressure", "Risk appetite", "Base rate"]);
    assert.deepEqual(changes.changed[1].moved, [
      { source: "curve", label: "the yield curve", points: -2 },
      { source: "startupMarket", label: "startup-market inputs", points: -11 },
    ]);
    assert.deepEqual(changes.changed[0].moved, [], "a score whose split is not available says nothing rather than inventing one");
    assert.deepEqual(changes.changed[2].moved, [], "and a signal that is not a score has none");

    // A source that names no date keeps the old wording rather than inventing one.
    const undated = buildCliChangesContract({ reportData, postureState, degraded: false });
    assert.equal(undated.basis, "since last week");
    assert.equal(undated.comparedWith, null);
  });

  /*
   * "Pressure increased by +3.0 … Slow new commitments" was the archive's account of a week that
   * crossed no line. The CLI names what the change did to the decisions in the sentence the page,
   * the state and the pastes carry, and says nothing where nothing was compared.
   */
  it("names what the change did to the decisions, in the page's own sentence", () => {
    const scores = { tightness: 90, riskAppetite: 43 };
    const rules = buildCanonicalBoundedDecisionRules({ regime: "SCARCITY", thresholds: DEFAULT_THRESHOLDS, scores });
    const crossing = {
      ...reportData,
      assessment: { ...reportData.assessment, regime: "SCARCITY", scores: { ...reportData.assessment.scores, ...scores }, thresholds: DEFAULT_THRESHOLDS },
      actionStripItems: buildActionStripItems(rules, scores),
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [
          { key: "tightness", label: "Funding pressure", delta: 27 },
          { key: "riskAppetite", label: "Risk appetite", delta: -13 },
        ],
        anomalySignals: [],
        comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
      },
    };

    assert.equal(
      buildCliChangesContract({ reportData: crossing, postureState, degraded: false }).decision,
      "Since Aug 31, conditions changed from Sunny to Freezing. The pause now applies to every area, because funding pressure rose above 76 and risk appetite fell below 44.",
    );
    assert.equal(
      buildCliChangesContract({ reportData: { ...crossing, reportDynamics: { ...crossing.reportDynamics, directionLabel: "unavailable", changedSignals: [] } }, postureState, degraded: false }).decision,
      null,
    );
  });

  it("builds scenario contract", () => {
    const scenario = buildScenarioContract({
      postureBefore: "Guarded Expansion",
      postureAfter: "Sunny",
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
    assert.match(script, /const keyMap = \{/);
    assert.match(script, /"as-of": "asOf"/);
    assert.match(script, /for \(const flag of allowedFlags\)/);
    assert.match(script, /params\.set\(keyMap\[flag\] \?\? flag, String\(value\)\)/);
  });

});
