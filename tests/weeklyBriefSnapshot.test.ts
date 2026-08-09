import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildPostureStateContract } from "../lib/report/postureStateContract";
import { buildWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot";
import {
  buildAssessmentFixture,
  buildReportDataFixture,
  buildTreasuryFixture,
} from "./fixtures/reportFixtures";

const assessment = buildAssessmentFixture();
const treasury = buildTreasuryFixture();
const reportData = buildReportDataFixture({
  fetchedAtLabel: "2026-03-01T00:00:00Z",
});

describe("buildWeeklyBriefSnapshot", () => {
  it("builds a usable baseline snapshot without posture state", () => {
    const snapshot = buildWeeklyBriefSnapshot({
      reportData,
      degraded: false,
    });

    assert.equal(snapshot.canonicalDecisionCopy, null);
    assert.equal(snapshot.weeklyDecisionCardModel.status.statusLabel.length > 0, true);
    assert.equal(snapshot.trustStatus.trustStatusTone, "stable");
    assert.equal(snapshot.weeklyDecisionCardModel.decision.immediateDecision, snapshot.weeklyCall.actionNow);
    assert.equal(snapshot.weeklyDecisionCardModel.decision.guardrailThreshold, snapshot.weeklyCall.pauseIf);
    assert.equal(snapshot.weeklyDecisionCardModel.decision.flipThreshold, snapshot.weeklyCall.changeCourseIf);
  });

  it("enriches the snapshot when posture state is provided", () => {
    const postureState = buildPostureStateContract({
      assessment,
      recordDate: treasury.record_date,
      postureLabel: "Cloudy",
      decisionEventStore: [],
    });

    const snapshot = buildWeeklyBriefSnapshot({
      reportData,
      degraded: false,
      postureState,
    });

    assert.equal(snapshot.postureState, postureState);
    assert.ok(snapshot.canonicalDecisionCopy);
    assert.equal(snapshot.weeklyDecisionCardModel.decision.immediateDecision.length > 0, true);
    assert.match(snapshot.callCitation, /Whether Weekly Brief/);
  });
});
