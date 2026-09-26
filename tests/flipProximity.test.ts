import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildFlipProximity, buildQuietDayRead, buildStandupFlipLine } from "../lib/report/flipProximity";
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
      // In the market's own terms, with no abbreviation: "10Y−2Y" was the one
      // bond-desk token in the one line saying how close the call is to changing.
      assert.match(entry.sentence, /^If (long rates (rise|fall) \d+\.\d{2}% (further above|closer to) short rates|the 1-month Treasury bill rate (rises|falls) \d+\.\d{2}%), conditions turn (Sunny|Cloudy|Stormy|Freezing)\.$/);
      assert.doesNotMatch(entry.sentence, /10Y|2Y|1M\b/);
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
    "If long rates fall 0.15% closer to short rates, conditions turn Cloudy.",
    "If the 1-month Treasury bill rate falls 0.40%, conditions turn Stormy.",
  ];

  it("leads a steady week with the conditions-unchanged verdict and the nearest flip distance", () => {
    const line = buildQuietDayRead({ steadyWeek: true, flipProximity: sentences });
    assert.equal(line, "Conditions unchanged — If long rates fall 0.15% closer to short rates, conditions turn Cloudy.");
  });

  it("renders nothing when conditions moved this week", () => {
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

describe("standup flip line", () => {
  it("formats a steady week with nearest move and no pace change", () => {
    const proximity = [
      {
        axis: "riskAppetite" as const,
        input: "curveSlope" as const,
        inputMove: 0.08,
        pointsToBoundary: 3,
        crossesTo: "DEFENSIVE" as const,
        sentence: "If long rates rise 0.08% further above short rates, conditions turn Cloudy.",
      },
    ];
    const line = buildStandupFlipLine({
      regime: "EXPANSION",
      steadyWeek: true,
      proximity,
    });
    assert.equal(line, "Call unchanged, 0.08% from flip; no pace change.");
  });

  it("formats a changed call with the new regime, nearest move, and review pace", () => {
    const proximity = [
      {
        axis: "tightness" as const,
        input: "baseRate" as const,
        inputMove: -0.15,
        pointsToBoundary: 6,
        crossesTo: "SCARCITY" as const,
        sentence: "If base rate falls 0.15%, conditions turn Freezing.",
      },
    ];
    const line = buildStandupFlipLine({
      regime: "DEFENSIVE",
      steadyWeek: false,
      proximity,
    });
    assert.equal(line, "Call changed to Cloudy, 0.15% from flip; review pace.");
  });

  it("handles a week with no reachable crossing cleanly", () => {
    const line = buildStandupFlipLine({
      regime: "VOLATILE",
      steadyWeek: true,
      proximity: [],
    });
    assert.equal(line, "Call unchanged, no near flip; no pace change.");
  });

  it("derives the distance consistently from real proximity output", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const proximity = buildFlipProximity(assessment);
    const line = buildStandupFlipLine({
      regime: assessment.regime,
      steadyWeek: true,
      proximity,
    });
    assert.match(line, /^Call unchanged, \d+\.\d{2}% from flip; no pace change\.$/);
  });
});
