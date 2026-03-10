import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import { HomeInterpretationPanel } from "../app/components/homeInterpretationPanel";
import { HomeFirstRunOrientation } from "../app/components/homeFirstRunOrientation";
import { buildInterpretationLayer } from "../lib/report/interpretationLayer";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { ForecastModel } from "../lib/report/forecastModel";

const reportDynamics: ReportDynamics = {
  directionLabel: "stable",
  totalSignalChanges: 1,
  regimeChanged: false,
  changedSignals: [{ key: "tightness", label: "Cash tightness", delta: 1 }],
  anomalySignals: [],
};

const decisionRules: BoundedDecisionRule[] = [
  {
    area: "hiring",
    recommendation: "Backfills only.",
    doNow: ["Backfills only."],
    avoidNow: ["Avoid speculative hiring."],
    scope: "",
    pauseTrigger: "Pause if tightness rises above 72.",
    resumeTrigger: "Resume if tightness falls below 64.",
    rationale: "",
  },
];

const assessment = {
  regime: "DEFENSIVE",
  policyAssessment: { posture: "TRANSITION" },
  scores: { tightness: 72, riskAppetite: 44, baseRateUsed: "1M", baseRate: 4.9, curveSlope: -0.18 },
  constraints: ["Preserve runway."],
} as unknown as RegimeAssessment;

const forecast: ForecastModel = {
  next4WeekProbabilities: { Expansion: 7, Mixed: 19, Scarcity: 43, Defensive: 31 },
  next90DayProbabilities: { Expansion: 7, Mixed: 19, Scarcity: 43, Defensive: 31 },
  boundaryPressure: {
    distance: 3,
    momentum: "toward-threshold",
    crossingRisk: "high",
  },
  signalTrajectory: { tightness: "deteriorating", riskAppetite: "deteriorating", yieldCurveProxy: "stable" },
};

const homeBriefModel = {
  decisionShiftSummary: "Decision delta: tighten optional spend this week.",
  guardrail: "Guardrail: pause non-core hiring.",
  reversalTrigger: "Reversal: reopen if risk appetite rises above 55.",
  macroOverlay: [{ label: "Sector sensitivity", detail: "Consumer demand is softer than baseline." }],
} as ReturnType<typeof import("../lib/report/homeBriefModel").buildHomeBriefModel>;

describe("weekly card and interpretation panel composition", () => {
  it("keeps top-fold semantics while layering interpretation bullets below", () => {
    const layer = buildInterpretationLayer({
      view: "company",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
    });

    const html = renderToStaticMarkup(
      <>
        <WeeklyDecisionCard
          statusLabel="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
          postureDelta="Worse than last week"
          confidenceLabel="MED"
          confidencePercent={68}
          signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
          trendLabel="Stable"
          transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
          netConstraintSummary="Pressure remains elevated."
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
        />
        <HomeInterpretationPanel layer={layer} searchParams={{ view: "company", month: "3", year: "2026" }} />
      </>,
    );

    assert.match(html, /Weekly Posture — Decision Call/);
    assert.match(html, /Founder playbook/);
    assert.match(html, /Weekly memo \(shareable\)/);
    assert.match(html, /Signal confidence/);
    assert.match(html, /Action/);
    assert.match(html, /Interpretation layer/);
    assert.match(html, /Company view/);
    assert.match(html, /• Action:/);
    assert.match(html, /Trigger:/);
    assert.match(html, /Reverse:/);
    assert.match(html, /Role-aware operating templates/);
    assert.match(html, /Do now/);
    assert.match(html, /Avoid now/);
  });
  it("renders weekly card before interpretation panel and preserves top-fold hierarchy", () => {
    const layer = buildInterpretationLayer({
      view: "forecast",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
    });

    const html = renderToStaticMarkup(
      <>
        <WeeklyDecisionCard
          statusLabel="DEFENSIVE"
        postureLabel="Defensive"
        stageLabel="Watchful"
        postureWithStageLabel="Defensive — Watchful"
          postureDelta="Worse than last week"
          confidenceLabel="MED"
          confidencePercent={68}
          signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
          trendLabel="Stable"
          transitionWatch="ON"
        operatingStanceLine="Stage decisions. Avoid irreversible spend."
        weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
          netConstraintSummary="Pressure remains elevated."
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
        />
        <HomeInterpretationPanel layer={layer} searchParams={{ view: "forecast" }} />
      </>,
    );

    const heroIndex = html.indexOf("Weekly Posture — Decision Call");
    const playbookIndex = html.indexOf("Founder playbook");
    const confidenceIndex = html.indexOf("Signal confidence");
    const instructionIndex = html.indexOf("Action");
    const interpretationIndex = html.indexOf("Interpretation layer");

    assert.ok(heroIndex > -1);
    assert.ok(confidenceIndex > heroIndex);
    assert.ok(playbookIndex > confidenceIndex);
    assert.ok(instructionIndex > playbookIndex);
    assert.ok(interpretationIndex > instructionIndex);
  });


  it("renders orientation strip before the weekly decision card without replacing core card content", () => {
    const html = renderToStaticMarkup(
      <>
        <HomeFirstRunOrientation
          changeSummary="Decision delta: tighten optional spend this week."
          decisionNow="Stage decisions and protect runway while transition watch is on."
          destinations={[
            { href: "/signals", label: "Signals", description: "Inspect drivers, thresholds, and historical signal context." },
            { href: "/operations", label: "Operations", description: "Apply hiring, spend, and cadence guardrails to execution." },
            { href: "/decide", label: "Decide", description: "Translate posture guidance into role-specific choices." },
          ]}
        />
        <WeeklyDecisionCard
          statusLabel="DEFENSIVE"
          postureLabel="Defensive"
          stageLabel="Watchful"
          postureWithStageLabel="Defensive — Watchful"
          postureDelta="Worse than last week"
          confidenceLabel="MED"
          confidencePercent={68}
          signalConfidenceReason="Reason: regime boundary proximity + volatile macro signals"
          trendLabel="Stable"
          transitionWatch="ON"
          operatingStanceLine="Stage decisions. Avoid irreversible spend."
          weeklyMemoLines={["Market conditions tightened this week.", "Stage decisions. Avoid irreversible spend.", "Regime shift watch is on: stage approvals and preserve runway."]}
          netConstraintSummary="Pressure remains elevated."
          guardrail="Hold irreversible hiring unless direct revenue impact is clear."
          reversalTrigger="If risk appetite rises above 55, reopen selective hiring."
          recordDateLabel="Mar 5, 2026"
          fetchedAtLabel="Mar 6, 2026 09:12 UTC"
          reportDynamics={reportDynamics}
          decisionShiftSummary="Decision delta: tighten roadmap optionality while protecting core delivery."
          transitionProbabilities={{ Expansion: 10, Mixed: 35, Scarcity: 40, Defensive: 15 }}
          decisionRules={decisionRules}
          roleAwareTemplates={[]}
          executiveOperationalStance={{
            expand: ["Increase product tempo for reversible bets", "Selective hiring for revenue-linked roles"],
            avoid: ["net-new hiring if tightness > 74", "long-payback bets if risk appetite < 44"],
          }}
          revisitDecisions={true}
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
        />
      </>,
    );

    const orientationIndex = html.indexOf("Fast orientation for this week");
    const cardIndex = html.indexOf("Weekly Posture — Decision Call");

    assert.ok(orientationIndex > -1);
    assert.ok(cardIndex > orientationIndex);
    assert.match(html, /Decision delta: tighten optional spend this week\./);
    assert.match(html, /Skip intro/);
  });

});
