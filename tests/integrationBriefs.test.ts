import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    tightnessDelta: 0,
    riskAppetiteDelta: 0,
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
};

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
    const envelope = buildWeeklyMandateEnvelope(assessment, treasury);
    assert.match(envelope.title, /weekly mandate/i);
    assert.match(envelope.markdown, /## Whether weekly mandate/);
  });

  it("builds slack payload", () => {
    const payload = buildWeeklyMandatePayload("slack", assessment, treasury) as { text: string; metadata: { regime: string } };
    assert.match(payload.text, /Whether weekly mandate/);
    assert.equal(payload.metadata.regime, "DEFENSIVE");
  });

  it("builds notion payload", () => {
    const payload = buildWeeklyMandatePayload("notion", assessment, treasury) as { properties: { Regime: { select: { name: string } } } };
    assert.equal(payload.properties.Regime.select.name, "DEFENSIVE");
  });

  it("builds linear payload", () => {
    const payload = buildWeeklyMandatePayload("linear", assessment, treasury) as { labels: string[] };
    assert.ok(payload.labels.includes("defensive"));
  });
});
