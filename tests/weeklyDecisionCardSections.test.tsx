import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BoundedRulesMatrix,
  DecisionCallHeader,
  MoreContextDisclosureBody,
  WeeklyDecisionCard,
} from "../app/components/weeklyDecisionCard";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

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
        regimeHeader={{
          regime: "Defensive",
          confidence: "Medium (mixed signal reliability)",
          primaryRisk: "Downside: Capital tightness tightened (1.0).",
        }}
        trendLabel="Mixed"
        confidenceHistory={[
          { recordDate: "2026-02-13", confidencePercent: 64, isMissing: false },
          { recordDate: "2026-02-20", confidencePercent: 66, isMissing: false },
          { recordDate: "2026-02-27", confidencePercent: null, isMissing: true },
          { recordDate: "2026-03-06", confidencePercent: 70, isMissing: false },
        ]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[
          { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "↑", trendDeltaLabel: "+1.0 vs last week", sparkline: [62, 63, 64], isFallback: false },
          { key: "riskAppetite", label: "Risk appetite", valueLabel: "49", rawValue: 49, trendArrow: "↓", trendDeltaLabel: "-1.0 vs last week", sparkline: [51, 50, 49], isFallback: false },
          { key: "baseRate", label: "Base rate", valueLabel: "5.3", rawValue: 5.3, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [5.3], isFallback: true },
          { key: "curveSlope", label: "Yield curve slope", valueLabel: "-0.2", rawValue: -0.2, trendArrow: "↑", trendDeltaLabel: "+0.1 vs last week", sparkline: [-0.3, -0.2], isFallback: false },
        ]}
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={true}
        trustWarningCopy="Use this call for near-term pacing only until confidence returns to HIGH with fresh data."
        failureModes={[{ id: "boundary-whipsaw", warning: "Boundary whipsaw risk", mitigationCheck: "Mitigation check" }]}
        sinceLastReview={{
          isReturningUser: true,
          hasMeaningfulDelta: true,
          fallbackCopy: "",
          items: [
            { id: "top-driver", label: "Top driver change", detail: "Capital tightness tightened. Slow approvals and preserve runway.", href: "/evidence" },
          ],
        }}
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
    assert.match(html, /Market posture/);
    assert.match(html, /What would change this call/);
    assert.doesNotMatch(html, /Data through Mar 6, 2026/);
    assert.match(html, /Top driver change/);
    assert.match(html, /Confidence/);
    const heroIndex = html.indexOf("weekly-posture-brief-title");
    const memoIndex = html.indexOf("What changed this week");
    assert.ok(memoIndex > heroIndex);
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
        regimeHeader={{
          regime: "Defensive",
          confidence: "Medium (mixed signal reliability)",
          primaryRisk: "Downside: Capital tightness tightened (1.0).",
        }}
        trendLabel="Mixed"
        confidenceHistory={[
          { recordDate: "2026-02-13", confidencePercent: 64, isMissing: false },
          { recordDate: "2026-02-20", confidencePercent: 66, isMissing: false },
          { recordDate: "2026-02-27", confidencePercent: null, isMissing: true },
          { recordDate: "2026-03-06", confidencePercent: 70, isMissing: false },
        ]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[
          { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "↑", trendDeltaLabel: "+1.0 vs last week", sparkline: [62, 63, 64], isFallback: false },
          { key: "riskAppetite", label: "Risk appetite", valueLabel: "49", rawValue: 49, trendArrow: "↓", trendDeltaLabel: "-1.0 vs last week", sparkline: [51, 50, 49], isFallback: false },
          { key: "baseRate", label: "Base rate", valueLabel: "5.3", rawValue: 5.3, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [5.3], isFallback: true },
          { key: "curveSlope", label: "Yield curve slope", valueLabel: "-0.2", rawValue: -0.2, trendArrow: "↑", trendDeltaLabel: "+0.1 vs last week", sparkline: [-0.3, -0.2], isFallback: false },
        ]}
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={false}
        trustWarningCopy=""
        failureModes={[]}
        sinceLastReview={{
          isReturningUser: true,
          hasMeaningfulDelta: true,
          fallbackCopy: "",
          items: [
            { id: "top-driver", label: "Top driver change", detail: "Risk appetite improved. Recheck reversible approvals.", href: "/evidence" },
          ],
        }}
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

    assert.match(html, /Market posture/);
    assert.match(html, /What would change this call/);
    assert.match(html, /Tightness above 70\.0/);
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
        regimeHeader={{
          regime: "Defensive",
          confidence: "Medium (mixed signal reliability)",
          primaryRisk: "Downside: Capital tightness tightened (1.0).",
        }}
        trendLabel="Mixed"
        confidenceHistory={[
          { recordDate: "2026-02-13", confidencePercent: 64, isMissing: false },
          { recordDate: "2026-02-20", confidencePercent: 66, isMissing: false },
          { recordDate: "2026-02-27", confidencePercent: null, isMissing: true },
          { recordDate: "2026-03-06", confidencePercent: 70, isMissing: false },
        ]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[
          { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "↑", trendDeltaLabel: "+1.0 vs last week", sparkline: [62, 63, 64], isFallback: false },
          { key: "riskAppetite", label: "Risk appetite", valueLabel: "49", rawValue: 49, trendArrow: "↓", trendDeltaLabel: "-1.0 vs last week", sparkline: [51, 50, 49], isFallback: false },
          { key: "baseRate", label: "Base rate", valueLabel: "5.3", rawValue: 5.3, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [5.3], isFallback: true },
          { key: "curveSlope", label: "Yield curve slope", valueLabel: "-0.2", rawValue: -0.2, trendArrow: "↑", trendDeltaLabel: "+0.1 vs last week", sparkline: [-0.3, -0.2], isFallback: false },
        ]}
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
        freshnessLabel="Mar 6, 2026"
        trustCueLine="Cached snapshot (Mar 6, 2026): use for pacing and defer irreversible commitments."
        needsTrustWarning={false}
        trustWarningCopy=""
        failureModes={[]}
        sinceLastReview={{
          isReturningUser: true,
          hasMeaningfulDelta: true,
          fallbackCopy: "",
          items: [
            { id: "top-driver", label: "Top driver change", detail: "Risk appetite neared the flip band.", href: "/evidence" },
          ],
        }}
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

    assert.match(html, /What would change this call/);
    assert.match(html, /Risk appetite at or below 50\.0/);
    assert.match(html, /Constraints eased\./);
  });


  it("renders confidence mini-chart fallback markers in regime panel", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({
          status: {
            statusLabel: "DEFENSIVE",
            postureLabel: "Defensive",
            stageLabel: "Watchful",
            postureDelta: "No worse than last week",
            confidenceLabel: "MED",
            confidencePercent: 69,
            signalConfidenceReason: "Boundary distance is moderate.",
            regimeHeader: { regime: "Defensive", confidence: "Medium", primaryRisk: "Tightness still elevated." },
            trendLabel: "Mixed",
            confidenceHistory: [
              { recordDate: "2026-01-30", confidencePercent: 62, isMissing: false },
              { recordDate: "2026-02-06", confidencePercent: null, isMissing: true },
              { recordDate: "2026-02-13", confidencePercent: 66, isMissing: false },
            ],
            confidenceTrend: "unstable",
            transitionWatch: "ON",
          },
          decision: {
            operatingStanceLine: "Hold reversible pace.",
            weeklyMemoLines: ["Signals are mixed."],
            netConstraintSummary: "Risk still elevated",
            guardrail: "Do not commit irreversible spend",
            reversalTrigger: "Flip when tightness falls",
            reportDynamics: { changedSignals: [], anomalySignals: [], totalSignalChanges: 0, regimeChanged: false, directionLabel: "stable" },
            decisionShiftSummary: "No major shift",
            transitionProbabilities: { Scarcity: 0.2, Defensive: 0.5, Mixed: 0.2, Expansion: 0.1 },
            decisionRules: [],
            roleAwareTemplates: [],
            executiveOperationalStance: { expand: [], avoid: [] },
            revisitDecisions: false,
            weeklyMovement: { score: 0, direction: "neutral", summary: "steady" },
          },
          diagnostics: {
            regimeSignalIndicators: [],
            startupClimateIndex: { score: 50, status: "Stable", breakdown: [] },
            regimeDistance: {
              dimensionLabel: "Tightness",
              dimensionKey: "tightness",
              currentValue: 64,
              thresholdValue: 70,
              pointsToFlip: 6,
              thresholdDirection: "riseAbove",
            },
            regimeVelocity: { status: "insufficient_history", from: "Defensive", to: "Defensive", sampleSize: 0, displayLabel: "Flat" },
            whyThisCall: [],
            evidenceItems: [],
          },
          history: {
            memoryRail: [],
            historicalTimeline: [],
            historicalAnalogs: [],
            lastYearComparison: null,
            macroOverlay: [],
          },
          artifact: {
            citation: "citation",
            recordDateLabel: "Mar 6, 2026",
            fetchedAtLabel: "Mar 6, 2026",
          },
        })}
      />,
    );

    assert.match(html, /Confidence check/);
    assert.match(html, /Last read -&gt; This week -&gt; Threshold/);
    assert.match(html, /1 missing week in the 8-week window\./);
    assert.match(html, /Read continuity/);
    assert.match(html, /2026-02-06: missing confidence read/);
  });

  it("keeps missing signal detail copy neutral when delta cards are already present", () => {
    const model = buildWeeklyDecisionCardModel({
      diagnostics: {
        regimeSignalIndicators: [],
      },
      sinceLastReview: {
        hasMeaningfulDelta: true,
        items: [
          { id: "top-driver", label: "Top driver change", detail: "Capital tightness tightened.", href: "/evidence" },
        ],
      },
    });
    const html = renderToStaticMarkup(
      <DecisionCallHeader
        statusLabel={model.status.statusLabel}
        postureLabel={model.status.postureLabel}
        stageLabel={model.status.stageLabel}
        postureWithStageLabel={model.status.postureWithStageLabel}
        immediateDecision={model.decision.immediateDecision}
        operatingStanceLine={model.decision.operatingStanceLine}
        confidencePercent={model.status.confidencePercent}
        confidenceLabel={model.status.confidenceLabel}
        trendLabel={model.status.trendLabel}
        transitionWatch={model.status.transitionWatch}
        regimeDistance={model.diagnostics.regimeDistance}
        fetchedAtLabel={model.artifact.fetchedAtLabel}
        freshnessLine={model.artifact.freshnessLine}
        weeklyMovement={model.decision.weeklyMovement}
        regimeSignalIndicators={model.diagnostics.regimeSignalIndicators}
        sinceLastReview={model.sinceLastReview}
        whyItMattersLine={model.presentation?.whyItMattersLine}
        readThisCardItems={model.presentation?.readThisCardItems}
        glossaryHref={model.presentation?.glossaryHref}
      />,
    );

    assert.match(html, /Signal detail not yet available\./);
    assert.doesNotMatch(html, /Signal-level detail is still loading/);
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
            flipConditions: [{ metric: "tightness", operator: "<", value: 65, label: "Tightness < 65" }],
            rationale: "Discipline",
          },
        ]}
      />,
    );

    assert.match(html, /Decision rules/);
    assert.match(html, /Allowed now/);
    assert.match(html, /Caution line/);
    assert.match(html, /Reopen \/ flip/);

  });



  it("renders ordered transitions with hover metadata and history links", () => {
    const detailsHtml = renderToStaticMarkup(
      <MoreContextDisclosureBody
        startupClimateIndex={{ score: 62, status: "Stable", breakdown: [{ label: "Capital", score: 60 }] }}
        evidenceItems={[{ key: "tightness", title: "Capital conditions", supportingBullets: ["Weekly move: +1.0 vs. prior snapshot."], confidenceLabel: "Medium", directionLabel: "Tightening", immediateImplication: "Tighten approvals and protect runway for fixed-cost commitments." }]}
        whyThisCall={[{ label: "Momentum", detail: "No material change" }]}
        memoryRail={[{ label: "W-1", posture: "Defensive" }]}
        historicalTimeline={[
          { label: "Jan 31, 2026", posture: "Defensive", month: 1, year: 2026, recordDate: "2026-01-31", summary: "Hold approvals" },
          { label: "Feb 28, 2026", posture: "Scarcity", month: 2, year: 2026, recordDate: "2026-02-28", summary: "Tighten hiring" },
        ]}
        historicalAnalogs={[]}
        lastYearComparison={null}
        macroOverlay={[{ label: "VC", detail: "Muted" }]}
      />,
    );

    assert.match(detailsHtml, /Posture change timeline/);
    assert.match(detailsHtml, /\/?month=1&amp;year=2026/);
    assert.match(detailsHtml, /2026-01-31 · Hold approvals/);
  });

  it("renders collapsed context and keeps share and cite content consolidated", () => {
    const detailsHtml = renderToStaticMarkup(
      <MoreContextDisclosureBody
        startupClimateIndex={{ score: 62, status: "Stable", breakdown: [{ label: "Capital", score: 60 }] }}
        evidenceItems={[{ key: "tightness", title: "Capital conditions", supportingBullets: ["Weekly move: +1.0 vs. prior snapshot."], confidenceLabel: "Medium", directionLabel: "Tightening", immediateImplication: "Tighten approvals and protect runway for fixed-cost commitments." }]}
        whyThisCall={[{ label: "Momentum", detail: "No material change" }]}
        memoryRail={[{ label: "W-1", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
        historicalAnalogs={[]}
        lastYearComparison={null}
        macroOverlay={[{ label: "VC", detail: "Muted" }]}
      />,
    );
    const cardHtml = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({})}
        actions={<button type="button">Copy citation</button>}
      />,
    );

    assert.match(detailsHtml, /Why this posture call/);
    assert.match(detailsHtml, /Posture history/);
    assert.match(cardHtml, /Send this brief/);
    assert.match(cardHtml, /Citation/);
    assert.match(cardHtml, /Copy citation/);
    assert.doesNotMatch(cardHtml, /Use this citation in meeting notes, board updates, or operating memos\./);
    assert.doesNotMatch(cardHtml, /Share actions stay in the transmission rail above\./);
  });
});
