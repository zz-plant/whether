import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
  buildWeeklyOperatorBriefSlackBlocks,
  buildWeeklyOperatorBriefCardText,
  buildWeeklyCallSnapshotPlainText,
} from "../lib/export/weeklyOperatorBrief";
import { getClipboardUiState } from "../app/components/useClipboardCopy";
import { buildAssessmentFixture, buildTreasuryFixture } from "./fixtures/reportFixtures";

const assessment = buildAssessmentFixture({
  scores: { riskAppetite: 34, curveSlope: -0.3 },
  diagnostics: { tightnessDelta: 1, riskAppetiteDelta: -1, confidence: "HIGH" },
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

describe("weekly operator brief export adapters", () => {
  it("standardizes the payload contract fields", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      postureWithStageLabel: "Defensive · Late Cycle",
      confidenceLabel: "HIGH",
    });

    assert.equal(payload.date, "2026-03-06");
    assert.equal(payload.regimeStage, "Defensive · Late Cycle");
    assert.equal(payload.confidence, "HIGH confidence");
    assert.ok(payload.doNowBullets.length > 0);
    assert.ok(payload.whyCouldBeWrong.length > 0);
    assert.ok(payload.flipTrigger.length > 0);
  });

  it("renders plain text and image/PDF card text adapters", () => {
    const payload = buildWeeklyOperatorBriefPayload({ assessment, treasury, confidenceLabel: "MED" });
    const text = buildWeeklyOperatorBriefPlainText(payload);
    const cardText = buildWeeklyOperatorBriefCardText(payload);

    assert.match(text, /Weekly Operator Brief — 2026-03-06/);
    assert.match(text, /Regime \+ stage:/);
    assert.match(text, /Do now:/);
    assert.match(text, /Why this could be wrong:/);
    assert.match(text, /What would change our mind:/);
    assert.match(text, /Change course if:/);
    assert.equal(cardText, text);
  });

  it("renders Slack blocks adapter with required sections", () => {
    const payload = buildWeeklyOperatorBriefPayload({ assessment, treasury, confidenceLabel: "LOW" });
    const blocksJson = buildWeeklyOperatorBriefSlackBlocks(payload);
    const parsed = JSON.parse(blocksJson) as { blocks: Array<{ type: string }> };

    assert.equal(parsed.blocks[0]?.type, "header");
    assert.ok(parsed.blocks.some((block) => block.type === "section"));
    assert.ok(parsed.blocks.some((block) => block.type === "context"));
  });

  it("removes flip trigger duplication from canonical flip conditions", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "MED",
      canonicalDecisionCopy: {
        currentRegimeLabel: "Defensive",
        operatingCall: "Protect runway.",
        doNowLines: ["Hold fixed burn."],
        flipTrigger: "Tightness < 65",
        flipConditions: ["Tightness < 65", "Risk appetite > 50", "Yield curve steepens"],
      },
    });

    assert.deepEqual(payload.flipConditionLabels, ["Risk appetite > 50", "Yield curve steepens"]);
    const text = buildWeeklyOperatorBriefPlainText(payload);
    assert.doesNotMatch(text, /Flip conditions:\n• Tightness < 65/);
  });

});


describe("weekly call snapshot export", () => {
  it("renders sections in decision-first order with bulleted flip conditions", () => {
    const text = buildWeeklyCallSnapshotPlainText({
      regime: "Defensive — Late Cycle",
      call: "Hold approval velocity and protect runway.",
      trend: "Deteriorating",
      confidence: "74% (MED)",
      doNow: "Ship only reversible roadmap items.",
      avoid: "Pause net-new fixed burn commitments.",
      watch: "Track threshold pressure near regime boundary.",
      flipConditions: [
        "Resume hiring when risk appetite clears 50 for two weekly reads.",
        "Release expansion spend after tightness falls below 70 and holds.",
      ],
    });

    assert.match(text, /REGIME: Defensive — Late Cycle/);
    assert.match(text, /CALL: Hold approval velocity and protect runway\./);
    assert.match(text, /DO NOW: Ship only reversible roadmap items\./);
    assert.match(text, /AVOID: Pause net-new fixed burn commitments\./);
    assert.match(text, /WATCH: Track threshold pressure near regime boundary\./);
    assert.match(text, /FLIP CONDITIONS:\n• Resume hiring when risk appetite clears 50 for two weekly reads\.\n• Release expansion spend after tightness falls below 70 and holds\./);
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
