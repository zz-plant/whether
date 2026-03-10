import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";

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

const decisionRules: BoundedDecisionRule[] = [
  {
    area: "hiring",
    recommendation: "Keep backfills only.",
    doNow: ["Keep backfills only."],
    avoidNow: ["Avoid speculative hiring."],
    scope: "New headcount requires CFO review.",
    pauseTrigger: "Pause when tightness rises above 74.",
    resumeTrigger: "Resume when tightness falls below 65.",
    rationale: "Preserve fixed-cost discipline under pressure.",
  },
];

describe("WeeklyDecisionCard top-fold composition", () => {
  it("renders the operating console hierarchy", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
        postureDelta="Worse than last week"
        confidenceLabel="MED"
        confidencePercent={68}
        signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
        trendLabel="Improving"
        transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
        netConstraintSummary="Pressure remains elevated but stabilizing."
        guardrail="Hold irreversible hiring unless direct revenue impact is clear."
        reversalTrigger="If risk appetite rises above 55, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={reportDynamics}
        decisionShiftSummary="Decision delta: tighten roadmap optionality while protecting core delivery."
        transitionProbabilities={{ Expansion: 10, Mixed: 35, Scarcity: 40, Defensive: 15 }}
        decisionRules={decisionRules}
        roleAwareTemplates={[
          {
            role: "startup-leadership",
            roleLabel: "Startup leadership",
            doNow: "Keep delivery focused.",
            avoidNow: "Do not add fixed costs without proof.",
            flipTrigger: "Resume staged expansion when tightness and risk appetite recover.",
          },
          {
            role: "vc-partner",
            roleLabel: "VC partner",
            doNow: "Push portfolio pacing discipline.",
            avoidNow: "Avoid encouraging irreversible expansion.",
            flipTrigger: "Reopen growth pacing after two improving reads.",
          },
        ]}
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
        revisitDecisions={true}
        weeklyMovement={{ score: 1.2, direction: "defensive", summary: "Model pressure increased by +1.2 this week; tighten approvals until a reversal trigger prints." }}
        memoryRail={[{ label: "Now", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
        historicalAnalogs={[]}
        macroOverlay={[{ label: "VC funding", detail: "-4.5 · ↑ improving" }]}
        whyThisCall={[{ label: "Momentum", detail: "Capital tightness tightened this week." }]}
        primaryDrivers={[{ label: "Capital tightness", detail: "↑ tightened this week" }]}
        startupClimateIndex={{ score: 63, status: "Improving", breakdown: [{ label: "Capital availability", score: 71 }] }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        regimeVelocity={{
          status: "ok",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 4,
          lowerBoundMonths: 3,
          upperBoundMonths: 6,
          typicalRangeLabel: "3–6 months",
          displayLabel: "Expansion→Mixed typically 3–6 months",
        }}
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy weekly brief</button>}
      />,
    );

    assert.match(html, /weekly-posture-brief-title/);
    assert.match(html, /weekly-viral-hero/);
    assert.match(html, /Macro operating console/);
    assert.match(html, /Decision delta/);
    assert.match(html, /Operational meaning/);
    assert.match(html, /Operator posture/);
    assert.match(html, /Conservation/);
    assert.match(html, /Decision guidance/);
    assert.match(html, /Decisions favored/);
    assert.match(html, /Decisions discouraged/);
    assert.match(html, /Monitoring panel/);
    assert.match(html, /Weekly change indicator/);
    assert.match(html, /id="primary-artifact-actions"/);

    const heroIndex = html.indexOf("weekly-posture-brief-title");
    const deltaIndex = html.indexOf("Decision delta");
    const postureIndex = html.indexOf("Operator posture");
    const guidanceIndex = html.indexOf("Decision guidance");

    assert.ok(deltaIndex > heroIndex);
    assert.ok(postureIndex > deltaIndex);
    assert.ok(guidanceIndex > postureIndex);
  });

  it("shows fallback warning copy when snapshot mode is active", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
        postureDelta="No worse than last week"
        confidenceLabel="HIGH"
        confidencePercent={92}
        signalConfidenceReason="Reason: broad agreement across signals; boundary distance is wide"
        trendLabel="Stable"
        transitionWatch="OFF"
        operatingStanceLine="Hold approvals steady. Keep irreversible spend capped."
        weeklyMemoLines={["Market conditions are stable this week.", "Hold approvals steady. Keep irreversible spend capped.", "Regime shift watch is off: hold current pace with bounded approvals."]}
        netConstraintSummary="Fallback snapshot is stable for near-term pacing."
        guardrail="Hold irreversible hiring unless demand proves durable."
        reversalTrigger="If tightness drops below 60, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={{ directionLabel: "stable", changedSignals: [], anomalySignals: [], totalSignalChanges: 0, regimeChanged: false }}
        decisionShiftSummary="No material signal shift in fallback mode."
        transitionProbabilities={{ Expansion: 15, Mixed: 45, Scarcity: 25, Defensive: 15 }}
        decisionRules={decisionRules}
        roleAwareTemplates={[
          {
            role: "startup-leadership",
            roleLabel: "Startup leadership",
            doNow: "Keep delivery focused.",
            avoidNow: "Do not add fixed costs without proof.",
            flipTrigger: "Resume staged expansion when tightness and risk appetite recover.",
          },
          {
            role: "vc-partner",
            roleLabel: "VC partner",
            doNow: "Push portfolio pacing discipline.",
            avoidNow: "Avoid encouraging irreversible expansion.",
            flipTrigger: "Reopen growth pacing after two improving reads.",
          },
        ]}
        executiveOperationalStance={{
          expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
          avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
        }}
        revisitDecisions={false}
        weeklyMovement={{ score: 0, direction: "neutral", summary: "Model pressure is flat this week; hold posture and keep existing guardrails in force." }}
        memoryRail={[{ label: "Now", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
        historicalAnalogs={[]}
        macroOverlay={[{ label: "VC funding", detail: "-4.5 · ↑ improving" }]}
        whyThisCall={[{ label: "Reliability", detail: "Fallback snapshot in use." }]}
        primaryDrivers={[{ label: "Signal reliability", detail: "High confidence (cached snapshot)" }]}
        startupClimateIndex={{ score: 61, status: "Stable", breakdown: [{ label: "Capital availability", score: 64 }] }}
        regimeDistance={{
          dimensionLabel: "Tightness",
          currentValue: 64,
          thresholdValue: 70,
          pointsToFlip: 6,
          dimensionKey: "tightness",
          thresholdDirection: "riseAbove",
        }}
        regimeVelocity={{
          status: "insufficient_history",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 1,
          displayLabel: "Expansion→Mixed: insufficient history",
        }}
        citation="Whether weekly brief citation"
        isFallbackSnapshot={true}
      />,
    );

    assert.match(html, /Using a cached snapshot/);
    assert.match(html, /Weekly change indicator/);
    assert.match(html, /Model pressure is flat this week; hold posture and keep existing guardrails in force\./);
    assert.match(html, /weekly-viral-hero/);
  });
});
