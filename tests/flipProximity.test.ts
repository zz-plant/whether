import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildFlipProximity, buildQuietDayRead } from "../lib/report/flipProximity";
import { evaluateRegime, type RegimeAssessment } from "../lib/regimeEngine";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { classifyRegimeQuadrant } from "../lib/report/regimeStateMachine";
import type { TreasuryData } from "../lib/types";

const withYields = (yields: TreasuryData["yields"]): RegimeAssessment =>
  evaluateRegime({ ...snapshotData, yields }, undefined, macroSeries);

describe("flip proximity", () => {
  it("reports the nearest market move first, in the input's units, naming the regime it would land in", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const [nearest, next] = buildFlipProximity(assessment);
    assert.ok(nearest && next, "both axes are reachable from this reading");
    assert.ok(Math.abs(nearest.inputMove) <= Math.abs(next.inputMove));
    for (const entry of [nearest, next]) {
      assert.match(entry.sentence, /^\d+\.\d{2}% (steeper|flatter|higher|lower) on (the 10Y−2Y curve|the 1-month Treasury bill) would change the call to (Sunny|Cloudy|Stormy|Freezing)\.$/);
      assert.notEqual(entry.crossesTo, assessment.regime);
      assert.doesNotMatch(entry.sentence, /tightness|riskAppetite|threshold|score/i, "reader copy carries no engine vocabulary");
    }
  });

  it("projects from the published score, macro layer included, not from the bare curve", () => {
    // The bundled reading publishes risk appetite below what the slope alone
    // scores (the macro layer subtracts), so the move to the boundary is the
    // published gap over the slope's 40 points per 1%, not the bare formula's.
    const assessment = evaluateRegime(snapshotData, undefined, macroSeries);
    const risk = buildFlipProximity(assessment).find((entry) => entry.axis === "riskAppetite");
    assert.ok(risk);
    const gap = assessment.thresholds.riskAppetiteRegime - assessment.scores.riskAppetite;
    assert.ok(gap > 0, "fixture sits below the risk line");
    const expected = Math.ceil((gap + 0.5) / 40 * 100) / 100;
    assert.ok(Math.abs(risk.inputMove - expected) <= 0.02, `${risk.inputMove} vs ${expected}`);
    assert.equal(risk.pointsToBoundary, gap);
  });

  it("lands in the quadrant the scan says it does", () => {
    const assessment = withYields({ oneMonth: 4.3, threeMonth: 4.3, twoYear: 4.0, tenYear: 4.1 });
    for (const entry of buildFlipProximity(assessment)) {
      // Re-derive the crossing coarsely: the axis moves past its line, the other stays.
      const tightness = entry.axis === "tightness"
        ? assessment.thresholds.tightnessRegime + (entry.inputMove > 0 ? 1 : -1)
        : assessment.scores.tightness;
      const riskAppetite = entry.axis === "riskAppetite"
        ? assessment.thresholds.riskAppetiteRegime + (entry.inputMove > 0 ? 1 : -1)
        : assessment.scores.riskAppetite;
      assert.equal(classifyRegimeQuadrant({ tightness, riskAppetite, thresholds: assessment.thresholds }), entry.crossesTo);
    }
  });

  it("leaves out an axis it cannot honestly measure", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const imputedRate = { ...assessment, scores: { ...assessment.scores, baseRateUsed: "MISSING" as const } };
    assert.ok(buildFlipProximity(imputedRate).every((entry) => entry.axis !== "tightness"));
    const imputedSlope = { ...assessment, scores: { ...assessment.scores, curveSlope: null } };
    assert.ok(buildFlipProximity(imputedSlope).every((entry) => entry.axis !== "riskAppetite"));
  });

  it("does not offer a rise in risk appetite while the market-stress veto caps it", () => {
    const base = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const vetoed = {
      ...base,
      diagnostics: { ...base.diagnostics, boundaryContributors: ["Market stress veto — posture cannot read better than transitional"] },
    };
    const risk = buildFlipProximity(vetoed).find((entry) => entry.axis === "riskAppetite");
    // From below the line the only crossing is upward, which the veto forbids.
    assert.ok(base.scores.riskAppetite <= base.thresholds.riskAppetiteRegime);
    assert.equal(risk, undefined);
  });
});

describe("quiet-day read", () => {
  const sentences = [
    "0.15% flatter on the 10Y−2Y curve would change the call to Cloudy.",
    "0.4% lower on the 1-month Treasury bill would change the call to Stormy.",
  ];

  it("leads a steady week with the call-unchanged verdict and the nearest flip distance", () => {
    const line = buildQuietDayRead({ steadyWeek: true, flipProximity: sentences });
    assert.equal(line, "Call unchanged — 0.15% flatter on the 10Y−2Y curve would change the call to Cloudy.");
  });

  it("renders nothing when the call moved this week", () => {
    assert.equal(buildQuietDayRead({ steadyWeek: false, flipProximity: sentences }), null);
  });

  it("renders nothing when no axis has a reachable crossing", () => {
    assert.equal(buildQuietDayRead({ steadyWeek: true, flipProximity: [] }), null);
  });

  it("reuses the hero's flip sentence verbatim rather than re-minting it", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const heroSentences = buildFlipProximity(assessment).map((entry) => entry.sentence);
    const line = buildQuietDayRead({ steadyWeek: true, flipProximity: heroSentences });
    assert.ok(line);
    assert.ok(heroSentences.some((sentence) => line!.includes(sentence)));
  });
});
