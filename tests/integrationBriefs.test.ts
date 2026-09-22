import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildWeeklyMandateEnvelope,
  buildWeeklyMandatePayload,
  integrationTargets,
  parseIntegrationTarget,
} from "../lib/integrationBriefs";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { TreasuryData } from "../lib/types";

const assessment: RegimeAssessment = {
  regime: "DEFENSIVE",
  scores: { tightness: 72, riskAppetite: 48, baseRateUsed: "1M", baseRate: 5.2, curveSlope: -0.1 },
  diagnostics: {
    tightnessVsThreshold: 0,
    riskAppetiteVsThreshold: 0,
    nearestThresholdDelta: 0,
    confidence: "LOW",
    transitionWatch: false,
    intensity: "MILD",
    boundaryContributors: [],
    weakReadCount: 0,
    twoWeakReadsWarning: false,
  },
  description: "",
  constraints: ["Cut low-leverage experiments."],
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
};

const postureState = {
  currentState: {
    regime: "DEFENSIVE",
    postureLabel: "Contraction",
    confidenceLabel: "LOW",
    confidencePercent: 61,
    transitionWatch: "ON",
    recordDate: "2026-03-01",
  },
  lastCommittedChangeEvent: {
    timestamp: "2026-03-01T10:00:00Z",
    fromState: "VOLATILE",
    toState: "DEFENSIVE",
    reason: "Tightness crossed above 70.",
    source: "event-store",
  },
  whatFlipsNext: {
    flipTrigger: "Tightness ≤ 66 for 2 consecutive refreshes.",
    thresholds: ["Tightness ≤ 66 for 2 consecutive refreshes."],
    reversalConditions: ["Risk appetite ≥ 54 for 2 consecutive refreshes."],
  },
} as const;

const treasury = {
  source: "https://example.com",
  record_date: "2026-03-01",
  fetched_at: "2026-03-01T00:00:00Z",
  isLive: true,
  yields: { oneMonth: 5.2, twoYear: 4.6, tenYear: 4.5 },
} as TreasuryData;

describe("integration briefs", () => {
  it("parses only supported targets", () => {
    assert.equal(parseIntegrationTarget("slack"), "slack");
    assert.equal(parseIntegrationTarget("foo"), null);
    assert.deepEqual(integrationTargets, ["slack", "notion", "linear"]);
  });

  it("builds reusable envelope", () => {
    const envelope = buildWeeklyMandateEnvelope(assessment, treasury, postureState);
    assert.match(envelope.title, /weekly mandate/i);
    assert.match(envelope.markdown, /## Whether weekly mandate/);
    // Pasted with no page beside it: the scores carry their scale and the lines use the page's names.
    assert.match(envelope.summary, /Funding pressure 72\/100: money is hard to raise\./);
    assert.match(envelope.markdown, /Call changes if: /);
    assert.match(envelope.markdown, /- Resume when: Risk appetite/);
    assert.doesNotMatch(envelope.markdown, /flip|Reversal:|regime|DEFENSIVE/i);
  });

  it("builds slack payload", () => {
    const payload = buildWeeklyMandatePayload("slack", assessment, treasury, postureState) as { text: string; metadata: { regime: string } };
    assert.match(payload.text, /Whether weekly mandate/);
    assert.equal(payload.metadata.regime, "DEFENSIVE");
  });

  it("builds notion payload", () => {
    const payload = buildWeeklyMandatePayload("notion", assessment, treasury, postureState);
    // A database row a team reads: the weather word, not the engine key.
    assert.match(JSON.stringify(payload), /"Conditions":\{"select":\{"name":"Cloudy"\}\}/);
  });

  it("builds linear payload", () => {
    const payload = buildWeeklyMandatePayload("linear", assessment, treasury, postureState) as { labels: string[] };
    assert.ok(payload.labels.includes("cloudy"));
    assert.ok(!payload.labels.includes("defensive"));
  });
});
