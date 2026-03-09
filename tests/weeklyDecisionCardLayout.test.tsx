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
        postureDelta="Worse than last week"
        confidenceLabel="MED"
        confidencePercent={68}
        trendLabel="Improving"
        transitionWatch="ON"
        netConstraintSummary="Pressure remains elevated but stabilizing."
        guardrail="Hold irreversible hiring unless direct revenue impact is clear."
        reversalTrigger="If risk appetite rises above 55, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={reportDynamics}
        decisionShiftSummary="Decision delta: tighten roadmap optionality while protecting core delivery."
        decisionRules={decisionRules}
        revisitDecisions={true}
        memoryRail={[{ label: "Now", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
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
        citation="Whether weekly brief citation"
        actions={<button type="button">Copy weekly brief</button>}
      />,
    );

    assert.match(html, /Weekly posture call/);
    assert.match(html, /This week in 15 seconds/);
    assert.match(html, /Macro posture band/);
    assert.match(html, /points to flip/);
    assert.match(html, /Decision matrix this week/);
    assert.match(html, /Posture/);
    assert.match(html, /Movement/);
    assert.match(html, /Confidence/);
    assert.match(html, /Action/);
    assert.match(html, /Movement/);
    assert.match(html, /Velocity:/);
    assert.match(html, /id="primary-artifact-actions"/);
    assert.match(html, /Jump to copy actions/);
  });

  it("shows fallback warning copy when snapshot mode is active", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        statusLabel="DEFENSIVE"
        postureDelta="No worse than last week"
        confidenceLabel="HIGH"
        confidencePercent={92}
        trendLabel="Stable"
        transitionWatch="OFF"
        netConstraintSummary="Fallback snapshot is stable for near-term pacing."
        guardrail="Hold irreversible hiring unless demand proves durable."
        reversalTrigger="If tightness drops below 60, reopen selective hiring."
        recordDateLabel="Mar 5, 2026"
        fetchedAtLabel="Mar 6, 2026 09:12 UTC"
        reportDynamics={{ directionLabel: "stable", changedSignals: [], anomalySignals: [], totalSignalChanges: 0, regimeChanged: false }}
        decisionShiftSummary="No material signal shift in fallback mode."
        decisionRules={decisionRules}
        revisitDecisions={false}
        memoryRail={[{ label: "Now", posture: "Defensive" }]}
        historicalTimeline={[{ label: "2026", posture: "Defensive" }]}
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
        citation="Whether weekly brief citation"
        isFallbackSnapshot={true}
      />,
    );

    assert.match(html, /Using a cached snapshot/);
    assert.match(html, /Flip condition/);
    assert.equal((html.match(/style="width:0%"/g) ?? []).length, 4);
  });
});
