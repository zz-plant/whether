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
import { buildWeeklyDecisionCardModel, type WeeklyDecisionCardModelOverrides } from "./factories/weeklyDecisionCardModel";

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
    flipConditions: [{ metric: "tightness", operator: "<", value: 64, label: "Tightness < 64" }],
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

const buildHomeCardModel = (overrides: WeeklyDecisionCardModelOverrides = {}) =>
  buildWeeklyDecisionCardModel({
    status: {
      trendLabel: "Stable",
      confidenceHistory: [
        { recordDate: "2026-02-13", confidencePercent: 64, isMissing: false },
        { recordDate: "2026-02-20", confidencePercent: null, isMissing: true },
        { recordDate: "2026-02-27", confidencePercent: 64, isMissing: false },
      ],
      confidenceTrend: "unstable",
      ...overrides.status,
    },
    decision: {
      reportDynamics,
      decisionShiftSummary: "Decision delta: tighten roadmap optionality while protecting core delivery.",
      transitionProbabilities: { Expansion: 10, Mixed: 35, Scarcity: 40, Defensive: 15 },
      decisionRules,
      ...overrides.decision,
    },
    diagnostics: {
      regimeSignalIndicators: [
        { key: "tightness", label: "Capital tightness", valueLabel: "64", rawValue: 64, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [64], isFallback: true },
        { key: "riskAppetite", label: "Risk appetite", valueLabel: "50", rawValue: 50, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [50], isFallback: true },
        { key: "baseRate", label: "Base rate", valueLabel: "—", rawValue: null, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [], isFallback: true },
        { key: "curveSlope", label: "Yield curve slope", valueLabel: "—", rawValue: null, trendArrow: "→", trendDeltaLabel: "No weekly delta", sparkline: [], isFallback: true },
      ],
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
      ...overrides.diagnostics,
    },
    ...overrides,
  });

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
        <WeeklyDecisionCard model={buildHomeCardModel()} />
        <HomeInterpretationPanel layer={layer} searchParams={{ view: "company", month: "3", year: "2026" }} />
      </>,
    );

    assert.match(html, /Current outlook/);
    assert.match(html, /Week of Mar 5, 2026/);
    assert.match(html, /Weekly call snapshot/);
    assert.doesNotMatch(html, /Copy weekly operator brief/);
    assert.match(html, /Decision confidence/);
    assert.match(html, /Action/);
    assert.match(html, /Interpretation layer/);
    assert.match(html, /Company view/);
    assert.match(html, /• Action:/);
    assert.match(html, /Trigger:/);
    assert.match(html, /Reverse:/);
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
        <WeeklyDecisionCard model={buildHomeCardModel()} />
        <HomeInterpretationPanel layer={layer} searchParams={{ view: "forecast" }} />
      </>,
    );

    const heroIndex = html.indexOf("Current outlook");
    const confidenceIndex = html.indexOf("MED 68%");
    const playbookIndex = html.indexOf("Weekly call snapshot");
    const interpretationIndex = html.indexOf("Interpretation layer");

    assert.ok(heroIndex > -1);
    assert.ok(confidenceIndex > heroIndex);
    assert.ok(playbookIndex > confidenceIndex);
    assert.ok(interpretationIndex > playbookIndex);
  });

  it("renders orientation strip before the weekly decision card without replacing core card content", () => {
    const html = renderToStaticMarkup(
      <>
        <HomeFirstRunOrientation
          changeSummary="Decision delta: tighten optional spend this week."
          decisionNow="Stage decisions and protect runway while transition watch is on."
          destinations={[
            { href: "/signals", label: "Signals", description: "Check what changed in the signals and why the weekly call moved." },
            { href: "/operations", label: "Operations", description: "Approve or hold hiring, spend, and pacing decisions for this week." },
            { href: "/decide", label: "Decide", description: "Translate the weekly call into role-specific decisions." },
          ]}
        />
        <WeeklyDecisionCard
          model={buildHomeCardModel({
            decision: {
              roleAwareTemplates: [],
            },
          })}
        />
      </>,
    );

    const orientationIndex = html.indexOf("Fast orientation for this week");
    const cardIndex = html.indexOf("Current outlook");

    assert.ok(orientationIndex > -1);
    assert.ok(cardIndex > orientationIndex);
    assert.match(html, /Decision delta: tighten optional spend this week\./);
    assert.match(html, /Skip intro/);
  });
});
