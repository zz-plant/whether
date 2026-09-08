import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildInterpretationLayer, type InterpretationLayer } from "../lib/report/interpretationLayer";
import type { RegimeAssessment } from "../lib/regimeEngine";
import type { ForecastModel } from "../lib/report/forecastModel";
import type { BoundedDecisionRule } from "../lib/report/boundedDecisionRules";

const assessment = {
  regime: "DEFENSIVE",
  policyAssessment: { posture: "TRANSITION" },
  scores: {
    tightness: 74,
    riskAppetite: 41,
    baseRateUsed: "1M",
    baseRate: 4.8,
    curveSlope: -0.22,
  },
  constraints: ["Preserve cash runway.", "Pause non-core expansion."],
} as unknown as RegimeAssessment;

const forecast: ForecastModel = {
  next4WeekProbabilities: { Expansion: 8, Mixed: 24, Scarcity: 38, Defensive: 30 },
  next90DayProbabilities: { Expansion: 8, Mixed: 24, Scarcity: 38, Defensive: 30 },
  boundaryPressure: {
    distance: 4,
    momentum: "toward-threshold",
    crossingRisk: "high",
  },
  signalTrajectory: {
    riskAppetite: "deteriorating",
    tightness: "improving",
    yieldCurveProxy: "stable",
  },
};

const decisionRules: BoundedDecisionRule[] = [
  {
    area: "hiring",
    recommendation: "Backfills only.",
    doNow: ["Backfills only."],
    avoidNow: ["Avoid speculative hiring."],
    scope: "Only critical replacements.",
    pauseTrigger: "Pause when tightness rises above 74.",
    resumeTrigger: "Resume when tightness falls below 65.",
    pause: { verb: "Pause", join: "or", conditions: [] },
    resume: { verb: "Resume", join: "and", conditions: [] },
    flipConditions: [{ metric: "tightness", operator: "<", value: 65, label: "Tightness < 65" }],
    rationale: "",
  },
];

const homeBriefModel = {
  decisionShiftSummary: "Pressure rose compared to last week.",
  guardrail: "Hold irreversible hiring.",
  reversalTrigger: "Reopen if risk appetite rises above 55.",
  macroOverlay: [{ label: "Sector sensitivity", detail: "Consumer teams should stage expansions." }],
} as ReturnType<typeof import("../lib/report/homeBriefModel").buildHomeBriefModel>;

// The panel these views were asserted through is gone; buildInterpretationLayer
// is the live half (lib/export/briefBuilders, lib/report/home/artifactPayload,
// lib/report/homePageAssembler all consume it), so the content assertions now
// read the layer directly instead of its former HTML. Assertions that only
// described the panel's markup — toggle hrefs, aria-current, the toggle-shell
// labels — are gone with it.
const layerText = (layer: InterpretationLayer) =>
  [
    layer.label,
    layer.summary,
    ...layer.bullets,
    ...(layer.financialAction ? Object.values(layer.financialAction) : []),
  ].join("\n");

describe("interpretation layer", () => {
  it("keeps default view parity with core interpretation copy", () => {
    const layer = buildInterpretationLayer({
      view: "default",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
    });

    const text = layerText(layer);

    assert.match(text, /Default view/);
    assert.match(text, /canonical decision lives above/i);
    assert.match(text, /Action: Pressure rose compared to last week\./);
  });


  it("renders top-priority adjusted company rules with explicit trigger/reverse text", () => {
    const layeredRules: BoundedDecisionRule[] = [
      {
        area: "capital-raising",
        recommendation: "Rule 1 first.",
        doNow: ["Rule 1 do-now."],
        avoidNow: ["Rule 1 avoid-now."],
        scope: "",
        pauseTrigger: "pause-1",
        resumeTrigger: "resume-1",
        pause: { verb: "Pause", join: "or", conditions: [] },
        resume: { verb: "Resume", join: "and", conditions: [] },
        flipConditions: [{ metric: "tightness", operator: "<", value: 61, label: "Tightness < 61" }],
        rationale: "",
      },
      {
        area: "burn-discipline",
        recommendation: "Rule 2 second.",
        doNow: ["Rule 2 do-now."],
        avoidNow: ["Rule 2 avoid-now."],
        scope: "",
        pauseTrigger: "pause-2",
        resumeTrigger: "resume-2",
        pause: { verb: "Pause", join: "or", conditions: [] },
        resume: { verb: "Resume", join: "and", conditions: [] },
        flipConditions: [{ metric: "tightness", operator: "<", value: 62, label: "Tightness < 62" }],
        rationale: "",
      },
      {
        area: "hiring",
        recommendation: "Rule 3 third.",
        doNow: ["Rule 3 do-now."],
        avoidNow: ["Rule 3 avoid-now."],
        scope: "",
        pauseTrigger: "pause-3",
        resumeTrigger: "resume-3",
        pause: { verb: "Pause", join: "or", conditions: [] },
        resume: { verb: "Resume", join: "and", conditions: [] },
        flipConditions: [{ metric: "tightness", operator: "<", value: 63, label: "Tightness < 63" }],
        rationale: "",
      },
      {
        area: "product-tempo",
        recommendation: "Rule 4 hidden.",
        doNow: ["Rule 4 do-now."],
        avoidNow: ["Rule 4 avoid-now."],
        scope: "",
        pauseTrigger: "pause-4",
        resumeTrigger: "resume-4",
        pause: { verb: "Pause", join: "or", conditions: [] },
        resume: { verb: "Resume", join: "and", conditions: [] },
        flipConditions: [{ metric: "tightness", operator: "<", value: 64, label: "Tightness < 64" }],
        rationale: "",
      },
    ];

    const company = buildInterpretationLayer({
      view: "company",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules: layeredRules,
    });

    assert.equal(company.bullets.length, 3);
    assert.match(company.bullets[0], /Rule 1 first\./);
    assert.match(company.bullets[1], /Rule 2 second\./);
    assert.match(company.bullets[2], /Rule 3 third\./);
    assert.ok(company.bullets.every((bullet) => bullet.includes("Trigger:")));
    assert.ok(company.bullets.every((bullet) => bullet.includes("Reverse:")));
    assert.ok(company.bullets.every((bullet) => !bullet.includes("Rule 4 hidden.")));
  });



  it("falls back to canonical bullets when company-adjusted rules are unavailable", () => {
    const company = buildInterpretationLayer({
      view: "company",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules: [],
    });

    assert.match(company.summary, /unavailable this week/i);
    assert.equal(company.bullets.length, 3);
    assert.match(company.bullets[0], /Action: Pressure rose compared to last week\./);
    assert.match(company.bullets[1], /Trigger: Hold irreversible hiring\./);
    assert.match(company.bullets[2], /Reverse: Reopen if risk appetite rises above 55\./);
  });

  it("keeps forecast interpretation resilient when 90-day probabilities are missing", () => {
    const sparseForecast = {
      ...forecast,
      next90DayProbabilities: {},
    } as ForecastModel;

    const layer = buildInterpretationLayer({
      view: "forecast",
      homeBriefModel,
      assessment,
      forecast: sparseForecast,
      decisionRules,
    });

    assert.match(layer.bullets[0], /Action: Operate for DEFENSIVE while the current posture holds — it carries 0% of the next-90-day weight\./);
  });

  it("swaps interpretation content between sector and financial views", () => {
    const sector = buildInterpretationLayer({ view: "sector", homeBriefModel, assessment, forecast, decisionRules });
    const financial = buildInterpretationLayer({ view: "financial", homeBriefModel, assessment, forecast, decisionRules });

    const sectorText = layerText(sector);
    const financialText = layerText(financial);

    assert.match(sectorText, /Sector view/);
    assert.match(sectorText, /Action: Cloudy\+\. Run this sector a step ahead of the base call\./);
    assert.match(sectorText, /Trigger: Hold irreversible hiring\./);
    assert.match(sectorText, /Reverse: Drop the sector tilt if funding pressure rises above 70\./);
    assert.match(financialText, /Financial view/);
    assert.match(financialText, /Runway risk/);
    assert.match(financialText, /Trigger: Open the raise between month/);
    assert.match(financialText, /Reverse: Move burn by/);
  });

  it("adds fallback indicator when isFallback is active", () => {
    const layer = buildInterpretationLayer({
      view: "default",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
      isFallback: true,
    });
    assert.ok(layer.bullets[0].includes("[Cached Signal]"));
  });

  it("keeps interpretation bullets compact for screenshot-safe handoff", () => {
    const views = ["default", "sector", "company", "financial", "forecast"] as const;

    for (const view of views) {
      const layer = buildInterpretationLayer({
        view,
        homeBriefModel,
        assessment,
        forecast,
        decisionRules,
      });

      assert.ok(layer.bullets.length >= 1 && layer.bullets.length <= 3);
      assert.ok(layer.bullets.every((bullet) => bullet.includes("Action:") || bullet.includes("Trigger:") || bullet.includes("Reverse:")));
      assert.ok(layer.bullets.every((bullet) => bullet.length <= 340));
    }
  });

});
