import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
} from "../lib/export/weeklyOperatorBrief";
import type { WeeklyCallContract } from "../lib/report/weeklyCallContract";
import { getClipboardUiState } from "../app/components/useClipboardCopy";
import { buildAssessmentFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";

const assessment = buildAssessmentFixture({
  scores: { riskAppetite: 34, curveSlope: -0.3 },
  diagnostics: { tightnessVsThreshold: 1, riskAppetiteVsThreshold: -1, confidence: "HIGH" },
  constraints: ["Freeze non-essential hiring", "Gate roadmap spend", "Preserve runway"],
  policyAssessment: {
    version: "v1",
    posture: "SAFETY_MODE",
    band: "ELEVATED",
    governanceParameters: {
      hiringThreshold: "VERY_HIGH",
      paybackWindowTolerance: "SHORTER",
      rollbackRequirement: "REVERSIBLE_ONLY",
      approvalVelocity: "SLOWER_STRUCTURED",
      expansionScope: "CONSTRAINED",
      experimentationTolerance: "LOW",
    },
  },
});

const treasury = buildTreasuryFixture({
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-04",
  fetched_at: "2026-03-04T00:00:00.000Z",
  yields: { oneMonth: 5.1, twoYear: 4.7, tenYear: 4.4 },
});

/* The contract every production caller passes; the payload is a projection of it. */
const weeklyCall: WeeklyCallContract = {
  regimeStage: "Defensive · Late Cycle",
  currentCall: "Stage approvals and protect runway.",
  actionNow: "Pause net-new fixed burn commitments this week.",
  pauseIf: "Pause net-new hiring if funding pressure rises above 76",
  callChangesIf: "Funding pressure at or below 70",
  doNowBullets: ["Pause net-new fixed burn commitments this week.", "Ship only reversible roadmap items."],
  flipConditionLabels: ["Risk appetite > 50", "Yield curve steepens"],
  whyCouldBeWrong: "Confidence is not high; near-threshold moves can reverse quickly.",
  policyOverrideActive: false,
  policyOverrideReason: null,
};

describe("weekly operator brief export adapters", () => {
  it("projects the weekly call contract, slot for slot", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      weeklyCall,
      weeklyLeadershipSummary: {
        boldnessScore: 42,
        boldnessDelta: -3,
        shorthandLine: "The call moved slightly more defensive this week.",
      },
    });

    assert.equal(payload.date, "2026-03-06");
    assert.equal(payload.regimeStage, "Defensive · Late Cycle");
    assert.deepEqual(payload.boldnessBudget, {
      score: 42,
      delta: -3,
      line: "The call moved slightly more defensive this week.",
    });
    // Two points above the tightness line: the published band is Low, whatever
    // the fixture's engine code says.
    assert.equal(payload.confidence, "Low confidence");
    // The paste line adds what the weather means; the contract field stays the modeled label.
    assert.match(payload.conditions, /^Defensive · Late Cycle \(money is [a-z ]+\)$/);
    assert.equal(payload.currentCall, weeklyCall.currentCall);
    assert.equal(payload.actionNow, weeklyCall.actionNow);
    assert.equal(payload.pauseIf, weeklyCall.pauseIf);
    assert.equal(payload.callChangesIf, weeklyCall.callChangesIf);
    assert.deepEqual(payload.doNowBullets, weeklyCall.doNowBullets);
    assert.deepEqual(payload.flipConditionLabels, weeklyCall.flipConditionLabels);
    assert.equal(payload.resumeWhen, undefined, "no stage, no resume line");
  });

  it("renders the plain text in the page's order", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      weeklyCall,
      weeklyLeadershipSummary: {
        boldnessScore: 58,
        boldnessDelta: 4,
        shorthandLine: "The call moved more aggressive this week.",
      },
    });
    const text = buildWeeklyOperatorBriefPlainText(payload);

    assert.match(text, /Weekly Operator Brief — 2026-03-06/);
    // The number never travels without what it measures.
    assert.match(text, /Operating latitude: 58\/100 \(room to hire, spend and commit; higher means more room\) · vs last week: \+4 points/);
    assert.match(text, /^Low confidence$/m);
    assert.doesNotMatch(text, /\bLOW\b|Boldness/);
    assert.ok(text.indexOf("Operating latitude:") < text.indexOf("Conditions:"));
    assert.match(text, /Conditions:/);
    assert.match(text, /^Guidance: Stage approvals and protect runway\.$/m);
    assert.match(text, /^Do now: Pause net-new fixed burn commitments this week\.$/m);
    // The pause line under its label carries the condition only, not the rule's own verb.
    assert.match(text, /^Pause if: Funding pressure rises above 76$/m);
    assert.match(text, /Why this could be wrong:/);
    // The change condition sits under the label every other surface gives it.
    assert.match(text, /^Conditions change if: Funding pressure at or below 70$/m);
    assert.match(text, /Also this week:\n• Ship only reversible roadmap items\./);
    assert.match(text, /Other things that would change this guidance:\n• Risk appetite > 50\n• Yield curve steepens/);
  });

  it("prints a stage's resume line beside the call-change line, never in its place", () => {
    const text = buildWeeklyOperatorBriefPlainText(
      buildWeeklyOperatorBriefPayload({
        assessment,
        treasury,
        weeklyCall: { ...weeklyCall, resumeWhen: "Two weekly reads below the pause line" },
      }),
    );

    assert.match(text, /^Conditions change if: Funding pressure at or below 70\nResume when: Two weekly reads below the pause line$/m);
  });

  it("names the reading the latitude move is measured against, where the week records one", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      weeklyCall,
      weeklyLeadershipSummary: {
        boldnessScore: 33,
        boldnessDelta: -17,
        shorthandLine: "This week's guidance is sharply more defensive.",
        comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
      },
    });
    const text = buildWeeklyOperatorBriefPlainText(payload);

    assert.deepEqual(payload.boldnessBudget?.comparedWith, { recordDate: "2026-08-31", label: "Aug 31" });
    assert.match(text, /higher means more room\) · vs Aug 31: -17 points/);
    assert.doesNotMatch(text, /vs last week/);
  });

  it("embeds customTeamNote when provided", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      weeklyCall,
      customTeamNote: "All-hands update: hold Q3 designer headcount open until Sep 15.",
    });
    const text = buildWeeklyOperatorBriefPlainText(payload);

    assert.match(text, /Team context: All-hands update: hold Q3 designer headcount open until Sep 15\./);
  });
});

describe("clipboard UX state for export actions", () => {
  it("returns copied state for successful target", () => {
    const state = getClipboardUiState("Weekly operator brief", {
      status: "copied",
      error: false,
      activeTarget: null,
      copiedTarget: "Weekly operator brief",
    });
    assert.equal(state, "copied");
  });

  it("returns error state for clipboard failure", () => {
    const state = getClipboardUiState("Weekly operator brief", {
      status: "error",
      error: true,
      activeTarget: null,
      copiedTarget: null,
    });
    assert.equal(state, "error");
  });
});
