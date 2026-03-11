import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDecisionMatrixPayload, buildHomeBriefModel } from "../lib/report/homeBriefModel";

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
    assert.equal(typeof model.regimeHeader.regime, "string");
    assert.equal(typeof model.regimeHeader.confidence, "string");
    assert.equal(typeof model.regimeHeader.primaryRisk, "string");
    assert.ok(model.regimeHeader.regime.length > 0);
    assert.ok(model.regimeHeader.confidence.length > 0);
    assert.ok(model.regimeHeader.primaryRisk.length > 0);
    assert.match(model.trendLabel, /Improving|Deteriorating|Mixed|Stable/);
    assert.match(model.transitionWatch, /ON|OFF/);
    assert.equal(typeof model.guardrail, "string");
    assert.equal(typeof model.reversalTrigger, "string");
    assert.equal(model.decisionRules.length, 5);
    assert.equal(model.startupVariantPolicy.options.length, 4);
    assert.equal(model.startupVariantPolicy.selectedMode, "series-a");
    assert.match(model.startupVariantPolicy.adjustmentsByMode.seed.reversalTriggerDiscipline, /Reverse/i);
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
    assert.ok(Array.isArray(model.evidenceItems));
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
    assert.equal(typeof model.regimeVelocity.displayLabel, "string");
    assert.equal(typeof model.weeklyMovement.score, "number");
    assert.match(model.weeklyMovement.direction, /defensive|expansionary|neutral/);
    assert.equal(model.regimeSignalIndicators.length, 4);
    assert.equal(model.regimeSignalIndicators[0]?.label, "Capital tightness");
    assert.match(model.regimeSignalIndicators[0]?.trendDeltaLabel ?? "", /vs last week/);
  });

  it("preserves all normalized evidence items including curve-slope", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 48, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportEvidenceItems: [
        { key: "tightness", title: "Capital conditions", supportingBullets: ["A"], confidenceLabel: "High", directionLabel: "Tightening", immediateImplication: "A" },
        { key: "riskAppetite", title: "Risk appetite", supportingBullets: ["B"], confidenceLabel: "High", directionLabel: "Easing", immediateImplication: "B" },
        { key: "baseRate", title: "Policy rate pressure", supportingBullets: ["C"], confidenceLabel: "Medium", directionLabel: "Unchanged", immediateImplication: "C" },
        { key: "curveSlope", title: "Yield-curve signal", supportingBullets: ["D"], confidenceLabel: "Low", directionLabel: "Easing", immediateImplication: "D" },
      ],
    });

    assert.equal(model.evidenceItems.length, 4);
    assert.equal(model.evidenceItems[3]?.key, "curveSlope");
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
    assert.ok(Array.isArray(model.evidenceItems));
    assert.ok(model.startupClimateIndex.score >= 0 && model.startupClimateIndex.score <= 100);
    assert.equal(model.startupClimateIndex.breakdown.length, 4);
    assert.match(model.whyThisCall[0].detail, /threshold|range|outside/i);
    assert.match(model.decisionRules[0].pauseTrigger, /\d/);
    assert.equal(model.weeklyMovement.direction, "neutral");
    assert.equal(model.weeklyMovement.score, 0);
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

  it("uses per-signal semantics when deriving primary risk from dominant move", () => {
    const improvingRiskAppetite = buildHomeBriefModel({
      fetchedAtLabel: "Updated 2h ago",
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 25, riskAppetite: 80 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [
          { key: "riskAppetite", delta: 3.2 },
        ],
        anomalySignals: [],
      },
    });

    assert.match(improvingRiskAppetite.regimeHeader.primaryRisk, /^Upside: Risk appetite eased \(3\.2\)\.$/);

    const worseningRiskAppetite = buildHomeBriefModel({
      fetchedAtLabel: "Updated 2h ago",
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 25, riskAppetite: 70 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "riskAppetite", delta: -2.4 }],
        anomalySignals: [],
      },
    });

    assert.match(worseningRiskAppetite.regimeHeader.primaryRisk, /^Downside: Risk appetite tightened \(-2\.4\)\.$/);
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
    assert.equal(model.flipThreshold, model.reversalTrigger);
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

  it("builds ordered historical timeline entries from regime series", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 54, riskAppetite: 55 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      historicalSelection: { month: 2, year: 2026, banner: "Historical" },
      regimeSeries: [
        { year: 2026, month: 1, recordDate: "2026-01-31", regime: "VOLATILE", summary: "Stabilizing" },
        { year: 2026, month: 2, recordDate: "2026-02-28", regime: "DEFENSIVE", summary: "Tighten" },
        { year: 2026, month: 3, recordDate: "2026-03-31", regime: "SCARCITY", summary: "Not selected" },
      ],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.equal(model.historicalTimeline.length, 2);
    assert.equal(model.historicalTimeline[0]?.month, 1);
    assert.equal(model.historicalTimeline[1]?.month, 2);
    assert.equal(model.historicalTimeline[1]?.isCurrent, true);
    assert.match(model.historicalTimeline[0]?.label ?? "", /2026/);
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


  it("does not emit expansion stance copy when regime improves within contraction states", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 60, riskAppetite: 62 },
      },
      regimeAlert: { previousRegime: "SCARCITY" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "improving",
        changedSignals: [{ key: "riskAppetite", delta: 2 }],
        anomalySignals: [],
      },
    });

    assert.doesNotMatch(model.operatingStanceLine, /Stage expansion/i);
    assert.match(model.operatingStanceLine, /Hold approvals steady/i);
  });


  it("keeps noun discipline in top summary fields", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "VOLATILE",
        thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 },
        scores: { tightness: 69, riskAppetite: 52 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [{ key: "riskAppetite", delta: 1 }],
        anomalySignals: [],
      },
    });

    assert.match(model.postureLabel, /Contraction|Transition|Expansion/i);
    assert.match(model.operatingStanceLine, /posture|operate|approval/i);
    assert.doesNotMatch(model.netConstraintSummary, /climate stance/i);
  });

  it("marks missing macro series as fallback indicators", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 58, riskAppetite: 45 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
      macroSeries: [],
    });

    const baseRate = model.regimeSignalIndicators.find((item) => item.key === "baseRate");
    assert.ok(baseRate);
    assert.equal(baseRate?.valueLabel, "—");
    assert.equal(baseRate?.trendArrow, "→");
    assert.equal(baseRate?.isFallback, true);
  });


  it("builds complete decision matrix across all row and column intersections", () => {
    const model = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 58, riskAppetite: 45 },
      },
      regimeAlert: null,
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "stable",
        changedSignals: [],
        anomalySignals: [],
      },
    });

    assert.equal(model.decisionMatrix.columns.length, 3);
    assert.deepEqual(model.decisionMatrix.columns.map((column) => column.label), ["Approve", "Delay", "Flip"]);
    assert.equal(model.decisionMatrix.rows.length, 4);

    for (const row of model.decisionMatrix.rows) {
      for (const column of model.decisionMatrix.columns) {
        const cell = row.cells[column.key];
        assert.ok(cell);
        assert.ok(cell.text.length > 0);
        assert.ok(cell.detail.length > 0);
      }
    }

    const capitalRow = model.decisionMatrix.rows.find((row) => row.key === "capital");
    assert.ok(capitalRow);
    assert.match(capitalRow?.cells.flip.text ?? "", /tightness\s*</i);
    assert.match(capitalRow?.cells.flip.text ?? "", /risk appetite\s*>/i);
  });

  it("falls back to default matrix cues when decision inputs are missing", () => {
    const matrix = buildDecisionMatrixPayload({
      regime: "DEFENSIVE",
      thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
      decisionRules: [],
      confidenceDegraded: true,
      freshnessDegraded: true,
    });

    assert.equal(matrix.rows.length, 4);
    assert.equal(matrix.rows[0]?.cells.approve.text, "Stage approvals on short-cycle proof");
    assert.equal(matrix.rows[0]?.cells.delay.text, "Delay irreversible commitments");
    assert.match(matrix.rows[0]?.cells.flip.text ?? "", /Tightness ≤/);
    assert.match(matrix.rows[3]?.cells.flip.text ?? "", /Re-tighten if/);
  });


});
