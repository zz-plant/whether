import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildAgentPayload, buildAgentPrompt } from "../lib/agentHandoff";

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
            { key: "tightness", label: "Cash availability", delta: 2 },
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
