import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";

describe("buildHomeBriefModel", () => {
  it("derives stable labels and decision rules from brief inputs", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 57, riskAppetite: 54 },
      },
      regimeAlert: { previousRegime: "VOLATILE" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "tightness", delta: 2 }],
        anomalySignals: [],
      },
    }, { overlaySector: "consumer" });

    assert.match(model.confidenceLabel, /LOW|MED|HIGH/);
    assert.match(model.stageLabel, /Early|Mid|Late/);
    assert.equal(typeof model.stageFragile, "boolean");
    assert.match(model.postureWithStageLabel, /—/);
    assert.equal(model.postureLabel, "Contraction");
    assert.equal(typeof model.confidencePercent, "number");
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.match(model.transitionWatch, /ON|OFF/);
    assert.equal(typeof model.guardrail, "string");
    assert.equal(typeof model.reversalTrigger, "string");
    assert.equal(model.decisionRules.length, 5);
    assert.equal(model.roleAwareTemplates.length, 2);
    assert.ok(model.executiveOperationalStance.expand.length >= 2);
    assert.ok(model.executiveOperationalStance.avoid.length >= 2);
    assert.ok(model.executiveOperationalStance.expand.length <= 4);
    assert.ok(model.executiveOperationalStance.avoid.length >= 2);
    assert.ok(model.executiveOperationalStance.avoid.length <= 4);
    assert.match(model.roleAwareTemplates[0]?.doNow ?? "", /hiring|tempo|spend|reversible/i);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.ok(model.memoryRail.length > 0);
    assert.ok(model.historicalTimeline.length > 0);
    assert.equal(model.historicalAnalogs.length, 0);
    assert.equal(model.macroOverlay.length, 5);
    assert.ok(model.macroOverlay.some((item) => item.label.includes("Sector sensitivity (Consumer)")));
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(model.primaryDrivers.length >= 2);
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
    assert.equal(typeof model.regimeVelocity.displayLabel, "string");
  });

  it("returns no-change decision summary when there are no deltas", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 50, riskAppetite: 50 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.match(model.decisionShiftSummary, /Changed: no material signal shift\./);
    assert.match(model.decisionShiftSummary, /Do now:/);
    assert.match(model.decisionShiftSummary, /Flip:/);
    assert.equal(model.decisionRules.length, 5);
    assert.equal(model.roleAwareTemplates.length, 2);
    assert.match(model.roleAwareTemplates[0]?.doNow ?? "", /hiring|tempo|spend|reversible/i);
    assert.equal(typeof model.confidencePercent, "number");
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.equal(typeof model.revisitDecisions, "boolean");
    assert.ok(model.memoryRail.length > 0);
    assert.ok(model.historicalTimeline.length > 0);
    assert.equal(model.historicalAnalogs.length, 0);
    assert.equal(model.macroOverlay.length, 5);
    assert.equal(model.whyThisCall.length, 3);
    assert.ok(model.primaryDrivers.length >= 2);
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
  });

  it("describes momentum using signal-improvement semantics and strongest move", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 54, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [
          { key: "riskAppetite", delta: 6 },
          { key: "tightness", delta: 0.2 },
        ],
        anomalySignals: [],
      },
    });

    const momentumReason = model.whyThisCall.find((reason) => reason.key === "momentum" || reason.label === "Momentum" || reason.label === "What moved this week")?.detail ?? "";
    assert.match(momentumReason, /Risk appetite improving this week; improving overall\./);
    assert.doesNotMatch(momentumReason, /tightness/i);
  });

  it("uses direction-aware reversal trigger language for expansion risk-appetite boundaries", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        thresholds: { tightnessRegime: 40, riskAppetiteRegime: 50 },
        scores: { tightness: 10, riskAppetite: 56 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.match(model.reversalTrigger, /risk appetite falls to or below 50\.0 \(now 56\.0\)/i);
    assert.equal(model.regimeDistance.dimensionKey, "riskAppetite");
    assert.equal(model.regimeDistance.thresholdDirection, "fallToOrBelow");
  });

  it("renders selected homepage overlay sector in macro overlay label", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 40, riskAppetite: 64 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    }, { overlaySector: "infrastructure" });

    const overlayRow = model.macroOverlay.find((item) => item.label.includes("Sector sensitivity"));
    assert.ok(overlayRow);
    assert.match(overlayRow?.label ?? "", /Infrastructure/);
  });

  it("anchors historical timeline to record year for time-machine snapshots", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 54, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      recordDateLabel: "2022-09-30",
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    const timelineLabels = model.historicalTimeline.map((entry) => entry.label);
    assert.equal(timelineLabels[timelineLabels.length - 1], "2022");
    assert.ok(timelineLabels.every((label) => Number.parseInt(label, 10) <= 2022));
  });

  it("derives stage labels for regime edge cases", () => {
    const strongExpansion = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 30, riskAppetite: 80 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [{ key: "riskAppetite", delta: 4 }],
        anomalySignals: [],
      },
    });
    assert.equal(strongExpansion.stageLabel, "Late");
    assert.equal(strongExpansion.stageFragile, false);

    const weakExpansionNearFlip = buildHomeBriefModel({
      assessment: {
        regime: "EXPANSION",
        thresholds: { tightnessRegime: 40, riskAppetiteRegime: 50 },
        scores: { tightness: 39, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });
    assert.equal(weakExpansionNearFlip.stageLabel, "Late");
    assert.equal(weakExpansionNearFlip.stageFragile, true);
    assert.match(weakExpansionNearFlip.postureWithStageLabel, /Late \(Fragile\)/);

    const mixedStabilization = buildHomeBriefModel({
      assessment: {
        regime: "VOLATILE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 66, riskAppetite: 68 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [{ key: "tightness", delta: -1.5 }, { key: "riskAppetite", delta: 1 }],
        anomalySignals: [],
      },
    });
    assert.equal(mixedStabilization.stageLabel, "Mid");
    assert.equal(mixedStabilization.postureLabel, "Transitional Mixed");

    const scarcityRecovery = buildHomeBriefModel({
      assessment: {
        regime: "SCARCITY",
        thresholds: { tightnessRegime: 55, riskAppetiteRegime: 45 },
        scores: { tightness: 75, riskAppetite: 30 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [{ key: "tightness", delta: -4 }],
        anomalySignals: [],
      },
    });
    assert.equal(scarcityRecovery.stageLabel, "Early");
  });

});
