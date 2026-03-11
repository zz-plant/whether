import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWeeklyOperatorBriefPayload,
  buildWeeklyOperatorBriefPlainText,
  buildWeeklyOperatorBriefSlackBlocks,
  buildWeeklyOperatorBriefCardText,
  buildWeeklyCallSnapshotPlainText,
} from "../lib/export/weeklyOperatorBrief";
import { getClipboardUiState } from "../app/components/useClipboardCopy";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: { tightness: 72, riskAppetite: 34, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.3 },
  diagnostics: {
    tightnessDelta: 1,
    riskAppetiteDelta: -1,
    nearestThresholdDelta: 2,
    confidence: "HIGH",
    transitionWatch: true,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Freeze non-essential hiring", "Gate roadmap spend", "Preserve runway"],
  tightnessExplanation: "",
  riskAppetiteExplanation: "",
  dataWarnings: [],
  thresholds: { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 },
  inputs: [],
  policyAssessment: {
    version: "v1",
    normalizations: [],
    composites: { cts: 0, ras: 0 },
    posture: "SAFETY_MODE",
    band: "TIGHT",
    confidenceIndex: { agreement: 0, distanceFromNeutral: 0, volatility30d: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "STRICT",
      paybackWindowTolerance: "SHORTER",
      rollbackRequirement: "STRICT",
      approvalVelocity: "SLOWER",
      expansionScope: "NARROW",
      experimentationTolerance: "LOW",
    },
  },
};

const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-04",
  fetched_at: "2026-03-04T00:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 5.2, threeMonth: 5.1, twoYear: 4.7, tenYear: 4.4 },
};

describe("weekly operator brief export adapters", () => {
  it("standardizes the payload contract fields", () => {
    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      postureWithStageLabel: "Defensive · Late Cycle",
      confidenceLabel: "HIGH",
    });

    assert.equal(payload.date, "2026-03-04");
    assert.equal(payload.regimeStage, "Defensive · Late Cycle");
    assert.equal(payload.confidence, "HIGH confidence");
    assert.ok(payload.doNowBullets.length > 0);
    assert.ok(payload.flipTrigger.length > 0);
  });

  it("renders plain text and image/PDF card text adapters", () => {
    const payload = buildWeeklyOperatorBriefPayload({ assessment, treasury, confidenceLabel: "MED" });
    const text = buildWeeklyOperatorBriefPlainText(payload);
    const cardText = buildWeeklyOperatorBriefCardText(payload);

    assert.match(text, /Weekly Operator Brief — 2026-03-04/);
    assert.match(text, /Regime \+ stage:/);
    assert.match(text, /Do now:/);
    assert.match(text, /Flip trigger:/);
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
