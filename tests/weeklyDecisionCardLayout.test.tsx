import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyDecisionCard } from "../app/components/weeklyDecisionCard";
import type { ReportDynamics } from "../lib/report/reportData";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";
import { buildWeeklyDecisionCardModel, type WeeklyDecisionCardModelOverrides } from "./factories/weeklyDecisionCardModel";

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
    flipConditions: [{ metric: "tightness", operator: "<", value: 65, label: "Tightness < 65" }],
    rationale: "Preserve fixed-cost discipline under pressure.",
  },
];

const renderCard = (overrides: WeeklyDecisionCardModelOverrides, options?: { actions?: ReactNode }) =>
  renderToStaticMarkup(
    <WeeklyDecisionCard
      model={buildWeeklyDecisionCardModel(overrides)}
      actions={options?.actions}
    />,
  );

describe("WeeklyDecisionCard top-fold composition", () => {
  it("renders the operating console hierarchy", () => {
    const html = renderCard(
      {
        decision: {
          reportDynamics,
          decisionRules,
        },
        diagnostics: {
          regimeVelocity: {
            status: "ok",
            from: "Expansion",
            to: "Mixed",
            sampleSize: 4,
            lowerBoundMonths: 3,
            upperBoundMonths: 6,
            typicalRangeLabel: "3–6 months",
            displayLabel: "Expansion→Mixed typically 3–6 months",
          },
        },
      },
      { actions: <button type="button">Copy weekly brief</button> },
    );

    assert.match(html, /weekly-decision-card-title/);
    assert.match(html, /This week&#x27;s recommendation/);
    assert.match(html, /Can you rely on this\?/);
    assert.match(html, /Signal reliability MED/);
    assert.match(html, />Act with caution</);
    assert.match(html, /Weekly decision strip: current call, action now, pause if, and change course if\./);
    assert.match(html, /Action now/);
    assert.match(html, /Aggression vs last week/);
    assert.match(html, /Hiring backdrop/);
    assert.match(html, /Expansion backdrop/);
    assert.match(html, /Funding backdrop/);
    assert.match(html, /External backdrop/);
    assert.match(html, />What changed</);
    assert.match(html, /Revisit now/);
    assert.match(html, /Pause if/);
    assert.match(html, /Change course if/);
    assert.match(html, /What to watch this week/);
    assert.match(html, /Why this week points here/);
    assert.match(html, /What this means now/);
    assert.match(html, /Act with caution/);
    assert.doesNotMatch(html, /How this lands across the company/);
    assert.doesNotMatch(html, /Company mode:/);
    assert.doesNotMatch(html, /Seed/);
    assert.doesNotMatch(html, /Series B/);
    assert.doesNotMatch(html, /Bootstrapped/);
    assert.match(html, /Whether weekly brief citation/);
    assert.match(html, /Confidence and continuity/);
    assert.match(html, /(Last read|Last week) -&gt; This week -&gt; Threshold/);
    assert.match(html, /Copy weekly brief/);
    assert.match(html, /Default share/);

    const heroIndex = html.indexOf("weekly-decision-card-title");
    const deltaIndex = html.indexOf("Decision delta: tighten roadmap optionality while protecting core delivery.");
    const postureIndex = html.indexOf("This week&#x27;s recommendation");
    const guidanceIndex = html.indexOf("Weekly decision strip: current call, action now, pause if, and change course if.");
    const actionStripIndex = html.indexOf("Decision details");
    const shareSectionIndex = html.indexOf("Share-ready artifact");

    assert.ok(guidanceIndex > heroIndex);
    assert.ok(deltaIndex > guidanceIndex);
    assert.ok(shareSectionIndex > guidanceIndex);
    assert.ok(actionStripIndex > shareSectionIndex);
    assert.ok(postureIndex >= heroIndex);
    assert.ok(postureIndex < deltaIndex);
  });

  it("shows fallback warning copy when snapshot mode is active", () => {
    const html = renderCard({
      status: {
        postureDelta: "No worse than last week",
        confidenceLabel: "HIGH",
        confidencePercent: 92,
        signalConfidenceReason: "Reason: broad agreement across signals; boundary distance is wide",
        regimeHeader: {
          regime: "Defensive",
          confidence: "High (safe for near-term operating cadence)",
          primaryRisk: "Downside: Potential stale snapshot bias: live signal freshness is degraded.",
        },
        trendLabel: "Stable",
        isFallbackSnapshot: true,
      },
      decision: {
        operatingStanceLine: "Hold approvals steady. Keep irreversible spend capped.",
        weeklyMemoLines: ["Market conditions are stable this week.", "Hold approvals steady. Keep irreversible spend capped.", "Regime shift watch is off: hold current pace with bounded approvals."],
        netConstraintSummary: "Fallback snapshot is stable for near-term pacing.",
        guardrail: "Hold irreversible hiring unless demand proves durable.",
        reversalTrigger: "If tightness drops below 60, reopen selective hiring.",
        reportDynamics: { directionLabel: "stable", changedSignals: [], anomalySignals: [], totalSignalChanges: 0, regimeChanged: false },
        decisionShiftSummary: "No material signal shift in fallback mode.",
        transitionProbabilities: { Expansion: 15, Mixed: 45, Scarcity: 25, Defensive: 15 },
        decisionRules,
        revisitDecisions: false,
        weeklyMovement: { score: 0, direction: "neutral", summary: "Model pressure is flat this week; hold posture and keep existing guardrails in force." },
      },
      diagnostics: {
        regimeSignalIndicators: [
          { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [64], isFallback: true },
          { key: "riskAppetite", label: "Risk appetite", valueLabel: "50", rawValue: 50, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [50], isFallback: true },
          { key: "baseRate", label: "Base rate", valueLabel: "—", rawValue: null, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [], isFallback: true },
          { key: "curveSlope", label: "Yield curve slope", valueLabel: "—", rawValue: null, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [], isFallback: true },
        ],
        startupClimateIndex: { score: 61, status: "Stable", breakdown: [{ label: "Capital availability", score: 64 }] },
        whyThisCall: [{ label: "Reliability", detail: "Fallback snapshot in use." }],
        evidenceItems: [{ key: "tightness", title: "Capital conditions", supportingBullets: ["Weekly move: +0.0 vs. prior snapshot."], confidenceLabel: "Low", directionLabel: "Unchanged", immediateImplication: "No material operating change this week." }],
      },
    });

    assert.match(html, /Action now/);
    assert.match(html, /Using the last clean snapshot because Freshness: Mar 6, 2026 09:12 UTC/);
    assert.match(html, />Act with caution</);
    assert.match(html, /Act with caution/);
  });

  it("keeps a single canonical weekly call region and compact shell spacing", () => {
    const html = renderCard({
      decision: {
        reportDynamics,
        decisionRules,
        roleAwareTemplates: [
          {
            role: "startup-leadership",
            roleLabel: "Startup leadership",
            doNow: "Keep delivery focused.",
            avoidNow: "Do not add fixed costs without proof.",
            flipTrigger: "Resume staged expansion when tightness and risk appetite recover.",
          },
        ],
        executiveOperationalStance: {
          expand: ["Increase product tempo for reversible bets"],
          avoid: ["net-new hiring if tightness > 74"],
        },
      },
      diagnostics: {
        regimeVelocity: {
          status: "ok",
          from: "Expansion",
          to: "Mixed",
          sampleSize: 4,
          lowerBoundMonths: 3,
          upperBoundMonths: 6,
          typicalRangeLabel: "3–6 months",
          displayLabel: "Expansion→Mixed typically 3–6 months",
        },
      },
    });

    assert.match(html, /id="weekly-call-core"/);
    assert.equal((html.match(/Weekly decision strip: current call, action now, pause if, and change course if\./g) ?? []).length, 1);
    assert.doesNotMatch(html, /Copy weekly operator brief/);
    assert.doesNotMatch(html, /Open Signals/);
    assert.match(html, /weather-panel space-y-4 px-4 py-4/);
  });

  it("keeps the bounded call compact with action, guardrail, and flip visible", () => {
    const html = renderCard({
      decision: {
        operatingStanceLine: "Stage decisions.",
        weeklyMemoLines: [],
        netConstraintSummary: "Pressure remains elevated but stabilizing.",
        guardrail: "Hold irreversible hiring unless direct revenue impact is clear.",
        reversalTrigger: "If risk appetite rises above 55, reopen selective hiring.",
        reportDynamics,
        decisionShiftSummary: "Decision delta",
        decisionRules,
        roleAwareTemplates: [
          {
            role: "startup-leadership",
            roleLabel: "Startup leadership",
            doNow: "Protect runway; protect runway; keep delivery focused; tighten scope; sequence launches; preserve optionality;",
            avoidNow: "Pause speculative hiring.; pause speculative hiring.; lock in long-payback spend.;",
            flipTrigger: "Resume staged expansion when tightness and risk appetite recover.",
          },
          {
            role: "vc-partner",
            roleLabel: "VC partner",
            doNow: "Keep delivery focused; preserve optionality; improve proof loops;",
            avoidNow: "Lock in long-payback spend.; overcommit to expansion.;",
            flipTrigger: "Reopen growth pacing after two improving reads.",
          },
        ],
        executiveOperationalStance: {
          expand: ["Increase product tempo for reversible bets"],
          avoid: ["net-new hiring if tightness > 74"],
        },
        weeklyMovement: { score: 1.2, direction: "defensive", summary: "summary" },
      },
      diagnostics: {
        regimeSignalIndicators: [],
        evidenceItems: [],
        whyThisCall: [],
      },
      history: {
        macroOverlay: [],
      },
    });

    const callCore = html.slice(
      html.indexOf('id="weekly-call-core"'),
      html.indexOf("Why this call"),
    );

    assert.match(callCore, /Current call/);
    assert.match(callCore, /Action now/);
    assert.match(callCore, /Pause if/);
    assert.match(callCore, /Change course if/);
    assert.match(callCore, /Revisit now/);
    assert.match(callCore, /Share-ready artifact/);
    assert.match(callCore, /Confidence and continuity/);
    assert.match(callCore, /Yes\. Last week&#x27;s decisions need another look\.|No\. Last week&#x27;s decisions still hold\./);
    assert.match(callCore, /What to watch this week/);
    assert.match(callCore, /Default share/);
    assert.match(callCore, /Citation/);
    assert.match(callCore, /Why/);
  });
});
