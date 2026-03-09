import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    scope: "Only critical replacements.",
    pauseTrigger: "Pause when tightness rises above 74.",
    resumeTrigger: "Resume when tightness falls below 65.",
    rationale: "",
  },
];

const homeBriefModel = {
  decisionShiftSummary: "Changed: pressure rose versus last week.",
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
    assert.match(html, /Canonical decision lives above/);
    assert.match(html, /Action: Changed: pressure rose versus last week\./);
    assert.match(html, /\/?month=3&amp;year=2026&amp;view=forecast/);
  });


  it("renders top-priority adjusted company rules with explicit trigger/reverse text", () => {
    const layeredRules: BoundedDecisionRule[] = [
      {
        area: "capital-raising",
        recommendation: "Rule 1 first.",
        scope: "",
        pauseTrigger: "pause-1",
        resumeTrigger: "resume-1",
        rationale: "",
      },
      {
        area: "burn-discipline",
        recommendation: "Rule 2 second.",
        scope: "",
        pauseTrigger: "pause-2",
        resumeTrigger: "resume-2",
        rationale: "",
      },
      {
        area: "hiring",
        recommendation: "Rule 3 third.",
        scope: "",
        pauseTrigger: "pause-3",
        resumeTrigger: "resume-3",
        rationale: "",
      },
      {
        area: "product-tempo",
        recommendation: "Rule 4 hidden.",
        scope: "",
        pauseTrigger: "pause-4",
        resumeTrigger: "resume-4",
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

    assert.match(html, /aria-current="page"[^>]*>Forecast</);
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
    assert.match(financialHtml, /Reverse: Burn delta/);
    assert.match(financialHtml, /Financial action summary/);
    assert.match(sectorHtml, /Trigger: Tighten one notch if sector demand weakens faster than the base posture\./);
    assert.match(sectorHtml, /Reverse: Return to base once sector drag normalizes for two updates\./);
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
