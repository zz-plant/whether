import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { appendCommittedPostureEvent, buildPostureState } from "../lib/report/postureStateSource";
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
    tightnessDelta: 2,
    riskAppetiteDelta: -5,
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
};

describe("posture state source", () => {
  let repository: PostureDecisionEventRepository;

  beforeEach(() => {
    repository = resetPostureDecisionEventRepository();
  });

  it("builds posture state without mutating events", async () => {
    const before = (await repository.list({ limit: 64 })).events.length;
    const posture = await buildPostureState({
      recordDate: "2026-03-08",
      assessment: committedAssessment,
      reportDynamics: { directionLabel: "deteriorating" },
      repository,
    });

    assert.equal((await repository.list({ limit: 64 })).events.length, before);
    assert.equal(posture.currentState.regime, "DEFENSIVE");
  });

  it("appends committed events with deterministic timestamps and idempotency", async () => {
    const first = await appendCommittedPostureEvent({
      recordDate: "2026-03-08",
      sourceIngestedAt: "2026-03-08T10:30:00Z",
      assessment: committedAssessment,
      previousRegime: "VOLATILE",
      repository,
    });

    assert.equal(first.appended, true);
    assert.equal(first.event?.recordedAt, "2026-03-08T10:30:00.000Z");
    assert.equal(first.event?.idempotencyKey, "2026-03-08:DEFENSIVE");
    assert.equal(first.event?.eventId.length ? true : false, true);

    const second = await appendCommittedPostureEvent({
      recordDate: "2026-03-08",
      sourceIngestedAt: "2026-03-08T10:30:00Z",
      assessment: committedAssessment,
      previousRegime: "VOLATILE",
      repository,
    });

    assert.equal(second.appended, false);
    assert.equal((await repository.list({ limit: 64 })).events.length, 1);
  });
});
