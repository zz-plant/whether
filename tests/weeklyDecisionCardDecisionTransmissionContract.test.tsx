import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";

const reportDynamics: ReportDynamics = {
  directionLabel: "deteriorating",
  totalSignalChanges: 2,
  regimeChanged: false,
  changedSignals: [
    { key: "tightness", label: "Cash tightness", delta: 3 },
    { key: "riskAppetite", label: "Risk appetite", delta: -2 },
  ],
  anomalySignals: [],
};

describe("WeeklyDecisionCard decision-transmission contract", () => {
  it("dedupes canonical flip conditions before rendering snapshot callouts", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        regimeKey="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
        postureDelta="Worse than last week"
        confidenceLabel="MED"
        confidencePercent={68}
        signalConfidenceReason="Reason"
        regimeHeader={{ regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" }}
        trendLabel="Deteriorating"
        confidenceHistory={[]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[]}
        transitionWatch="ON"
        operatingStanceLine="Stage approvals and protect runway."
        weeklyMemoLines={["Signals tightened this week."]}
        netConstraintSummary="Pressure elevated"
        guardrail="Guardrail: pause non-core hiring."
        reversalTrigger="Flip when tightness falls below 65 and holds."
        actionNowShort="Pause net-new fixed burn commitments this week."
        compactFlipConditionLabels={["Tightness < 65", "Risk appetite > 50"]}
        canonicalDecisionCopy={{
          currentRegimeLabel: "Defensive — Watchful",
          operatingCall: "Stage approvals and protect runway.",
          doNowLines: ["Pause net-new fixed burn commitments this week."],
          flipTrigger: "Flip when tightness falls below 65 and holds.",
          flipConditions: ["Tightness < 65", "Tightness < 65", "Risk appetite > 50"],
        }}
        recordDateLabel="Mar 7, 2026"
        fetchedAtLabel="Mar 8, 2026"
        reportDynamics={reportDynamics}
        decisionShiftSummary="delta"
        transitionProbabilities={{ Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 }}
        decisionRules={[]}
        roleAwareTemplates={[]}
        executiveOperationalStance={{ expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] }}
        revisitDecisions={true}
        weeklyMovement={{ score: 1, direction: "defensive", summary: "Movement" }}
        memoryRail={[]}
        historicalTimeline={[]}
        historicalAnalogs={[]}
        macroOverlay={[]}
        whyThisCall={[]}
        evidenceItems={[]}
        startupClimateIndex={{ score: 63, status: "Improving", breakdown: [] }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 68,
          thresholdValue: 70,
          pointsToFlip: 2,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        regimeVelocity={{
          status: "ok",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 3,
          lowerBoundMonths: 2,
          upperBoundMonths: 5,
          typicalRangeLabel: "2–5 months",
          displayLabel: "Expansion→Mixed typically 2–5 months",
        }}
        citation="Citation"
      />,
    );

    const duplicateCount = html.split("Tightness &lt; 65").length - 1;
    assert.equal(duplicateCount, 1);
  });

  it("keeps top-fold sequence canonical: Regime, Call, Do now, Flip conditions", () => {
    // Contract: top-fold sequence must stay stable for one-screen decision transmission.
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        regimeKey="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
        postureDelta="Worse than last week"
        confidenceLabel="MED"
        confidencePercent={68}
        signalConfidenceReason="Reason"
        regimeHeader={{ regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" }}
        trendLabel="Deteriorating"
        confidenceHistory={[]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[]}
        transitionWatch="ON"
        operatingStanceLine="Stage approvals and protect runway."
        weeklyMemoLines={["Signals tightened this week."]}
        netConstraintSummary="Pressure elevated"
        guardrail="Guardrail: pause non-core hiring."
        reversalTrigger="Flip when tightness falls below 65 and holds."
        actionNowShort="Pause net-new fixed burn commitments this week."
        compactFlipConditionLabels={["Tightness < 65", "Risk appetite > 50"]}
        canonicalDecisionCopy={{
          currentRegimeLabel: "Defensive — Watchful",
          operatingCall: "Stage approvals and protect runway.",
          doNowLines: ["Pause net-new fixed burn commitments this week."],
          flipTrigger: "Flip when tightness falls below 65 and holds.",
          flipConditions: ["Tightness < 65", "Risk appetite > 50"],
        }}
        recordDateLabel="Mar 7, 2026"
        fetchedAtLabel="Mar 8, 2026"
        reportDynamics={reportDynamics}
        decisionShiftSummary="delta"
        transitionProbabilities={{ Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 }}
        decisionRules={[]}
        roleAwareTemplates={[]}
        executiveOperationalStance={{ expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] }}
        revisitDecisions={true}
        weeklyMovement={{ score: 1, direction: "defensive", summary: "Movement" }}
        memoryRail={[]}
        historicalTimeline={[]}
        historicalAnalogs={[]}
        macroOverlay={[]}
        whyThisCall={[]}
        evidenceItems={[]}
        startupClimateIndex={{ score: 63, status: "Improving", breakdown: [] }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 68,
          thresholdValue: 70,
          pointsToFlip: 2,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        regimeVelocity={{
          status: "ok",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 3,
          lowerBoundMonths: 2,
          upperBoundMonths: 5,
          typicalRangeLabel: "2–5 months",
          displayLabel: "Expansion→Mixed typically 2–5 months",
        }}
        citation="Citation"
      />,
    );

    const regimeIndex = html.indexOf("Regime");
    const callIndex = html.indexOf("Operating call");
    const doNowIndex = html.indexOf("Do now");
    const flipIndex = html.indexOf("Flip conditions");

    assert.ok(regimeIndex >= 0);
    assert.ok(callIndex > regimeIndex);
    assert.ok(doNowIndex > callIndex);
    assert.ok(flipIndex > doNowIndex);
  });

  it("keeps secondary diagnostics under disclosure", () => {
    // Contract: secondary diagnostics must remain behind disclosure / below fold.
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        regimeKey="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
        postureDelta="Worse"
        confidenceLabel="MED"
        confidencePercent={68}
        signalConfidenceReason="Reason"
        regimeHeader={{ regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" }}
        trendLabel="Deteriorating"
        confidenceHistory={[]}
        confidenceTrend="unstable"
        regimeSignalIndicators={[]}
        transitionWatch="ON"
        operatingStanceLine="Stage approvals and protect runway."
        weeklyMemoLines={["Signals tightened this week."]}
        netConstraintSummary="Pressure elevated"
        guardrail="Guardrail"
        reversalTrigger="Flip trigger"
        actionNowShort="Pause net-new fixed burn commitments this week."
        recordDateLabel="Mar 7, 2026"
        fetchedAtLabel="Mar 8, 2026"
        reportDynamics={reportDynamics}
        decisionShiftSummary="delta"
        transitionProbabilities={{ Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 }}
        decisionRules={[]}
        roleAwareTemplates={[]}
        executiveOperationalStance={{ expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] }}
        revisitDecisions={true}
        weeklyMovement={{ score: 1, direction: "defensive", summary: "Movement" }}
        memoryRail={[]}
        historicalTimeline={[]}
        historicalAnalogs={[]}
        macroOverlay={[]}
        whyThisCall={[]}
        evidenceItems={[]}
        startupClimateIndex={{ score: 63, status: "Improving", breakdown: [] }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 68,
          thresholdValue: 70,
          pointsToFlip: 2,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        regimeVelocity={{
          status: "ok",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 3,
          lowerBoundMonths: 2,
          upperBoundMonths: 5,
          typicalRangeLabel: "2–5 months",
          displayLabel: "Expansion→Mixed typically 2–5 months",
        }}
        citation="Citation"
      />,
    );

    assert.match(html, /<summary[^>]*>Secondary diagnostics<\/summary>/);
    assert.match(html, /Trend:/);
    assert.match(html, /Confidence:/);
  });
});
