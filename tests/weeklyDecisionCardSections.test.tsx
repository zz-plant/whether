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
        trendLabel="Mixed"
        transitionWatch="ON"
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Confidence MED · Freshness Mar 6, 2026 · Regime shift watch ON"
        needsTrustWarning={true}
        trustWarningCopy="Use this call for near-term pacing only until confidence returns to HIGH with fresh data."
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        movementVelocity="Low"
      />,
    );

    assert.match(html, /Weekly posture call/);
    assert.match(html, /Macro posture dial/);
    assert.match(html, /Primary guardrail/);
    assert.match(html, /Flip trigger/);
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
        trendLabel="Mixed"
        transitionWatch="ON"
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Confidence MED · Freshness Mar 6, 2026 · Regime shift watch ON"
        needsTrustWarning={false}
        trustWarningCopy=""
        regimeDistance={{
          dimensionLabel: "Risk appetite",
          dimensionKey: "riskAppetite",
          currentValue: 49,
          thresholdValue: 50,
          pointsToFlip: 1,
          thresholdDirection: "fallToOrBelow",
        }}
        movementVelocity="Medium"
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
            scope: "CFO review",
            pauseTrigger: "Tightness above 74",
            resumeTrigger: "Tightness below 65",
            rationale: "Discipline",
          },
        ]}
      />,
    );

    assert.match(html, /Decision matrix this week/);
    assert.match(html, /Stop if/);
    assert.match(html, /Restart when/);
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
