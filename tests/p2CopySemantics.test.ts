import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildDecisionAnswerContextSummary } from "../app/answers/decisionAnswerCopy";
import { buildShareText } from "../app/operate/components/decisionShieldUtils";
import {
  buildExecutiveMemo,
  buildGuardrailChecklist,
} from "../app/operate/components/executiveBriefingPanel";
import { evaluateDecision } from "../lib/decisionShield";
import { insightDatabase } from "../data/recommendations";
import { buildAssessmentFixture } from "./fixtures/reportFixtures";

describe("P2 beginner copy semantics", () => {
  it("keeps answer-page posture context user-facing and labels canonical regime as supporting context", () => {
    const summary = buildDecisionAnswerContextSummary({
      displayLabel: "Guarded Expansion",
      canonicalRegime: "EXPANSION",
      momentumLabel: "deteriorating",
      revisitDecisions: true,
    });

    assert.equal(
      summary.summaryLine,
      "Conditions are Guarded Expansion and worsening; revisit last week's decisions.",
    );
    assert.equal(summary.classificationLine, "Underneath, the call is Sunny.");
    assert.doesNotMatch(summary.summaryLine, /posture|momentum|YES|NO\b/);

    const noComparison = buildDecisionAnswerContextSummary({
      displayLabel: "Cloudy",
      canonicalRegime: "DEFENSIVE",
      momentumLabel: "unavailable",
      revisitDecisions: false,
    });
    assert.equal(
      noComparison.summaryLine,
      "Conditions are Cloudy; no comparison with last week is available, so last week's decisions stand.",
    );
    assert.equal(noComparison.classificationLine, null);
  });

  it("names this week's call in Decision Shield shares", () => {
    const assessment = buildAssessmentFixture({ regime: "DEFENSIVE" });
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });
    const shareText = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output);

    assert.match(shareText, /This week's call: Cloudy/);
    assert.doesNotMatch(shareText, /^Regime:|Posture/m);
  });

  it("keeps strategy and executive briefs framed as weekly-call context, not raw regime jargon", () => {
    const assessment = buildAssessmentFixture({ regime: "DEFENSIVE" });
    const executiveTemplate = insightDatabase.executiveBriefingSuite.regimes.find((entry) => entry.key === assessment.regime);
    const executiveMemo = buildExecutiveMemo(assessment, "Mar 1, 2026", executiveTemplate);
    const checklist = buildGuardrailChecklist(assessment, executiveTemplate);

    assert.match(executiveMemo, /This week's call: Cloudy/);
    assert.doesNotMatch(executiveMemo, /^Regime:|Posture|Executive/m);
    assert.match(checklist, /Pause-if Checklist — Cloudy/);
  });
});
