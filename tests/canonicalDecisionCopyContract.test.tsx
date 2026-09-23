import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildCanonicalDecisionCopy, buildFlipConditionsWithoutTriggerDuplication } from "../lib/report/canonicalDecisionCopy";
import { buildWeeklyOperatorBriefPayload, buildWeeklyCallSnapshotPlainText } from "../lib/export/weeklyOperatorBrief";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";
import type { PostureStateContract } from "../lib/report/postureStateContract";

const assessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: { tightness: 72, riskAppetite: 42, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.3 },
  diagnostics: {
    tightnessVsThreshold: 1,
    riskAppetiteVsThreshold: -1,
    nearestThresholdDelta: 4,
    confidence: "MEDIUM",
    transitionWatch: true,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Preserve runway"],
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
    band: "ELEVATED",
    confidenceIndex: { signalDisagreement: 0, distanceFromNeutral: 0, signalDispersion: 0 },
    refusal: { refused: false, reasons: [] },
    governanceParameters: {
      hiringThreshold: "VERY_HIGH",
      paybackWindowTolerance: "SHORTER",
      rollbackRequirement: "REVERSIBLE_ONLY",
      approvalVelocity: "SLOWER_STRUCTURED",
      expansionScope: "CONSTRAINED",
      experimentationTolerance: "LOW",
    },
  },
};

const treasury: TreasuryData = {
  source: "https://fred.stlouisfed.org",
  record_date: "2026-03-07",
  fetched_at: "2026-03-08T00:00:00.000Z",
  isLive: true,
  yields: { oneMonth: 5.2, threeMonth: 5.1, twoYear: 4.7, tenYear: 4.4 },
};

const postureState: PostureStateContract = {
  currentState: {
    regime: "DEFENSIVE",
    postureLabel: "Cloudy",
    confidenceLabel: "MED",
    confidencePercent: 68,
    transitionWatch: "ON",
    recordDate: "2026-03-07",
  },
  lastCommittedChangeEvent: {
    timestamp: "2026-03-07T00:00:00.000Z",
    fromState: "VOLATILE",
    toState: "DEFENSIVE",
    reason: "Boundary pressure persisted",
    source: "state-machine",
  },
  whatFlipsNext: {
    flipTrigger: "Flip when tightness falls below 65 and holds.",
    thresholds: ["Tightness < 65", "Risk appetite > 50"],
    reversalConditions: ["Risk appetite > 50"],
  },
};

describe("canonical decision copy contract", () => {
  it("keeps command bar, snapshot, and export payload phrases identical for core decision lines", () => {
    // Decision transmission contract: all primary surfaces should reuse one canonical phrase set.
    const canonical = buildCanonicalDecisionCopy({
      homeBriefModel: {
        postureWithStageLabel: "Defensive — Watchful",
        postureLabel: "Cloudy",
        operatingStanceLine: "Stage approvals and protect runway.",
        actionNowShort: "Pause net-new fixed burn commitments this week.",
        actionStripItems: [
          { label: "Hiring", actionNow: "Keep hiring to critical backfills only." },
        ],
        guardrail: "Hold discretionary spend above 10k pending review.",
        canonicalFlipConditions: [
          { area: "hiring", metric: "tightness", operator: "<", value: 65, label: "Tightness < 65" },
        ],
        compactFlipConditionLabels: ["Tightness < 65", "Risk appetite > 50"],
      } as never,
      postureState,
    });

    const payload = buildWeeklyOperatorBriefPayload({
      assessment,
      treasury,
      postureWithStageLabel: "Defensive — Watchful",
      confidenceLabel: "MED",
      postureState,
      canonicalDecisionCopy: canonical,
    });

    const snapshot = buildWeeklyCallSnapshotPlainText({
      regime: canonical.currentRegimeLabel,
      call: canonical.operatingCall,
      trend: "Deteriorating",
      confidence: "68% (MED)",
      doNow: canonical.doNowLines[0],
      avoid: "Avoid irreversible expansion",
      watch: canonical.flipTrigger,
      flipConditions: canonical.flipConditions,
    });

    assert.equal(payload.regimeStage, canonical.currentRegimeLabel);
    assert.equal(payload.doNowBullets[0], canonical.doNowLines[0]);
    assert.equal(payload.flipTrigger, canonical.flipTrigger);
    assert.equal(payload.flipConditionLabels[0], canonical.flipConditions[0]);
    assert.match(snapshot, /CONDITIONS: Defensive — Watchful/);
    assert.match(snapshot, /GUIDANCE: Stage approvals and protect runway\./);
    assert.match(snapshot, /DO NOW: Pause net-new fixed burn commitments this week\./);
    assert.match(snapshot, /CONDITIONS CHANGE IF: Flip when tightness falls below 65 and holds\./);
  });

  it("keeps command bar flip list unique when canonical conditions include the trigger", () => {
    const postureStateWithDuplicatedThreshold: PostureStateContract = {
      ...postureState,
      whatFlipsNext: {
        ...postureState.whatFlipsNext,
        thresholds: [
          "Flip when tightness falls below 65 and holds.",
          "Risk appetite > 50",
          "Yield curve re-steepens",
          "Credit spreads normalize",
        ],
      },
    };

    const canonical = buildCanonicalDecisionCopy({
      homeBriefModel: {
        postureWithStageLabel: "Defensive — Watchful",
        postureLabel: "Cloudy",
        operatingStanceLine: "Stage approvals and protect runway.",
        actionNowShort: "Pause net-new fixed burn commitments this week.",
        actionStripItems: [{ label: "Hiring", actionNow: "Keep hiring to critical backfills only." }],
        guardrail: "Hold discretionary spend above 10k pending review.",
        canonicalFlipConditions: [
          {
            area: "hiring",
            metric: "tightness",
            operator: "<",
            value: 65,
            label: "Flip when tightness falls below 65 and holds.",
          },
        ],
        compactFlipConditionLabels: [
          "Flip when tightness falls below 65 and holds.",
          "Risk appetite > 50",
          "Yield curve re-steepens",
          "Credit spreads normalize",
        ],
      } as never,
      postureState: postureStateWithDuplicatedThreshold,
    });

    const commandBarFlipConditions = [
      canonical.flipTrigger,
      ...buildFlipConditionsWithoutTriggerDuplication({
        flipTrigger: canonical.flipTrigger,
        flipConditions: canonical.flipConditions,
        maxItems: 3,
      }),
    ];

    assert.deepEqual(commandBarFlipConditions, [
      "Flip when tightness falls below 65 and holds.",
      "Risk appetite > 50",
      "Yield curve re-steepens",
      "Credit spreads normalize",
    ]);
  });

});
