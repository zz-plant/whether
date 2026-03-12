import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCanonicalDecisionCopy } from "../lib/report/canonicalDecisionCopy";
import { buildWeeklyCallSnapshotPlainText, buildWeeklyOperatorBriefPayload } from "../lib/export/weeklyOperatorBrief";
import type { PostureStateContract } from "../lib/report/postureStateContract";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const postureState: PostureStateContract = {
  currentState: {
    regime: "DEFENSIVE",
    postureLabel: "Defensive",
    confidenceLabel: "MED",
    confidencePercent: 72,
    transitionWatch: "ON",
    recordDate: "2026-03-04",
  },
  lastCommittedChangeEvent: {
    timestamp: "2026-03-04T00:00:00.000Z",
    fromState: "VOLATILE",
    toState: "DEFENSIVE",
    reason: "Boundary pressure increased.",
    source: "state-machine",
  },
  whatFlipsNext: {
    flipTrigger: "Risk appetite clears 50 for two weekly reads.",
    thresholds: [
      "Risk appetite clears 50 for two weekly reads.",
      "Tightness falls below 70 and holds for one refresh.",
    ],
    reversalConditions: ["Tightness falls below 70 and holds for one refresh."],
  },
};

const homeBriefModelFixture = {
  postureWithStageLabel: "Defensive — Late Cycle",
  postureLabel: "Defensive",
  operatingStanceLine: "Hold approval velocity and protect runway.",
  actionNowShort: "Ship only reversible roadmap items.",
  guardrail: "Pause net-new fixed burn commitments.",
  compactFlipConditionLabels: ["Risk appetite clears 50 for two weekly reads."],
  decisionRules: [
    { resumeTrigger: "Risk appetite clears 50 for two weekly reads." },
    { resumeTrigger: "Tightness falls below 70 and holds for one refresh." },
  ],
};

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

describe("canonical decision copy", () => {
  it("keeps homepage command bar and export surfaces on identical core phrases", () => {
    const canonicalCopy = buildCanonicalDecisionCopy({
      homeBriefModel: homeBriefModelFixture,
      postureState,
    });

    const commandBar = {
      call: canonicalCopy.currentRegimeLabel,
      doNow: canonicalCopy.doNowLines,
      flipConditions: canonicalCopy.flipConditions,
    };

    const operatorPayload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      canonicalDecisionCopy: canonicalCopy,
    });

    const snapshotText = buildWeeklyCallSnapshotPlainText({
      regime: canonicalCopy.currentRegimeLabel,
      call: canonicalCopy.operatingCall,
      trend: "Mixed",
      confidence: "72% (MED)",
      doNow: canonicalCopy.doNowLines[0] ?? "",
      avoid: canonicalCopy.doNowLines[1] ?? "",
      watch: canonicalCopy.flipTrigger,
      flipConditions: canonicalCopy.flipConditions,
    });

    assert.equal(commandBar.call, operatorPayload.regimeStage);
    assert.deepEqual(commandBar.doNow, operatorPayload.doNowBullets);
    assert.equal(operatorPayload.flipTrigger, canonicalCopy.flipTrigger);
    assert.deepEqual(commandBar.flipConditions, operatorPayload.flipConditionLabels);
    assert.match(snapshotText, /REGIME: Defensive — Late Cycle/);
    assert.match(snapshotText, /CALL: Hold approval velocity and protect runway\./);
    assert.match(snapshotText, /DO NOW: Ship only reversible roadmap items\./);
    assert.match(snapshotText, /WATCH: Risk appetite clears 50 for two weekly reads\./);
    assert.match(snapshotText, /• Tightness falls below 70 and holds for one refresh\./);
  });
});
