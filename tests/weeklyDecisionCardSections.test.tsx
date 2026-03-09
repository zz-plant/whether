import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BoundedRulesMatrix,
  CitationActionFooter,
  DecisionCallHeader,
  MoreContextDisclosureBody,
} from "../app/components/weeklyDecisionCard";

describe("WeeklyDecisionCard extracted sections", () => {
  it("renders operating-call header contracts", () => {
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel="DEFENSIVE"
        netConstraintSummary="Pressure remains elevated."
        meetingShorthand="Do now: revise decisions this week."
        postureDelta="+2"
        immediateDecision="Revise now"
        guardrail="Hold irreversible hiring"
        confidencePercent={70}
        confidenceLabel="MED"
        signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
        trendLabel="Mixed"
        transitionWatch="ON"
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={true}
        trustWarningCopy="Use this call for near-term pacing only until confidence returns to HIGH with fresh data."
        failureModes={[{ id: "boundary-whipsaw", warning: "Boundary whipsaw risk", mitigationCheck: "Mitigation check" }]}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        movementVelocity="Low"
        startupClimateIndex={{ score: 62, status: "Stable" }}
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
      />,
    );

    assert.match(html, /Weekly operating call/);
    assert.match(html, /Lead with action, guardrail, and flip condition; treat scores as context for continuity\./);
    assert.match(html, /Macro posture band/);
    assert.match(html, /points to flip/);
    assert.match(html, /Guardrail/);
    assert.match(html, /Flip condition/);
    assert.match(html, /Context metric: Startup Climate Index/);
    assert.match(html, /False-signal warnings/);

    const actionIndex = html.indexOf("Action");
    const guardrailIndex = html.indexOf("Guardrail");
    const flipConditionIndex = html.indexOf("Flip condition");
    const confidenceIndex = html.indexOf("Signal confidence");
    const trendIndex = html.indexOf("Trend:");
    const scoreMetadataIndex = html.indexOf("Context metric: Startup Climate Index");

    assert.ok(guardrailIndex > actionIndex);
    assert.ok(flipConditionIndex > guardrailIndex);
    assert.ok(scoreMetadataIndex > flipConditionIndex);
    assert.ok(scoreMetadataIndex > confidenceIndex);
    assert.ok(scoreMetadataIndex > trendIndex);
  });

  it("marks risk-appetite defensive trigger as breached only when value is at or below threshold", () => {
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel="EXPANSION"
        netConstraintSummary="Constraints eased."
        meetingShorthand="Do now: speed reversible bets."
        postureDelta="Better than last week"
        immediateDecision="Hold expansion posture"
        guardrail="Keep irreversible spend capped"
        confidencePercent={74}
        confidenceLabel="MED"
        signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
        trendLabel="Mixed"
        transitionWatch="ON"
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={false}
        trustWarningCopy=""
        failureModes={[]}
        regimeDistance={{
          dimensionLabel: "Risk appetite",
          dimensionKey: "riskAppetite",
          currentValue: 49,
          thresholdValue: 50,
          pointsToFlip: 1,
          thresholdDirection: "fallToOrBelow",
        }}
        movementVelocity="Medium"
        startupClimateIndex={{ score: 58, status: "Stable" }}
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
      />,
    );

    assert.match(html, /Threshold breached\./);
  });

  it("renders bounded rules matrix hierarchy", () => {
    const html = renderToStaticMarkup(
      <BoundedRulesMatrix
        decisionRules={[
          {
            area: "hiring",
            recommendation: "Keep backfills only.",
            doNow: ["Keep backfills only."],
            avoidNow: ["Avoid speculative hiring."],
            scope: "CFO review",
            pauseTrigger: "Tightness above 74",
            resumeTrigger: "Tightness below 65",
            rationale: "Discipline",
          },
        ]}
      />,
    );

    assert.match(html, /Decision matrix this week/);
    assert.match(html, /Do now/);
    assert.match(html, /Avoid now/);
    assert.match(html, /Guardrail/);
    assert.match(html, /Flip condition/);
  });

  it("renders collapsed context and citation footer", () => {
    const detailsHtml = renderToStaticMarkup(
      <MoreContextDisclosureBody
        startupClimateIndex={{ score: 62, status: "Stable", breakdown: [{ label: "Capital", score: 60 }] }}
        primaryDrivers={[{ label: "Capital tightness", detail: "Elevated" }]}
        whyThisCall={[{ label: "Momentum", detail: "No material change" }]}
        memoryRail={[{ label: "W-1", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
        macroOverlay={[{ label: "VC", detail: "Muted" }]}
      />,
    );
    const footerHtml = renderToStaticMarkup(
      <CitationActionFooter citationMetaLine="Posture DEFENSIVE" citation="Whether weekly brief citation" actions={<button type="button">Copy</button>} />,
    );

    assert.match(detailsHtml, /Why this call ▼/);
    assert.match(detailsHtml, /Posture history/);
    assert.match(footerHtml, /Send to team/);
    assert.match(footerHtml, /hidden sm:flex sm:flex-wrap sm:gap-3/);
    assert.match(footerHtml, /Run risk check/);
  });
});
