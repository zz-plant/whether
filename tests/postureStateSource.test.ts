import assert from "node:assert/strict";
import { beforeEach, describe, it } from "bun:test";
import { buildPostureState } from "../lib/report/postureStateSource";
import {
  resetPostureTransitionEventRepository,
  type PostureTransitionEventRepository,
} from "../lib/storage/postureTransitionEventRepository";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";

const committedAssessment = buildAssessmentFixture({
  regime: "DEFENSIVE",
  regimeTransition: {
    committed: true,
    transitionReason: "Tightness crossed above 70.",
    transitionPendingCount: 1,
    snapshot: { committedState: "VOLATILE", lastSignals: { tightness: 72, riskAppetite: 45 } },
  },
  scores: { tightness: 72, riskAppetite: 45, curveSlope: -0.2 },
  diagnostics: { riskAppetiteVsThreshold: -5, nearestThresholdDelta: 7, confidence: "MEDIUM" },
  constraints: [],
});

describe("posture state source", () => {
  let repository: PostureTransitionEventRepository;

  beforeEach(() => {
    repository = resetPostureTransitionEventRepository();
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
    const failing: PostureTransitionEventRepository = {
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
