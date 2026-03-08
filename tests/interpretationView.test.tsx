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
  regimeProbabilities: { Expansion: 8, Mixed: 24, Scarcity: 38, Defensive: 30 },
  boundaryPressure: {
    tightnessDistance: 4,
    riskAppetiteDistance: 9,
    nearestDistance: 4,
    momentum: "toward-threshold",
    crossingRisk: "high",
  },
  signalTrajectory: {
    riskAppetite: "down",
    tightness: "up",
    yieldCurveProxy: "flat",
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
    assert.match(html, /Changed: pressure rose versus last week\./);
    assert.match(html, /\/?month=3&amp;year=2026&amp;view=forecast/);
  });

  it("swaps interpretation content without changing toggle shell", () => {
    const sector = buildInterpretationLayer({ view: "sector", homeBriefModel, assessment, forecast, decisionRules });
    const financial = buildInterpretationLayer({ view: "financial", homeBriefModel, assessment, forecast, decisionRules });

    const sectorHtml = renderToStaticMarkup(<HomeInterpretationPanel layer={sector} searchParams={{}} />);
    const financialHtml = renderToStaticMarkup(<HomeInterpretationPanel layer={financial} searchParams={{}} />);

    assert.match(sectorHtml, /Sector view/);
    assert.match(sectorHtml, /Consumer teams should stage expansions\./);
    assert.match(financialHtml, /Financial view/);
    assert.match(financialHtml, /Tightness 74\/100, risk appetite 41\/100\./);
    assert.match(sectorHtml, /Default/);
    assert.match(financialHtml, /Default/);
  });
});
