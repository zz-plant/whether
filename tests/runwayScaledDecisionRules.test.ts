import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import {
  buildScopedVariantDecisionAdjustment,
  startupVariantModes,
  type StartupVariantMode,
} from "../lib/report/boundedDecisionRules";
import { buildHomeBriefModel } from "../lib/report/homeBriefModel";
import { buildWeeklyCallContract } from "../lib/report/weeklyCallContract";
import { evaluateRegime } from "../lib/regimeEngine";
import type { MacroSeriesReading, TreasuryData } from "../lib/types";

const thresholds = { tightnessRegime: 62, riskAppetiteRegime: 48 };
const scores = { tightness: 55, riskAppetite: 60 };

const adjustmentFor = (mode: StartupVariantMode, runway?: { runwayBand?: "critical" | "tight" | "balanced" | "abundant"; runwayMonths?: number }) =>
  buildScopedVariantDecisionAdjustment({ mode, thresholds, scores, ...runway });

const treasury: TreasuryData = {
  record_date: "2026-08-31",
  fetched_at: "2026-08-31T09:00:00Z",
  source: "US Treasury",
  isLive: true,
  yields: { oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.4 },
};

// The policy layer refuses a read with imputed macro inputs, and a refusal
// overrides every stage and runway rule — so the contract half needs real ones.
const macroSeries: MacroSeriesReading[] = (
  [
    ["BBB_CREDIT_SPREAD", "BBB", 1.8],
    ["CPI_YOY", "CPI", 3.1],
    ["UNEMPLOYMENT_RATE", "Unemployment", 4.2],
  ] as const
).map(([id, label, value]) => ({
  id,
  label,
  value,
  unit: "%",
  explanation: "",
  sourceLabel: "FRED",
  sourceUrl: "https://fred.stlouisfed.org/",
  formulaUrl: "/trust#formula-reference",
  record_date: "2026-08-01",
  fetched_at: "2026-08-02T00:00:00Z",
  isLive: true,
}));

const buildContract = (runway: { runwayBand?: "critical" | "tight" | "balanced" | "abundant"; runwayMonths?: number; startupVariantMode?: StartupVariantMode }) => {
  const assessment = evaluateRegime(treasury, undefined, macroSeries);
  assert.equal(assessment.policyAssessment.refusal.refused, false);
  const homeBriefModel = buildHomeBriefModel(
    {
      assessment,
      treasury,
      sensors: [],
      macroSeries,
      reportDynamics: { directionLabel: "deteriorating", changedSignals: [] },
      actionNowShort: "Hold net-new hiring and require reversible commitments.",
      startItems: ["Audit cloud compute commitments"],
      stopItems: ["Hold net-new hiring"],
      regimeAlert: null,
    },
    { startupVariantMode: runway.startupVariantMode, runwayBand: runway.runwayBand, runwayMonths: runway.runwayMonths },
  );
  return buildWeeklyCallContract({ assessment, homeBriefModel, ...runway });
};

describe("runway-scaled decision rules", () => {
  it("leaves every stage rule untouched with no runway or the balanced band", () => {
    for (const { mode } of startupVariantModes) {
      const base = adjustmentFor(mode);
      assert.deepEqual(adjustmentFor(mode, { runwayBand: "balanced" }), base);
      assert.deepEqual(adjustmentFor(mode, { runwayMonths: 18 }), base);
      assert.equal(base.runwayBand, undefined);
      assert.equal(base.runwayLabel, undefined);
    }
  });

  it("puts a cash gate in front of every stage rule under six months of runway", () => {
    for (const { mode } of startupVariantModes) {
      const base = adjustmentFor(mode);
      const critical = adjustmentFor(mode, { runwayBand: "critical" });

      assert.equal(critical.runwayBand, "critical");
      assert.equal(critical.runwayLabel, "<6 mo runway");
      // The gate leads; the stage rule follows rather than being replaced.
      assert.match(critical.doNowAdjustments[0] ?? "", /freeze non-revenue hires/i);
      assert.match(critical.doNowAdjustments[0] ?? "", /second signoff/i);
      assert.ok(base.doNowAdjustments.every((line) => critical.doNowAdjustments.includes(line)));
      assert.match(critical.avoidAdjustments[0] ?? "", /follow-on financing/i);
      assert.match(critical.watchAdjustments[0] ?? "", /under six months of runway/i);
      // The reversal is a cash milestone, not a macro read.
      assert.match(critical.reversalTriggerDiscipline, /past nine months|bridge financing/i);
      assert.doesNotMatch(critical.reversalTriggerDiscipline, /risk appetite|funding pressure/i);
      // The binding constraint is named, and not with the pause sentence again.
      assert.match(critical.thresholdEmphasis, /what limits you this week/i);
      assert.notEqual(critical.thresholdEmphasis, critical.watchAdjustments[0]);
    }
  });

  it("bands a month figure the same way as an explicit band", () => {
    assert.deepEqual(adjustmentFor("seed", { runwayMonths: 4 }), adjustmentFor("seed", { runwayBand: "critical" }));
    assert.deepEqual(adjustmentFor("seed", { runwayMonths: 9 }), adjustmentFor("seed", { runwayBand: "tight" }));
    assert.deepEqual(adjustmentFor("seed", { runwayMonths: 30 }), adjustmentFor("seed", { runwayBand: "abundant" }));
    // A band wins over a figure that disagrees with it.
    assert.equal(adjustmentFor("seed", { runwayBand: "abundant", runwayMonths: 4 }).runwayBand, "abundant");
  });

  it("requires a payback case and starts raise planning between six and twelve months", () => {
    const tight = adjustmentFor("series-a", { runwayBand: "tight" });
    assert.equal(tight.runwayLabel, "6–12 mo runway");
    assert.match(tight.doNowAdjustments[0] ?? "", /payback case/i);
    assert.match(tight.doNowAdjustments[1] ?? "", /if you plan to raise/i);
    assert.match(tight.watchAdjustments[0] ?? "", /net burn/i);
    assert.match(tight.reversalTriggerDiscipline, /twelve months|round is signed/i);
    // The stage's own emphasis still follows the gate.
    assert.ok(tight.thresholdEmphasis.endsWith(adjustmentFor("series-a").thresholdEmphasis));
  });

  it("offers a counter-cyclical move above 24 months without dropping the payback bar", () => {
    const base = adjustmentFor("series-b");
    const abundant = adjustmentFor("series-b", { runwayBand: "abundant" });
    assert.equal(abundant.runwayLabel, "24+ mo runway");
    assert.match(abundant.doNowAdjustments[0] ?? "", /recruit senior talent/i);
    assert.match(abundant.avoidAdjustments[0] ?? "", /payback bar/i);
    // The corridor still binds: the pause line and reversal are the stage's own.
    assert.deepEqual(abundant.watchAdjustments, base.watchAdjustments);
    assert.equal(abundant.reversalTriggerDiscipline, base.reversalTriggerDiscipline);
  });

  it("carries the runway band through the weekly call contract", () => {
    const uncalibrated = buildContract({});
    assert.equal(uncalibrated.runwayBand, undefined);
    assert.equal(uncalibrated.runwayLabel, undefined);

    const critical = buildContract({ runwayBand: "critical" });
    assert.equal(critical.runwayBand, "critical");
    assert.equal(critical.runwayLabel, "<6 mo runway");
    // With no stage chosen the default stage's rule is what the band reshapes.
    assert.match(critical.actionNow, /freeze non-revenue hires/i);
    assert.match(critical.pauseIf, /under six months of runway/i);
    assert.match(critical.resumeWhen ?? "", /bridge financing/i);
    // The band reshapes when a hold lifts, not where the call changes.
    assert.equal(critical.callChangesIf, uncalibrated.callChangesIf);
    assert.equal(uncalibrated.resumeWhen, undefined);
    assert.ok(critical.doNowBullets.includes(critical.actionNow));
    // The regime call itself is company-agnostic.
    assert.equal(critical.currentCall, uncalibrated.currentCall);
    assert.equal(critical.regimeStage, uncalibrated.regimeStage);

    const fromMonths = buildContract({ runwayMonths: 4 });
    assert.equal(fromMonths.runwayBand, "critical");
    assert.equal(fromMonths.actionNow, critical.actionNow);

    const balanced = buildContract({ runwayBand: "balanced" });
    assert.equal(balanced.runwayBand, "balanced");
    assert.equal(balanced.runwayLabel, undefined);
    assert.equal(balanced.actionNow, buildContract({ startupVariantMode: "series-a" }).actionNow);
  });

  it("scales the chosen stage, not the default, when both axes are set", () => {
    const contract = buildContract({ startupVariantMode: "bootstrapped", runwayBand: "abundant" });
    assert.match(contract.actionNow, /recruit senior talent/i);
    assert.equal(contract.stageScopedAdjustments?.bootstrapped.runwayLabel, "24+ mo runway");
    assert.equal(contract.stageScopedAdjustments?.bootstrapped.thresholdEmphasis, adjustmentFor("bootstrapped", { runwayBand: "abundant" }).thresholdEmphasis);
  });
});
