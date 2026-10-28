import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildCliStatusContract, buildCliStatusExpandedContract } from "../lib/cli/contracts";
import { NextRequest } from "next/server";
import { CLI_QUERIES, parseCliQuery } from "../lib/cli/queryContracts";
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
    flipTrigger: "Funding pressure falls 20 pts from 90 to 70 or below.",
    thresholds: ["tightness < 60 for 2 consecutive refreshes"],
  },
} as any;

describe("cli fallback contract", () => {
  it("keeps /api/cli/status fields used by curl fallback docs", () => {
    const status = buildCliStatusContract({ reportData, postureState, degraded: false });

    assert.equal(status.version, "v1");
    assert.equal(status.regime, "Guarded Expansion");
    assert.equal(status.trend, "Deteriorating");
    assert.equal(typeof status.generatedAt, "string");
    assert.equal(typeof status.updatedAt, "string");
    assert.equal(typeof status.call.summary, "string");
    assert.ok(Array.isArray(status.call.flipConditions));
    assert.equal(status.degraded, false);
  });

  it("keeps expanded view fields used by curl fallback docs", () => {
    const expanded = buildCliStatusExpandedContract({ reportData, postureState, degraded: false });

    assert.equal(expanded.view, "expanded");
    assert.equal(typeof expanded.boundedDecision.guardrailThreshold, "string");
    assert.equal(typeof expanded.boundedDecision.reversalTrigger, "string");
    assert.ok(Array.isArray(expanded.boundedDecision.flipConditionsCompact));
  });

  it("accepts historical asOf query format used by fallback docs", () => {
    assert.deepEqual(parseCliQuery(new NextRequest("http://localhost:3000/api/cli/status?asOf=2024-07"), CLI_QUERIES.status), {
      asOf: { month: "7", year: "2024" },
    });
  });
});
