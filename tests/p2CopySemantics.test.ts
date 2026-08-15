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
      "Operating posture: Guarded Expansion · Weekly momentum: deteriorating · Revisit decisions: YES",
    );
    assert.equal(summary.classificationLine, "Underlying regime classification: Sunny.");
  });

  it("uses posture-context language in Decision Shield shares", () => {
    const assessment = buildAssessmentFixture({ regime: "DEFENSIVE" });
    const output = evaluateDecision(assessment, {
      lifecycle: "GROWTH",
      category: "HIRING",
      action: "HIRE",
    });
    const shareText = buildShareText(assessment, "GROWTH", "HIRING", "HIRE", output);

    assert.match(shareText, /Posture context: Cloudy/);
    assert.doesNotMatch(shareText, /^Regime:/m);
  });

  it("keeps strategy and executive briefs framed as weekly-call context, not raw regime jargon", () => {
    const assessment = buildAssessmentFixture({ regime: "DEFENSIVE" });
    const executiveTemplate = insightDatabase.executiveBriefingSuite.regimes.find((entry) => entry.key === assessment.regime);
    const executiveMemo = buildExecutiveMemo(assessment, "Mar 1, 2026", executiveTemplate);
    const checklist = buildGuardrailChecklist(assessment, executiveTemplate);

    assert.match(executiveMemo, /Posture context: Cloudy/);
    assert.doesNotMatch(executiveMemo, /^Regime:/m);
    assert.match(checklist, /Pause-if Checklist — Cloudy/);
  });
});
