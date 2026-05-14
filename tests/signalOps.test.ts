import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildDeliverySummary,
  buildSignalAlertPayload,
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertInputPayload,
} from "../lib/signalOps";
import { DEFAULT_THRESHOLDS, type RegimeAssessment } from "../lib/regimeEngine";

const assessment = (
  regime: RegimeAssessment["regime"],
  tightness: number,
  riskAppetite: number,
  confidence: RegimeAssessment["diagnostics"]["confidence"] = "MEDIUM",
): RegimeAssessment => ({
  regime,
  regimeTransition: {
    nextState: regime,
    candidateState: regime,
    committed: true,
    pending: false,
    transitionReason: "",
    transitionPendingCount: 0,
    snapshot: {
      committedState: regime,
      pendingState: null,
      pendingCount: 0,
      lastSignals: { tightness, riskAppetite },
    },
  },
  constraints: [],
  dataWarnings: [],
  description: "",
  inputs: [],
  riskAppetiteExplanation: "",
  tightnessExplanation: "",
  thresholds: DEFAULT_THRESHOLDS,
  diagnostics: {
    tightnessDelta: tightness - DEFAULT_THRESHOLDS.tightnessRegime,
    riskAppetiteDelta: riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime,
    nearestThresholdDelta: Math.min(
      Math.abs(tightness - DEFAULT_THRESHOLDS.tightnessRegime),
      Math.abs(riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime),
    ),
    confidence,
    transitionWatch: false,
    intensity: "STANDARD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  scores: {
    baseRate: 5,
    baseRateUsed: "1M",
    curveSlope: -0.1,
    tightness,
    riskAppetite,
  },
  policyAssessment: {
    version: "policy-v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "TRANSITION",
    band: "NEUTRAL",
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "HIGH",
      paybackWindowTolerance: "STANDARD",
      rollbackRequirement: "EXPLICIT_KILL_CRITERIA",
      approvalVelocity: "BALANCED",
      expansionScope: "BALANCED",
      experimentationTolerance: "MEDIUM",
    },
  },
});

const basePayload = (
  previousAssessment: RegimeAssessment,
  currentAssessment: RegimeAssessment,
): SignalAlertInputPayload => ({
  previousRecordDate: "2026-01-01",
  currentRecordDate: "2026-01-08",
  previousAssessment,
  currentAssessment,
  sourceUrls: ["https://example.com"],
  timeMachineHref: "/evidence?advanced=1#time-machine",
});

describe("signalOps", () => {
  it("emits alert payload on threshold crossing with explicit decision delta", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 44)),
    );

    assert.ok(payload.decisionDeltas.some((delta) => delta.code === "tightness-upshift"));
    assert.equal(shouldCreateSignalAlert(payload), true);
  });

  it("suppresses alerts when no threshold crossing happened", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 66, 54), assessment("DEFENSIVE", 68, 53)),
    );

    assert.equal(payload.decisionDeltas.length, 0);
    assert.equal(shouldCreateSignalAlert(payload), false);
  });

  it("suppresses jittering unsustained non-severe crossings", () => {
    const first = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 69, 54), assessment("DEFENSIVE", 71, 54)),
    );
    assert.equal(shouldCreateSignalAlert(first), false);

    const latest: RegimeAlertEvent = {
      eventId: "evt-1",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      payload: {
        ...first,
        decisionDeltas: [
          {
            code: "tightness-upshift",
            decisionArea: "spend",
            actionText: "Tighten discretionary spend and hold non-critical hiring reqs.",
            triggerValue: 71,
            thresholdLabel: "Tightness regime threshold",
            thresholdValue: 70,
            confidence: "MEDIUM",
            reversalText: "Re-tighten if tightness rises back above 70 for two updates.",
            gate: "pass",
            severe: false,
          },
        ],
        triggerStates: { "tightness-upshift": { crossed: true, sustainedPeriods: 1 } },
        reasons: [{ code: "tightness-upshift", message: "jitter" }],
      },
    };

    const jitter = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 70.8, 54), assessment("DEFENSIVE", 71.2, 54)),
      latest,
    );

    assert.equal(shouldCreateSignalAlert(jitter, latest), false);
  });

  it("suppresses low-confidence deltas unless severe thresholds are exceeded", () => {
    const lowConfidence = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("DEFENSIVE", 73, 49, "LOW")),
    );
    assert.equal(lowConfidence.decisionDeltas.length, 0);

    const severeLowConfidence = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 84, 39, "LOW")),
    );
    assert.ok(severeLowConfidence.decisionDeltas.length > 0);
    assert.ok(severeLowConfidence.decisionDeltas.every((delta) => delta.gate === "downgrade"));
  });

  it("emits reversal alerts once state sustains after crossing", () => {
    const latest = buildSignalAlertPayload(
      basePayload(assessment("SCARCITY", 75, 45), assessment("SCARCITY", 76, 44)),
    );

    const latestEvent: RegimeAlertEvent = {
      eventId: "evt-2",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "2",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      payload: {
        ...latest,
        decisionDeltas: [
          {
            code: "tightness-downshift",
            decisionArea: "spend",
            actionText: "Loosen budget holds for pre-approved growth bets.",
            triggerValue: 68,
            thresholdLabel: "Tightness regime threshold",
            thresholdValue: 70,
            confidence: "MEDIUM",
            reversalText: "Re-tighten if tightness rises back above 70 for two updates.",
            gate: "pass",
            severe: false,
          },
        ],
        triggerStates: { "tightness-downshift": { crossed: true, sustainedPeriods: 1 } },
        reasons: [{ code: "tightness-downshift", message: "prior" }],
      },
    };

    const reversalPayload = buildSignalAlertPayload(
      basePayload(assessment("SCARCITY", 72, 45), assessment("DEFENSIVE", 69, 51)),
      latestEvent,
    );

    assert.ok(reversalPayload.decisionDeltas.some((delta) => delta.code === "tightness-downshift"));
    assert.equal(shouldCreateSignalAlert(reversalPayload, latestEvent), true);
  });

  it("builds delivery summaries with structured delta codes", () => {
    const payload = buildSignalAlertPayload(
      basePayload(assessment("DEFENSIVE", 68, 55), assessment("SCARCITY", 88, 44)),
    );

    const latest: RegimeAlertEvent = {
      eventId: "evt-3",
      sourceVersion: "test",
      canonicalTimestampSource: "request-received-at",
      id: "1",
      createdAt: new Date().toISOString(),
      payload,
    };

    const summary = buildDeliverySummary(latest);
    assert.match(summary, /SCARCITY/);
    assert.match(summary, /tightness-upshift/);
  });
});
