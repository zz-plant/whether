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
        postureLabel="Defensive"
        stageLabel="Watchful"
        netConstraintSummary="Pressure remains elevated."
        meetingShorthand="Do now: revise decisions this week."
        immediateDecision="Revise now"
        guardrail="Hold irreversible hiring"
        confidencePercent={70}
        confidenceLabel="MED"
        trendLabel="Mixed"
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
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
        startupClimateIndex={{ score: 62, status: "Stable" }}
        topContributorInline="Risk appetite (44%)"
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
      />,
    );

    assert.match(html, /weekly-posture-brief-title/);
    assert.match(html, /Do now:/);
    assert.match(html, /Current stance/);
    assert.match(html, /Flip watch:/);
    assert.match(html, /Leadership call/);
    assert.match(html, /What changed this week/);


    const heroIndex = html.indexOf("weekly-posture-brief-title");
    const playbookIndex = html.indexOf("Leadership call");
    const memoIndex = html.indexOf("What changed this week");
    assert.ok(memoIndex > heroIndex);
    assert.ok(playbookIndex > memoIndex);
  });


  it("renders the explicit you-are-here and distance copy", () => {
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel="EXPANSION"
        postureLabel="Expansion"
        stageLabel="Late"
        netConstraintSummary="Constraints eased."
        meetingShorthand="Do now: speed reversible bets."
        immediateDecision="Hold expansion posture"
        guardrail="Keep irreversible spend capped"
        confidencePercent={74}
        confidenceLabel="MED"
        trendLabel="Mixed"
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={false}
        trustWarningCopy=""
        failureModes={[]}
        regimeDistance={{
          dimensionLabel: "Tightness",
          dimensionKey: "tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
          thresholdDirection: "riseAbove",
        }}
        startupClimateIndex={{ score: 58, status: "Stable" }}
        topContributorInline="Risk appetite (44%)"
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
      />,
    );

    assert.match(html, /Current stance/);
    assert.match(html, /Flip watch: Tightness rises above 70\.0\./);
  });

  it("renders compact flip-condition distance", () => {
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel="EXPANSION"
        postureLabel="Expansion"
        stageLabel="Late"
        netConstraintSummary="Constraints eased."
        meetingShorthand="Do now: speed reversible bets."
        immediateDecision="Hold expansion posture"
        guardrail="Keep irreversible spend capped"
        confidencePercent={74}
        confidenceLabel="MED"
        trendLabel="Mixed"
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
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
        startupClimateIndex={{ score: 58, status: "Stable" }}
        topContributorInline="Risk appetite (44%)"
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
      />,
    );

    assert.match(html, /Flip watch: Risk appetite falls to or below 50\.0\./);
    assert.match(html, /Constraints eased\./);
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

    assert.match(html, /Decision snapshot for leadership this week/);
    assert.match(html, /What to do/);
    assert.match(html, /Delay:/);

  });

  it("renders collapsed context and citation footer", () => {
    const detailsHtml = renderToStaticMarkup(
      <MoreContextDisclosureBody
        startupClimateIndex={{ score: 62, status: "Stable", breakdown: [{ label: "Capital", score: 60 }] }}
        primaryDrivers={[{ label: "Capital tightness", detail: "Elevated" }]}
        whyThisCall={[{ label: "Momentum", detail: "No material change" }]}
        memoryRail={[{ label: "W-1", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
        historicalAnalogs={[]}
        macroOverlay={[{ label: "VC", detail: "Muted" }]}
      />,
    );
    const footerHtml = renderToStaticMarkup(
      <CitationActionFooter citationMetaLine="Posture DEFENSIVE" citation="Whether weekly brief citation" actions={<button type="button">Copy</button>} />,
    );

    assert.match(detailsHtml, /Why this posture call/);
    assert.match(detailsHtml, /Posture history/);
    assert.match(footerHtml, /Send to team/);
    assert.match(footerHtml, /hidden sm:flex sm:flex-wrap sm:gap-3/);
    assert.match(footerHtml, />Copy<\/button>/);
  });
});
