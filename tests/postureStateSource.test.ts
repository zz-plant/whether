import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { buildPostureState } from "../lib/report/postureStateSource";
import {
  resetPostureDecisionEventRepository,
  type PostureDecisionEventRepository,
} from "../lib/storage/postureDecisionEventRepository";
import type { RegimeAssessment } from "../lib/regimeEngine";

const committedAssessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  regimeTransition: {
    nextState: "DEFENSIVE",
    candidateState: "DEFENSIVE",
    committed: true,
    pending: false,
    transitionReason: "Tightness crossed above 70.",
    transitionPendingCount: 1,
    snapshot: {
      committedState: "VOLATILE",
      pendingState: null,
      pendingCount: 0,
      lastSignals: { tightness: 72, riskAppetite: 45 },
    },
  },
  scores: { tightness: 72, riskAppetite: 45, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.2 },
  diagnostics: {
    tightnessVsThreshold: 2,
    riskAppetiteVsThreshold: -5,
    nearestThresholdDelta: 7,
    confidence: "MEDIUM",
    transitionWatch: true,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: [],
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

describe("posture state source", () => {
  let repository: PostureDecisionEventRepository;

  beforeEach(() => {
    repository = resetPostureDecisionEventRepository();
  });

  it("builds posture state without mutating events", async () => {
    const before = (await repository.list({ limit: 64 })).events.length;
    const posture = await buildPostureState({
      record: { record_date: "2026-03-08" },
      assessment: committedAssessment,
      reportDynamics: { directionLabel: "deteriorating" },
      repository,
    });

    assert.equal((await repository.list({ limit: 64 })).events.length, before);
    assert.equal(posture.currentState.regime, "DEFENSIVE");
  });

  /*
   * A durable-store outage used to take down every page that renders the weekly
   * brief — nine routes at once — because the event log read threw straight
   * through buildPostureState. The log is supplementary; posture itself does not
   * depend on it.
   */
  it("still builds posture state when the event store cannot be read", async () => {
    const failing: PostureDecisionEventRepository = {
      ...repository,
      list: async () => {
        throw new Error("internal error; reference = kv-outage");
      },
    };

    const posture = await buildPostureState({
      record: { record_date: "2026-03-08" },
      assessment: committedAssessment,
      reportDynamics: { directionLabel: "deteriorating" },
      repository: failing,
    });

    assert.equal(posture.currentState.regime, "DEFENSIVE");
    // Falls back to the state machine rather than claiming an event it cannot read.
    assert.equal(posture.lastCommittedChangeEvent.source, "state-machine");
  });
});
