import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildHomeBriefModel, buildWeeklyDecisionCardViewModel } from "../lib/report/homeBriefModel";
import {
  buildActionNowShort,
  buildReportDynamics,
  buildWeekActionNow,
  resolveWeeklyTone,
  splitWeeklyCall,
} from "../lib/report/reportEvidence";
import type { ReportDynamics } from "../lib/report/reportDataTypes";
import { assessment } from "./factories/exportFixtures";

/*
 * `resolveWeeklyTone` is the headline's rule for the week's direction: an improving week
 * holds while any area's pause line is met, and a week with nothing to compare states no
 * direction. The surfaces that name the week's direction beside the guidance read it, so
 * none says "loosened" or "Steady" over a headline that says otherwise
 * (docs/feature-specs-current.md §1.1.52).
 */
const weekWith = (directionLabel: ReportDynamics["directionLabel"], tightness: number) => {
  const homeBriefModel = buildHomeBriefModel({
    assessment: {
      regime: "DEFENSIVE",
      diagnostics: { transitionWatch: false },
      thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
      scores: { tightness, riskAppetite: 54 },
    },
    regimeAlert: null,
    stopItems: ["Guardrail"],
    reportDynamics: {
      directionLabel,
      regimeChanged: false,
      changedSignals: directionLabel === "unavailable" ? [] : [{ key: "riskAppetite", delta: directionLabel === "improving" ? 4 : -4 }],
      anomalySignals: [],
    },
  });
  return homeBriefModel;
};

describe("the week's direction beside the guidance", () => {
  it("holds on an improving week while a pause line is met, in the memo as in the headline", () => {
    // Funding pressure 60 is past the pause line at 56.
    const model = weekWith("improving", 60);
    assert.equal(model.weeklyTone, "holding");
    assert.doesNotMatch(model.weeklyMemoLines[0] ?? "", /loosened/);
    assert.equal(model.weeklyMemoLines[0], "The readings improved this week, but a pause line still applies, so the guidance holds.");

    const clear = weekWith("improving", 45);
    assert.equal(clear.weeklyTone, "easing");
    assert.equal(clear.weeklyMemoLines[0], "Conditions loosened this week.");
  });

  it("names a tightening week as tightening, where the sticky strip read \"Steady\" every week", () => {
    const model = weekWith("deteriorating", 52);
    const card = buildWeeklyDecisionCardViewModel({
      homeBriefModel: model,
      statusLabel: "Live",
      reportDynamics: { changedSignals: [], anomalySignals: [], totalSignalChanges: 0, regimeChanged: false, directionLabel: "deteriorating" },
      citation: "",
      recordDateLabel: "Oct 5, 2026",
      fetchedAtLabel: "Oct 5, 2026",
    });
    assert.equal(card.status.weeklyTone, "tightening");
    assert.equal(model.weeklyMemoLines[0], "Conditions tightened this week.");
  });

  it("states no direction on a week with nothing to compare", () => {
    const model = weekWith("unavailable", 52);
    assert.equal(model.weeklyTone, null);
    assert.equal(model.weeklyMemoLines[0], "No previous reading to compare this week against.");

    assert.equal(resolveWeeklyTone({ directionLabel: "unavailable", regimeChanged: false }), null);
    const headline = buildActionNowShort({ directionLabel: "unavailable", regimeChanged: false, regime: "SCARCITY" });
    assert.equal(headline, "Keep spend flat and require paybacks inside 6 months.");
    assert.equal(splitWeeklyCall(headline).directionLabel, undefined, "no \"Holding this week\" stamp");
  });
});

/*
 * A change of conditions reads the way the conditions moved (`REGIME_SEVERITY_RANK`).
 * Every change read "tightening" until 2026-10-07: a week the machine confirmed Sunny
 * over a Stormy brief on the same scores headlined "Conditions are tightening. Keep what
 * is working, and don't start anything new this week.", and a month-end Freezing to
 * Cloudy did the same, in the headline, the sticky strip and the memo.
 */
describe("a change of conditions, by the way they moved", () => {
  const sameScores = { ...assessment.scores, baseRate: assessment.scores.baseRate };

  it("eases when the conditions get milder on the same scores", () => {
    // Published Stormy while the machine held the flip; this week it confirms Sunny.
    const dynamics = buildReportDynamics({ current: assessment, previous: { regime: "VOLATILE", scores: sameScores } });
    assert.equal(dynamics.directionLabel, "stable");
    assert.equal(dynamics.regimeChanged, true);
    assert.equal(dynamics.previousRegime, "VOLATILE");
    assert.equal(
      buildWeekActionNow({ assessment, reportDynamics: dynamics, actionStripItems: [] }),
      "Conditions are easing. Grow what is working, one milestone at a time.",
    );
  });

  it("tightens when the conditions get harsher", () => {
    const stormy = { ...assessment, regime: "VOLATILE" as const };
    const dynamics = buildReportDynamics({ current: stormy, previous: { regime: "EXPANSION", scores: sameScores } });
    assert.equal(
      buildWeekActionNow({ assessment: stormy, reportDynamics: dynamics, actionStripItems: [] }),
      "Conditions are tightening. Keep only the bets you can stop, and run fewer experiments at once.",
    );
  });

  it("eases a month-end Freezing to Cloudy on mixed scores, and holds it while a pause line is met", () => {
    const change = { directionLabel: "mixed" as const, regimeChanged: true, previousRegime: "SCARCITY" as const, regime: "DEFENSIVE" as const };
    assert.equal(resolveWeeklyTone(change), "easing");
    assert.equal(resolveWeeklyTone({ ...change, pauseApplies: true }), "holding");
    assert.equal(buildActionNowShort(change), "Conditions are easing. Resume paused work with clear milestones.");
    // Without the earlier conditions the old rule stands: a change reads as tightening.
    assert.equal(resolveWeeklyTone({ directionLabel: "mixed", regimeChanged: true, regime: "DEFENSIVE" }), "tightening");
  });

  it("carries the same direction into the home model's badge and memo", () => {
    const milder = buildHomeBriefModel({
      assessment: {
        regime: "DEFENSIVE",
        diagnostics: { transitionWatch: false },
        thresholds: { tightnessRegime: 50, riskAppetiteRegime: 50 },
        scores: { tightness: 52, riskAppetite: 54 },
      },
      regimeAlert: { previousRegime: "SCARCITY" },
      stopItems: ["Guardrail"],
      reportDynamics: {
        directionLabel: "mixed",
        regimeChanged: true,
        previousRegime: "SCARCITY",
        changedSignals: [
          { key: "tightness", delta: 1 },
          { key: "riskAppetite", delta: 6 },
        ],
        anomalySignals: [],
      },
    });
    assert.equal(milder.weeklyTone, "easing");
    assert.equal(milder.weeklyMemoLines[0], "Conditions loosened this week.");
  });
});
