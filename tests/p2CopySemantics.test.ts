import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildDecisionAnswerContextSummary } from "../app/answers/decisionAnswerCopy";
import { buildShareText } from "../app/operate/components/decisionShieldUtils";
import { evaluateDecision } from "../lib/decisionShield";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";

describe("P2 beginner copy semantics", () => {
  it("keeps answer-page posture context user-facing and labels canonical regime as supporting context", () => {
    const summary = buildDecisionAnswerContextSummary({
      displayLabel: "Guarded Expansion",
      canonicalRegime: "EXPANSION",
      reportDynamics: {
        directionLabel: "deteriorating",
        changedSignals: [{ key: "tightness", delta: 4 }],
        anomalySignals: [],
      },
      revisitDecisions: true,
    });

    assert.equal(
      summary.summaryLine,
      "Conditions are Guarded Expansion and worsening since last week; revisit last week's decisions.",
    );
    assert.equal(summary.classificationLine, "On the scores alone, it's Sunny.");
    assert.doesNotMatch(summary.summaryLine, /posture|momentum|YES|NO\b/);

    const noComparison = buildDecisionAnswerContextSummary({
      displayLabel: "Cloudy",
      canonicalRegime: "DEFENSIVE",
      reportDynamics: { directionLabel: "unavailable", changedSignals: [], anomalySignals: [] },
      revisitDecisions: false,
    });
    assert.equal(
      noComparison.summaryLine,
      "Conditions are Cloudy; no comparison with last week is available, so last week's decisions stand.",
    );
    assert.equal(noComparison.classificationLine, null);
  });

  /*
   * Oct 5 compared with Aug 31: funding pressure 63 to 90 and risk appetite 56
   * to 48 both worsened, the short-term rate rose and the recession warning
   * gauge steepened 0.06pp, so the engine's `directionLabel` was "mixed". The
   * answer pages printed "Conditions are Freezing and mixed; revisit last
   * week's decisions." — a split that was not in the scores, against a week
   * that was not the comparison.
   */
  it("reads the direction off the two scores and names the reading it compares with", () => {
    const summary = buildDecisionAnswerContextSummary({
      displayLabel: "Freezing",
      canonicalRegime: "SCARCITY",
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [
          { key: "tightness", delta: 27 },
          { key: "riskAppetite", delta: -8 },
          { key: "baseRate", delta: 0.2 },
          { key: "curveSlope", delta: 0.06 },
        ],
        anomalySignals: [],
        comparedWith: { recordDate: "2026-08-31", label: "Aug 31" },
      },
      revisitDecisions: true,
    });

    assert.equal(
      summary.summaryLine,
      "Conditions are Freezing and worsening since Aug 31; revisit decisions made on the Aug 31 reading.",
    );
    assert.doesNotMatch(summary.summaryLine, /mixed|last week/);
  });

  it("calls a split between the scores mixed, and unmoved scores holding", () => {
    const comparedWith = { recordDate: "2026-08-31", label: "Aug 31" };
    const split = buildDecisionAnswerContextSummary({
      displayLabel: "Cloudy",
      canonicalRegime: "DEFENSIVE",
      reportDynamics: {
        directionLabel: "mixed",
        changedSignals: [{ key: "tightness", delta: 5 }, { key: "riskAppetite", delta: 3 }],
        anomalySignals: [],
        comparedWith,
      },
      revisitDecisions: true,
    });
    assert.match(split.summaryLine, /^Conditions are Cloudy and mixed since Aug 31;/);

    const flat = buildDecisionAnswerContextSummary({
      displayLabel: "Cloudy",
      canonicalRegime: "DEFENSIVE",
      reportDynamics: { directionLabel: "stable", changedSignals: [], anomalySignals: [], comparedWith },
      revisitDecisions: false,
    });
    assert.equal(
      flat.summaryLine,
      "Conditions are Cloudy and holding since Aug 31; decisions made on the Aug 31 reading stand.",
    );
  });

  it("names this week's conditions in Decision Shield shares", () => {
    const assessment = buildAssessmentFixture({ regime: "DEFENSIVE" });
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });
    const shareText = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output);

    assert.match(shareText, /This week's conditions: Cloudy/);
    assert.doesNotMatch(shareText, /^Regime:|Posture/m);
  });
});
