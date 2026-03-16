import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

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
  it("renders a single canonical flip trigger in the snapshot callouts", () => {
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({
          status: {
            statusLabel: "DEFENSIVE",
            regimeKey: "DEFENSIVE",
            postureLabel: "Defensive",
            stageLabel: "Watchful",
            postureWithStageLabel: "Defensive — Watchful",
            postureDelta: "Worse than last week",
            confidenceLabel: "MED",
            confidencePercent: 68,
            signalConfidenceReason: "Reason",
            regimeHeader: { regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" },
            trendLabel: "Deteriorating",
            confidenceHistory: [],
            confidenceTrend: "unstable",
            transitionWatch: "ON",
          },
          decision: {
            operatingStanceLine: "Stage approvals and protect runway.",
            weeklyMemoLines: ["Signals tightened this week."],
            netConstraintSummary: "Pressure elevated",
            guardrail: "Guardrail: pause non-core hiring.",
            reversalTrigger: "Flip when tightness falls below 65 and holds.",
            actionNowShort: "Pause net-new fixed burn commitments this week.",
            compactFlipConditionLabels: ["Tightness < 65", "Risk appetite > 50"],
            canonicalDecisionCopy: {
              currentRegimeLabel: "Defensive — Watchful",
              operatingCall: "Stage approvals and protect runway.",
              doNowLines: ["Pause net-new fixed burn commitments this week."],
              flipTrigger: "Flip when tightness falls below 65 and holds.",
              flipConditions: ["Tightness < 65", "Tightness < 65", "Risk appetite > 50"],
            },
            reportDynamics,
            decisionShiftSummary: "delta",
            transitionProbabilities: { Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 },
            decisionRules: [],
            roleAwareTemplates: [],
            executiveOperationalStance: { expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] },
            revisitDecisions: true,
            weeklyMovement: { score: 1, direction: "defensive", summary: "Movement" },
          },
          diagnostics: {
            regimeSignalIndicators: [],
            startupClimateIndex: { score: 63, status: "Improving", breakdown: [] },
            regimeDistance: {
              dimensionLabel: "Tightness",
              currentValue: 68,
              thresholdValue: 70,
              pointsToFlip: 2,
              dimensionKey: "tightness",
              thresholdDirection: "riseAbove",
            },
            regimeVelocity: {
              status: "ok",
              from: "Expansion",
              to: "Mixed",
              sampleSize: 3,
              lowerBoundMonths: 2,
              upperBoundMonths: 5,
              typicalRangeLabel: "2–5 months",
              displayLabel: "Expansion→Mixed typically 2–5 months",
            },
            whyThisCall: [],
            evidenceItems: [],
          },
          history: {
            memoryRail: [],
            historicalTimeline: [],
            historicalAnalogs: [],
            macroOverlay: [],
          },
          artifact: {
            citation: "Citation",
            recordDateLabel: "Mar 7, 2026",
            fetchedAtLabel: "Mar 8, 2026",
          },
        })}
      />,
    );

    const snapshotRegion = html.slice(html.indexOf("Weekly call snapshot"), html.indexOf("This week&#x27;s call"));
    const flipWatchCount = (snapshotRegion.match(/Flip watch/g) ?? []).length;
    assert.equal(flipWatchCount, 1);
    assert.match(html, /Current read/);
    assert.match(html, /Cloudy/);
    assert.match(html, /stay selective and keep efficiency layers on/i);
  });

  it("keeps top-fold sequence canonical: posture, call, do now, flip when", () => {
    // Contract: top-fold sequence must stay stable for one-screen decision transmission.
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({
          status: {
            statusLabel: "DEFENSIVE",
            regimeKey: "DEFENSIVE",
            postureLabel: "Defensive",
            stageLabel: "Watchful",
            postureWithStageLabel: "Defensive — Watchful",
            postureDelta: "Worse than last week",
            confidenceLabel: "MED",
            confidencePercent: 68,
            signalConfidenceReason: "Reason",
            regimeHeader: { regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" },
            trendLabel: "Deteriorating",
            confidenceHistory: [],
            confidenceTrend: "unstable",
            transitionWatch: "ON",
          },
          decision: {
            operatingStanceLine: "Stage approvals and protect runway.",
            weeklyMemoLines: ["Signals tightened this week."],
            netConstraintSummary: "Pressure elevated",
            guardrail: "Guardrail: pause non-core hiring.",
            reversalTrigger: "Flip when tightness falls below 65 and holds.",
            actionNowShort: "Pause net-new fixed burn commitments this week.",
            compactFlipConditionLabels: ["Tightness < 65", "Risk appetite > 50"],
            canonicalDecisionCopy: {
              currentRegimeLabel: "Defensive — Watchful",
              operatingCall: "Stage approvals and protect runway.",
              doNowLines: ["Pause net-new fixed burn commitments this week."],
              flipTrigger: "Flip when tightness falls below 65 and holds.",
              flipConditions: ["Tightness < 65", "Risk appetite > 50"],
            },
            reportDynamics,
            decisionShiftSummary: "delta",
            transitionProbabilities: { Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 },
            decisionRules: [],
            roleAwareTemplates: [],
            executiveOperationalStance: { expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] },
            revisitDecisions: true,
            weeklyMovement: { score: 1, direction: "defensive", summary: "Movement" },
          },
          diagnostics: {
            regimeSignalIndicators: [],
            startupClimateIndex: { score: 63, status: "Improving", breakdown: [] },
            regimeDistance: {
              dimensionLabel: "Tightness",
              currentValue: 68,
              thresholdValue: 70,
              pointsToFlip: 2,
              dimensionKey: "tightness",
              thresholdDirection: "riseAbove",
            },
            regimeVelocity: {
              status: "ok",
              from: "Expansion",
              to: "Mixed",
              sampleSize: 3,
              lowerBoundMonths: 2,
              upperBoundMonths: 5,
              typicalRangeLabel: "2–5 months",
              displayLabel: "Expansion→Mixed typically 2–5 months",
            },
            whyThisCall: [],
            evidenceItems: [],
          },
          history: {
            memoryRail: [],
            historicalTimeline: [],
            historicalAnalogs: [],
            macroOverlay: [],
          },
          artifact: {
            citation: "Citation",
            recordDateLabel: "Mar 7, 2026",
            fetchedAtLabel: "Mar 8, 2026",
          },
        })}
      />,
    );

    const regimeIndex = html.indexOf("Current outlook");
    const callIndex = html.indexOf("Weekly call snapshot");
    const doNowIndex = html.indexOf("DO NOW");
    const flipIndex = html.indexOf("FLIP WHEN");

    assert.ok(regimeIndex >= 0);
    assert.ok(callIndex > regimeIndex);
    assert.ok(doNowIndex > callIndex);
    assert.ok(flipIndex > doNowIndex);
  });

  it("keeps secondary diagnostics under disclosure", () => {
    // Contract: secondary diagnostics must remain behind disclosure / below fold.
    const html = renderToStaticMarkup(
      <WeeklyDecisionCard
        model={buildWeeklyDecisionCardModel({
          status: {
            statusLabel: "DEFENSIVE",
            regimeKey: "DEFENSIVE",
            postureLabel: "Defensive",
            stageLabel: "Watchful",
            postureWithStageLabel: "Defensive — Watchful",
            postureDelta: "Worse",
            confidenceLabel: "MED",
            confidencePercent: 68,
            signalConfidenceReason: "Reason",
            regimeHeader: { regime: "Defensive", confidence: "Medium", primaryRisk: "Boundary pressure" },
            trendLabel: "Deteriorating",
            confidenceHistory: [],
            confidenceTrend: "unstable",
            transitionWatch: "ON",
          },
          decision: {
            operatingStanceLine: "Stage approvals and protect runway.",
            weeklyMemoLines: ["Signals tightened this week."],
            netConstraintSummary: "Pressure elevated",
            guardrail: "Guardrail",
            reversalTrigger: "Flip trigger",
            actionNowShort: "Pause net-new fixed burn commitments this week.",
            reportDynamics,
            decisionShiftSummary: "delta",
            transitionProbabilities: { Expansion: 10, Mixed: 20, Scarcity: 45, Defensive: 25 },
            decisionRules: [],
            roleAwareTemplates: [],
            executiveOperationalStance: { expand: ["Expand carefully"], avoid: ["Avoid fixed-cost expansion"] },
            revisitDecisions: true,
            weeklyMovement: { score: 1, direction: "defensive", summary: "Movement" },
          },
          diagnostics: {
            regimeSignalIndicators: [],
            startupClimateIndex: { score: 63, status: "Improving", breakdown: [] },
            regimeDistance: {
              dimensionLabel: "Tightness",
              currentValue: 68,
              thresholdValue: 70,
              pointsToFlip: 2,
              dimensionKey: "tightness",
              thresholdDirection: "riseAbove",
            },
            regimeVelocity: {
              status: "ok",
              from: "Expansion",
              to: "Mixed",
              sampleSize: 3,
              lowerBoundMonths: 2,
              upperBoundMonths: 5,
              typicalRangeLabel: "2–5 months",
              displayLabel: "Expansion→Mixed typically 2–5 months",
            },
            whyThisCall: [],
            evidenceItems: [],
          },
          history: {
            memoryRail: [],
            historicalTimeline: [],
            historicalAnalogs: [],
            macroOverlay: [],
          },
          artifact: {
            citation: "Citation",
            recordDateLabel: "Mar 7, 2026",
            fetchedAtLabel: "Mar 8, 2026",
          },
        })}
      />,
    );

    assert.match(html, /<summary[^>]*>More context<\/summary>/);
    assert.match(html, /Trend:/);
    assert.match(html, /Confidence:/);
  });
});
