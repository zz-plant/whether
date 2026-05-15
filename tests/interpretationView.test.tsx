import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeInterpretationPanel } from "../app/components/homeInterpretationPanel";
import { buildInterpretationLayer } from "../lib/report/interpretationLayer";
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

describe("interpretation view panel", () => {
  it("keeps default view parity with core interpretation copy", () => {
    const layer = buildInterpretationLayer({
      view: "default",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
    });

    const html = renderToStaticMarkup(
      <HomeInterpretationPanel layer={layer} searchParams={{ month: "3", year: "2026" }} />,
    );

    assert.match(html, /Default view/);
    assert.match(html, /canonical decision lives above/i);
    assert.match(html, /Action: Pressure rose compared to last week\./);
    assert.match(html, /\/?month=3&amp;year=2026&amp;view=forecast/);
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

    assert.match(layer.bullets[0], /Action: Operate for DEFENSIVE \(0%\) while current posture holds\./);
  });

  it("keeps interpretation toggle links query-stable and marks active view", () => {
    const layer = buildInterpretationLayer({
      view: "forecast",
      homeBriefModel,
      assessment,
      forecast,
      decisionRules,
    });

    const html = renderToStaticMarkup(
      <HomeInterpretationPanel layer={layer} searchParams={{ month: "3", year: "2026", sector: "consumer" }} />,
    );

    assert.match(html, /aria-current="page"[^>]*><span>Forecast<\/span>/);
    assert.match(html, /\/?month=3&amp;year=2026&amp;sector=consumer/);
    assert.doesNotMatch(html, /view=default/);
  });

  it("swaps interpretation content without changing toggle shell", () => {
    const sector = buildInterpretationLayer({ view: "sector", homeBriefModel, assessment, forecast, decisionRules });
    const financial = buildInterpretationLayer({ view: "financial", homeBriefModel, assessment, forecast, decisionRules });

    const sectorHtml = renderToStaticMarkup(<HomeInterpretationPanel layer={sector} searchParams={{}} />);
    const financialHtml = renderToStaticMarkup(<HomeInterpretationPanel layer={financial} searchParams={{}} />);

    assert.match(sectorHtml, /Sector view/);
    assert.match(sectorHtml, /Action: Sector sensitivity: Consumer teams should stage expansions\./);
    assert.match(financialHtml, /Financial view/);
    assert.match(financialHtml, /Runway risk/);
    assert.match(financialHtml, /Trigger: Raise window/);
    assert.match(financialHtml, /Reverse: Use burn delta/);
    assert.match(financialHtml, /Financial action summary/);
    assert.match(sectorHtml, /Trigger: Hold irreversible hiring\./);
    assert.match(sectorHtml, /Reverse: Reopen if risk appetite rises above 55\./);
    assert.match(sectorHtml, /Default/);
    assert.match(financialHtml, /Default/);
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
