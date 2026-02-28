import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDeliverySummary,
  shouldCreateSignalAlert,
  type RegimeAlertEvent,
  type SignalAlertPayload,
} from "../lib/signalOps";
import { DEFAULT_THRESHOLDS, type RegimeAssessment } from "../lib/regimeEngine";

const assessment = (
  regime: RegimeAssessment["regime"],
  tightness: number,
  riskAppetite: number
): RegimeAssessment => ({
  regime,
  constraints: [],
  dataWarnings: [],
  description: "",
  inputs: [],
  riskAppetiteExplanation: "",
  tightnessExplanation: "",
  thresholds: DEFAULT_THRESHOLDS,
  diagnostics: {
    tightnessDelta: tightness - DEFAULT_THRESHOLDS.tightnessRegime,
    riskAppetiteDelta: riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime,
    nearestThresholdDelta: Math.min(
      Math.abs(tightness - DEFAULT_THRESHOLDS.tightnessRegime),
      Math.abs(riskAppetite - DEFAULT_THRESHOLDS.riskAppetiteRegime)
    ),
    confidence: "MEDIUM",
    transitionWatch: false,
    intensity: "STANDARD",
  },
  scores: {
    baseRate: 5,
    baseRateUsed: "1M",
    curveSlope: -0.1,
    tightness,
    riskAppetite,
  },
});

const payload: SignalAlertPayload = {
  previousRecordDate: "2026-01-01",
  currentRecordDate: "2026-01-08",
  previousAssessment: assessment("DEFENSIVE", 80, 55),
  currentAssessment: assessment("SCARCITY", 82, 44),
  reasons: [{ code: "regime-change", message: "Regime shifted." }],
  sourceUrls: ["https://example.com"],
  timeMachineHref: "/signals#time-machine",
};

describe("signalOps", () => {
  it("creates an alert when no prior alert exists", () => {
    assert.equal(shouldCreateSignalAlert(payload), true);
  });

  it("suppresses duplicate non-flip alerts in 24h window", () => {
    const latest: RegimeAlertEvent = {
      id: "1",
      createdAt: new Date().toISOString(),
      payload,
    };

    assert.equal(shouldCreateSignalAlert(payload, latest), false);
  });

  it("builds delivery summaries with regime and reason codes", () => {
    const latest: RegimeAlertEvent = {
      id: "1",
      createdAt: new Date().toISOString(),
      payload,
    };

    const summary = buildDeliverySummary(latest);
    assert.match(summary, /SCARCITY/);
    assert.match(summary, /regime-change/);
  });
});
