import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { buildPostureStateContract } from "../lib/report/postureStateContract";
import { buildWeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import { buildFlipConditionsWithoutTriggerDuplication } from "../lib/report/canonicalDecisionCopy";
import { buildWeeklyMandateEnvelope } from "../lib/integrationBriefs";
import { buildPostureTransitionEvent } from "../lib/storage/postureTransitionEventRepository";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  regimeTransition: {
    nextState: "DEFENSIVE",
    candidateState: "DEFENSIVE",
    committed: false,
    pending: false,
    transitionReason: "No threshold crossing changed the committed state.",
    snapshot: {
      committedState: "DEFENSIVE",
      pendingState: null,
      pendingCount: 0,
      lastSignals: { tightness: 72, riskAppetite: 48 },
    },
  },
  scores: { tightness: 72, riskAppetite: 48, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.1 },
  diagnostics: {
    tightnessDelta: 2,
    riskAppetiteDelta: -2,
    nearestThresholdDelta: 2,
    confidence: "LOW",
    transitionWatch: true,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Cut low-leverage experiments."],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "policy-v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "TRANSITION",
    band: "NEUTRAL",
    confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
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
};

const treasury = {
  source: "https://example.com",
  record_date: "2026-03-01",
  fetched_at: "2026-03-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 5.2, twoYear: 4.6, tenYear: 4.5 },
} as TreasuryData;

describe("posture state contract consumers", () => {
  it("keeps homepage, exports, and integration envelope aligned", () => {
    const postureState = buildPostureStateContract({
      assessment,
      recordDate: treasury.record_date,
      postureLabel: "Contraction",
      decisionEventStore: [
        buildPostureTransitionEvent({
          id: "evt_1",
          recordedAt: "2026-03-01T10:00:00Z",
          effectiveRecordDate: treasury.record_date,
          idempotencyKey: `${treasury.record_date}:DEFENSIVE`,
          fromState: "VOLATILE",
          toState: "DEFENSIVE",
          reason: "Tightness crossed above 70.",
        }),
      ],
    });

    const homeBriefModel = buildHomeBriefModel({
      assessment,
      stopItems: ["Guardrail"],
      regimeAlert: { previousRegime: "VOLATILE" },
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "tightness", delta: 2 }],
        anomalySignals: [],
      },
      postureState,
    });

    const operatorBrief = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      postureState,
      postureWithStageLabel: homeBriefModel.postureWithStageLabel,
      confidenceLabel: homeBriefModel.confidenceLabel,
      actionStripItems: homeBriefModel.actionStripItems,
      flipConditionLabels: homeBriefModel.compactFlipConditionLabels,
    });

    const envelope = buildWeeklyMandateEnvelope(assessment, treasury, postureState);

    assert.equal(homeBriefModel.confidenceLabel, postureState.currentState.confidenceLabel);
    assert.equal(homeBriefModel.flipThreshold, postureState.whatFlipsNext.flipTrigger);
    assert.equal(operatorBrief.flipTrigger, postureState.whatFlipsNext.flipTrigger);
    assert.equal(envelope.lastChange.timestamp, postureState.lastCommittedChangeEvent.timestamp);
    assert.equal(envelope.lastChange.reason, postureState.lastCommittedChangeEvent.reason);
    assert.deepEqual(
      operatorBrief.flipConditionLabels,
      buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger: postureState.whatFlipsNext.flipTrigger,
        flipConditions: homeBriefModel.compactFlipConditionLabels,
      }),
    );
  });
});

describe("posture state contract under a held call", () => {
  it("carries the pending transition the machine is holding", () => {
    // 2026-09-15: committed EXPANSION, candidate SCARCITY at 1/2. The contract
    // reported regime EXPANSION and transition watch OFF, with nothing to say the
    // readings had already crossed.
    const held: RegimeAssessment = {
      ...assessment,
      regime: "EXPANSION",
      scores: { ...assessment.scores, tightness: 77, riskAppetite: 42 },
      diagnostics: { ...assessment.diagnostics, nearestThresholdDelta: 7, confidence: "MEDIUM", transitionWatch: false },
      regimeTransition: {
        nextState: "EXPANSION",
        candidateState: "SCARCITY",
        committed: false,
        pending: true,
        transitionReason: "Risk appetite crossed below 50. Transition pending confidence gate (1/2).",
        transitionPendingCount: 1,
        snapshot: { committedState: "EXPANSION", pendingState: "SCARCITY", pendingCount: 1 },
      },
    };

    const postureState = buildPostureStateContract({
      assessment: held,
      recordDate: "2026-09-11",
      postureLabel: "Sunny",
      decisionEventStore: [],
    });

    assert.equal(postureState.currentState.regime, "EXPANSION");
    assert.equal(postureState.currentState.transitionWatch, "OFF");
    assert.deepEqual(postureState.pendingTransition, {
      candidate: "SCARCITY",
      candidateLabel: "Freezing",
      pendingCount: 1,
      confidenceBlocked: false,
      reason: "Risk appetite crossed below 50. Transition pending confidence gate (1/2).",
    });
  });

  it("reports null when the readings agree with the call", () => {
    const postureState = buildPostureStateContract({
      assessment,
      recordDate: "2026-03-01",
      postureLabel: "Cloudy",
      decisionEventStore: [],
    });

    assert.equal(postureState.pendingTransition, null);
  });
});
