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
    assert.equal(payload.confidence, "HIGH confidence");
    assert.ok(payload.doNowBullets.length > 0);
    assert.ok(payload.whyCouldBeWrong.length > 0);
    assert.ok(payload.flipTrigger.length > 0);
  });

  it("renders plain text and image/PDF card text adapters", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "MED",
      weeklyLeadershipSummary: {
        boldnessScore: 58,
        boldnessDelta: 4,
        shorthandLine: "The call moved more aggressive this week.",
      },
    });
    const text = buildWeeklyOperatorBriefPlainText(payload);
    const cardText = buildWeeklyOperatorBriefCardText(payload);

    assert.match(text, /Weekly Operator Brief — 2026-03-06/);
    assert.match(text, /Boldness Budget: 58\/100 \(\+4 vs last week\)/);
    assert.ok(text.indexOf("Boldness Budget:") < text.indexOf("Posture:"));
    assert.match(text, /Posture:/);
    assert.match(text, /Posture:/); // replaces Forecast
    assert.match(text, /Do now:/);
    assert.match(text, /Pause if:/); // replaces Watch for
    assert.match(text, /Why this could be wrong:/);
    assert.match(text, /Re-open when:/); // replaces Clears when
    assert.equal(cardText, text);
  });

  it("renders Slack blocks adapter with required sections", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "LOW",
      weeklyLeadershipSummary: {
        boldnessScore: 58,
        boldnessDelta: 0,
        shorthandLine: "The call is holding steady this week.",
      },
    });
    const blocksJson = buildWeeklyOperatorBriefSlackBlocks(payload);
    const parsed = JSON.parse(blocksJson) as { blocks: Array<{ type: string }> };

    assert.equal(parsed.blocks[0]?.type, "header");
    assert.ok(blocksJson.includes("Boldness Budget"));
    assert.ok(parsed.blocks.some((block) => block.type === "section"));
    assert.ok(parsed.blocks.some((block) => block.type === "context"));
  });

  it("falls back to non-canonical flip text when canonical copy is unavailable", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "MED",
      flipConditionLabels: ["Tightness < 65", "Risk appetite > 50"],
    });

    assert.equal(payload.flipTrigger, "Tightness < 65");
    assert.deepEqual(payload.flipConditionLabels, ["Tightness < 65", "Risk appetite > 50"]);
    assert.equal(payload.doNowBullets.length > 0, true);
  });

  it("removes flip trigger duplication from canonical flip conditions", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "MED",
      canonicalDecisionCopy: {
        currentRegimeLabel: "Cloudy",
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

  it("embeds customTeamNote when provided in plain text and Slack blocks", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      confidenceLabel: "HIGH",
      customTeamNote: "All-hands update: hold Q3 designer headcount open until Sep 15.",
    });
    const text = buildWeeklyOperatorBriefPlainText(payload);
    const slackJson = buildWeeklyOperatorBriefSlackBlocks(payload);

    assert.match(text, /Team context: All-hands update: hold Q3 designer headcount open until Sep 15\./);
    assert.match(slackJson, /\*Team Context\*/);
    assert.match(slackJson, /All-hands update: hold Q3 designer headcount open until Sep 15\./);
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
