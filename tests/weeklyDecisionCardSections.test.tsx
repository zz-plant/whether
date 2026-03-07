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
  it("renders decision call header contracts", () => {
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel="DEFENSIVE"
        netConstraintSummary="Pressure remains elevated."
        meetingShorthand="Do now: revise decisions this week."
        postureDelta="+2"
        immediateDecision="Revise now"
        guardrail="Hold irreversible hiring"
        reversalTrigger="If appetite improves"
        primaryResumeTrigger="Restart after two stable reads"
        confidencePercent={70}
        confidenceLabel="MED"
        trendLabel="Mixed"
        transitionWatch="ON"
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Confidence MED · Freshness Mar 6, 2026 · Regime shift watch ON"
        needsTrustWarning={true}
        trustWarningCopy="Use this call for near-term pacing only until confidence returns to HIGH with fresh data."
      />,
    );

    assert.match(html, /Weekly posture call/);
    assert.match(html, /In 15 seconds/);
    assert.match(html, /Regime shift watch ON/);
    assert.match(html, /Use this call for near-term pacing only/);
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
    assert.match(html, /Bounded rules \(do now \/ stop \/ restart\)/);
    assert.match(html, /Stop if:/);
    assert.match(html, /Restart when:/);
  });

  it("renders more context disclosure and citation footer", () => {
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

    assert.match(detailsHtml, /More context \(why this call \+ timeline\)/);
    assert.match(detailsHtml, /Historical memory rail/);
    assert.match(footerHtml, /Cite this call/);
    assert.match(footerHtml, /Run risk check/);
    assert.match(footerHtml, /Copy/);
  });
});
