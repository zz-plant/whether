import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildFlipProximity } from "../lib/report/flipProximity";
import { buildStandupLine } from "../lib/report/decisionMovement";
import { buildCallChangeLine, buildCallChangeLines, buildFlipThreshold, buildWeekCallChangesIf } from "../lib/report/reportEvidence";
import { describePolicyHold } from "../lib/report/regimeDescription";
import { evaluateRegime, type RegimeAssessment } from "../lib/regimeEngine";
import { macroSeries } from "../lib/macroSnapshot";
import { snapshotData } from "../lib/snapshot";
import { classifyRegimeQuadrant } from "../lib/regimeStateMachine";
import type { TreasuryData } from "../lib/types";
import { macros, treasury as heldTreasury } from "./factories/exportFixtures";

const withYields = (yields: TreasuryData["yields"]): RegimeAssessment =>
  evaluateRegime({ ...snapshotData, yields }, undefined, macroSeries);

/* The export fixture's reading: its two scores disagree, so the policy layer holds it. */
const held = evaluateRegime(heldTreasury, undefined, macros);

/** The contract's two fields these read, as the weekly contract sets them for a reading. */
const callOf = (assessment: RegimeAssessment) => ({
  policyOverrideActive: assessment.policyAssessment.refusal.refused,
  callChangesIf: buildWeekCallChangesIf(assessment),
});

describe("the change line in interest-rate terms", () => {
  it("translates each line of the change sentence, in its order, in percentage points", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const lines = buildCallChangeLines(assessment).filter((line) => !line.tripped);
    const moves = buildFlipProximity(assessment);
    assert.ok(moves.length > 0, "a line is reachable from this reading");
    /* The sentence's order, not the size of the move: sorted by move, a 0.22-point
       bill-rate move to a line 38 points away led a 0.25-point curve move to one 9
       points away, and the one-line surfaces printed it alone as the nearest. */
    assert.deepEqual(
      moves.map((entry) => entry.axis),
      lines.map((line) => line.metric).filter((metric) => moves.some((entry) => entry.axis === metric)),
    );
    for (const entry of moves) {
      // In the market's own terms, with no abbreviation: "10Y−2Y" was the one
      // bond-desk token in the one line saying how close the call is to changing.
      assert.match(
        entry.sentence,
        /^If (long rates (rise|fall) \d+\.\d{2} percentage points (further above|closer to) short rates|the 1-month Treasury bill rate (rises|falls) \d+\.\d{2} percentage points), conditions turn (Sunny|Cloudy|Stormy|Freezing)\.$/,
      );
      assert.doesNotMatch(entry.sentence, /%|10Y|2Y|1M\b|flip/);
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

  /* While the machine held a crossing behind its confirmation gate, the scan asked
     for any change of quadrant from the published conditions, found one at the
     first step, and reported a 0.01 move toward conditions the scores already sat
     in; the sentence above it said "(already true at 41)". */
  it("translates no line the change sentence calls already crossed", () => {
    const stormy = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    assert.ok(stormy.scores.riskAppetite <= stormy.thresholds.riskAppetiteRegime, "the scores sit on the risk-off side");
    const heldSunny = { ...stormy, regime: "EXPANSION" as const };
    const crossed = buildCallChangeLines(heldSunny).find((line) => line.tripped);
    assert.equal(crossed?.metric, "riskAppetite", "published Sunny, risk appetite is already through its line");
    const moves = buildFlipProximity(heldSunny);
    assert.ok(moves.every((entry) => entry.axis !== "riskAppetite"));
    assert.ok(moves.every((entry) => Math.abs(entry.inputMove) > 0.01));
  });

  it("says nothing on a held week, whose change sentence is the hold's condition", () => {
    assert.equal(held.policyAssessment.refusal.refused, true, "the fixture is held");
    assert.deepEqual(buildFlipProximity(held), []);
  });
});

describe("what would change the guidance, in one line", () => {
  it("is the nearer line in points, a clause of the change sentence", () => {
    const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
    const line = buildCallChangeLine({ weeklyCall: callOf(assessment), assessment });
    const nearest = [...buildCallChangeLines(assessment)].sort((left, right) => (left.distance ?? 0) - (right.distance ?? 0))[0];
    assert.ok(nearest);
    assert.equal(line, `Conditions change if: ${nearest.text}.`);
    assert.ok(buildFlipThreshold(assessment).toLowerCase().includes(nearest.text.toLowerCase()));
  });

  it("is the hold's own condition on a held week", () => {
    const hold = describePolicyHold(held.policyAssessment.refusal);
    assert.equal(buildCallChangeLine({ weeklyCall: callOf(held), assessment: held }), `Conditions change if: ${hold.callChangesIf}`);
  });
});

describe("standup line", () => {
  const assessment = withYields({ oneMonth: 3.68, threeMonth: 3.7, twoYear: 3.7, tenYear: 3.99 });
  const source = { weeklyCall: callOf(assessment), assessment };
  const callChange = buildCallChangeLine(source);

  it("says whether the guidance moved, then what would change it", () => {
    assert.equal(buildStandupLine({ regime: "EXPANSION", change: "held", ...source }), `Guidance unchanged; no pace change. ${callChange}`);
    assert.equal(buildStandupLine({ regime: "DEFENSIVE", change: "conditions", ...source }), `Conditions changed to Cloudy; review pace. ${callChange}`);
  });

  /* The line read the operating latitude's move: a flat latitude over a crossed
     pause line said "Call unchanged", a two-point move with nothing crossed said
     "Call changed to Cloudy" on a week that stayed Cloudy, and a reading with
     nothing to compare said "unchanged". */
  it("says the guidance changed at a line when the conditions did not, and claims nothing without a comparison", () => {
    assert.equal(
      buildStandupLine({ regime: "DEFENSIVE", change: "lines", ...source }),
      `Guidance changed at a pause or resume line; review pace. ${callChange}`,
    );
    assert.equal(buildStandupLine({ regime: "DEFENSIVE", change: null, ...source }), `No earlier reading to compare with. ${callChange}`);
  });

  /* "Guidance unchanged, 0.15% from flip; no pace change." on the held fixture: a
     rate move named as what changes guidance the hold says is not changing. */
  it("says a held week is on hold, whatever the scores did, with the hold's condition", () => {
    const hold = describePolicyHold(held.policyAssessment.refusal);
    for (const change of ["held", "conditions", "lines", null] as const) {
      assert.equal(
        buildStandupLine({ regime: held.regime, change, weeklyCall: callOf(held), assessment: held }),
        `Guidance on hold this week; no pace change. Conditions change if: ${hold.callChangesIf}`,
      );
    }
  });

  it("carries no market move, percent or flip", () => {
    for (const change of ["held", "conditions", "lines", null] as const) {
      assert.doesNotMatch(buildStandupLine({ regime: assessment.regime, change, ...source }), /%|flip|Treasury bill|long rates/i);
    }
  });
});
