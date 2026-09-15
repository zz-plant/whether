import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildAgentPayload, buildAgentPrompt } from "../lib/agentHandoff";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const assessment = {
  regime: "DEFENSIVE",
  scores: { tightness: 72, riskAppetite: 48, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.1 },
  diagnostics: {
    tightnessDelta: 2,
    riskAppetiteDelta: -3,
    nearestThresholdDelta: 2,
    confidence: "LOW",
    transitionWatch: true,
    intensity: "MILD",
    boundaryContributors: ["tightness near threshold"],
    weakReadCount: 2,
    twoWeakReadsWarning: true,
  },
  description: "Capital is expensive but risk appetite is moderate. Operate for efficiency.",
  constraints: ["Focus on margin expansion and retention."],
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
} as const;

const treasury = {
  source: "https://example.com",
  record_date: "2026-03-01",
  fetched_at: "2026-03-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 5.2, twoYear: 4.6, tenYear: 4.5 },
} as const;

const sensors = [
  {
    id: "BASE_RATE",
    label: "Base rate",
    value: 5.2,
    unit: "%",
    sourceUrl: "https://example.com/base-rate",
    record_date: "2026-03-01",
    fetched_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "CURVE_SLOPE",
    label: "Curve slope",
    value: -0.1,
    unit: "%",
    sourceUrl: "https://example.com/curve",
    record_date: "2026-03-01",
    fetched_at: "2026-03-01T00:00:00Z",
  },
] as any;

const macroSignals = [
  {
    id: "CPI_YOY",
    label: "CPI inflation (YoY)",
    value: 3.7,
    unit: "%",
    record_date: "2026-03-01",
    fetched_at: "2026-03-01T00:00:00Z",
    sourceUrl: "https://example.com/cpi",
  },
] as any;

describe("agent handoff contract", () => {
  it("adds decision delta, flip watch, and bounded decision rules to the payload", () => {
    const payload = buildAgentPayload(assessment as any, treasury as any, sensors, macroSignals, {
      decisionSupport: {
        reportDynamics: {
          changedSignals: [
            { key: "tightness", label: "Funding pressure", delta: 2 },
            { key: "riskAppetite", label: "Risk appetite", delta: -3 },
          ],
          directionLabel: "deteriorating",
          regimeChanged: false,
        },
        actionNowShort: "Tighten approvals now; keep new spend reversible.",
        startItems: ["Review discretionary spend approvals"],
        stopItems: ["Broad hiring expansion"],
        postureState: {
          currentState: {
            transitionWatch: "ON",
          },
          lastCommittedChangeEvent: {
            timestamp: "2026-03-01T10:00:00Z",
            fromState: "VOLATILE",
            toState: "DEFENSIVE",
            reason: "Tightness crossed above 70.",
            source: "event-store",
          },
          whatFlipsNext: {
            flipTrigger: "Tightness < 66 for 2 consecutive refreshes.",
            thresholds: [
              "Tightness < 66 for 2 consecutive refreshes.",
              "Risk appetite > 54 for 2 consecutive refreshes.",
            ],
            reversalConditions: ["Risk appetite > 54 for 2 consecutive refreshes."],
          },
        } as any,
      },
    });

    assert.deepEqual(
      payload.skills.map((skill) => skill.id),
      ["regime-summary", "decision-delta", "constraint-translation", "flip-watch", "pm-questions"],
    );
    assert.equal(payload.decision_delta?.summary, "Deteriorating weekly signal move. Tighten approvals now; keep new spend reversible.");
    assert.equal(payload.decision_delta?.changed_signals[0]?.decision_effect, "tighten");
    assert.equal(payload.decision_delta?.changed_signals[1]?.decision_effect, "tighten");
    assert.equal(payload.flip_watch?.transition_watch, "ON");
    assert.equal(payload.flip_watch?.flip_trigger, "Tightness < 66 for 2 consecutive refreshes.");
    assert.equal(payload.flip_watch?.two_weak_reads_warning, true);
    assert.ok(payload.decision_rules.some((rule) => rule.area === "burn-discipline"));
    assert.ok(payload.decision_rules.every((rule) => typeof rule.pause_trigger === "string"));
  });

  it("updates the prompt to request decision delta and flip watch outputs", () => {
    const prompt = buildAgentPrompt(assessment as any, treasury as any);

    assert.match(prompt, /decision delta/i);
    assert.match(prompt, /flip watchlist/i);
    assert.match(prompt, /5\) A short list of questions/);
  });
});

describe("flip watch under a held call", () => {
  /* 2026-09-15: readings sat in the Freezing quadrant (77 / 42) while the machine
     held Sunny behind its confirmation gate. `transition_watch` read OFF — the
     reading was 7 points past the nearest line, outside the near band — and the
     payload carried nothing that said a flip was one read away. */
  const policyAssessment: RegimeAssessment["policyAssessment"] = {
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
  };
  const heldAssessment: RegimeAssessment = {
    regime: "EXPANSION",
    regimeTransition: {
      nextState: "EXPANSION",
      candidateState: "SCARCITY",
      committed: false,
      pending: true,
      transitionReason: "Risk appetite crossed below 50. Transition pending confidence gate (1/2).",
      transitionPendingCount: 1,
      snapshot: {
        committedState: "EXPANSION",
        pendingState: "SCARCITY",
        pendingCount: 1,
        lastSignals: { tightness: 77, riskAppetite: 42 },
      },
    },
    scores: { tightness: 77, riskAppetite: 42, baseRateUsed: "1M", baseRate: 3.93, curveSlope: 0.33 },
    diagnostics: {
      tightnessDelta: 7,
      riskAppetiteDelta: -8,
      nearestThresholdDelta: 7,
      confidence: "MEDIUM",
      transitionWatch: false,
      intensity: "MILD",
      boundaryContributors: ["VC funding slowdown", "Tech layoff pressure"],
      weakReadCount: 2,
      twoWeakReadsWarning: true,
    },
    description: "Capital is available and financing conditions are supportive.",
    constraints: ["Prioritize reach and learning velocity over perfect finish."],
    tightnessExplanation: "",
    riskAppetiteExplanation: "",
    dataWarnings: [],
    thresholds: { baseRateTightness: 3.5, tightnessRegime: 70, riskAppetiteRegime: 50 },
    inputs: [],
    policyAssessment,
  };
  const confirmedAssessment: RegimeAssessment = {
    ...heldAssessment,
    regime: "SCARCITY",
    regimeTransition: {
      nextState: "SCARCITY",
      candidateState: "SCARCITY",
      committed: true,
      pending: false,
      transitionReason: "Risk appetite crossed below 50. Transition committed.",
      transitionPendingCount: 2,
      snapshot: {
        committedState: "SCARCITY",
        pendingState: null,
        pendingCount: 0,
        lastSignals: { tightness: 77, riskAppetite: 42 },
      },
    },
  };
  const treasuryData: TreasuryData = {
    source: "https://fred.stlouisfed.org/series/DGS1MO",
    record_date: "2026-09-11",
    fetched_at: "2026-09-15T02:01:00Z",
    isLive: true,
    yields: { oneMonth: 3.93, twoYear: 3.6, tenYear: 3.93 },
  };
  const decisionSupport: NonNullable<NonNullable<Parameters<typeof buildAgentPayload>[4]>["decisionSupport"]> = {
    reportDynamics: { changedSignals: [], directionLabel: "deteriorating", regimeChanged: false },
    actionNowShort: "Stage anything new.",
    startItems: [],
    stopItems: [],
    postureState: {
      currentState: {
        regime: "EXPANSION",
        postureLabel: "Sunny",
        confidenceLabel: "MED",
        confidencePercent: 76,
        transitionWatch: "OFF",
        recordDate: "2026-09-11",
      },
      lastCommittedChangeEvent: {
        timestamp: null,
        fromState: null,
        toState: "EXPANSION",
        reason: "No committed transition event in store.",
        source: "state-machine",
      },
      whatFlipsNext: {
        flipTrigger: "Funding pressure ≤ 66 for 2 consecutive refreshes.",
        thresholds: [],
        reversalConditions: [],
      },
    },
  };

  it("names the pending flip instead of reporting the watch as off", () => {
    const payload = buildAgentPayload(heldAssessment, treasuryData, sensors, macroSignals, { decisionSupport });

    assert.equal(payload.regime.key, "EXPANSION");
    assert.deepEqual(payload.flip_watch?.pending_transition, {
      candidate: "SCARCITY",
      candidate_label: "Freezing",
      pending_count: 1,
      reason: "Risk appetite crossed below 50. Transition pending confidence gate (1/2).",
    });
    assert.match(payload.flip_watch?.summary ?? "", /^Flip to Freezing is pending confirmation; the call holds at Sunny/);
    assert.match(payload.flip_watch?.summary ?? "", /Transition watch is OFF/);
  });

  it("reports no pending transition once the crossing has committed", () => {
    const payload = buildAgentPayload(confirmedAssessment, treasuryData, sensors, macroSignals, { decisionSupport });

    assert.equal(payload.regime.key, "SCARCITY");
    assert.equal(payload.flip_watch?.pending_transition, null);
    assert.match(payload.flip_watch?.summary ?? "", /^Transition watch is OFF/);
  });
});
