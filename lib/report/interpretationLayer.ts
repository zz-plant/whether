import type { RegimeAssessment } from "../regimeEngine";
import type { ForecastModel } from "./forecastModel";
import type { BoundedDecisionRule } from "./boundedDecisionRules";

export const interpretationViews = ["default", "sector", "company", "financial", "forecast"] as const;

export type InterpretationView = (typeof interpretationViews)[number];

export type InterpretationLayer = {
  view: InterpretationView;
  label: string;
  summary: string;
  bullets: string[];
};

export const isInterpretationView = (value: string | undefined): value is InterpretationView =>
  Boolean(value && interpretationViews.includes(value as InterpretationView));

const crossingRiskLabel: Record<ForecastModel["boundaryPressure"]["crossingRisk"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const buildInterpretationLayer = ({
  view,
  homeBriefModel,
  assessment,
  forecast,
  decisionRules,
}: {
  view: InterpretationView;
  homeBriefModel: ReturnType<typeof import("./homeBriefModel").buildHomeBriefModel>;
  assessment: RegimeAssessment;
  forecast: ForecastModel;
  decisionRules: BoundedDecisionRule[];
}): InterpretationLayer => {
  if (view === "sector") {
    return {
      view,
      label: "Sector view",
      summary: "Apply the macro call through sector sensitivity before changing pace.",
      bullets: homeBriefModel.macroOverlay.map((item) => `${item.label}: ${item.detail}`),
    };
  }

  if (view === "company") {
    return {
      view,
      label: "Company view",
      summary: "Use bounded operator rules so teams know what to tighten now and when to reverse.",
      bullets: decisionRules.slice(0, 3).map(
        (rule) => `${rule.recommendation} Stop if ${rule.pauseTrigger} Restart when ${rule.resumeTrigger}`,
      ),
    };
  }

  if (view === "financial") {
    return {
      view,
      label: "Financial view",
      summary: "Translate this week into capital pacing and approvals.",
      bullets: [
        `Tightness ${assessment.scores.tightness}/100, risk appetite ${assessment.scores.riskAppetite}/100.`,
        ...assessment.constraints.slice(0, 2),
      ],
    };
  }

  if (view === "forecast") {
    const topRegime = Object.entries(forecast.regimeProbabilities).sort((a, b) => b[1] - a[1])[0];
    return {
      view,
      label: "Forecast view",
      summary: "Boundary pressure indicates how likely this call is to flip if signal momentum persists.",
      bullets: [
        `Highest likelihood next posture: ${topRegime[0]} (${topRegime[1]}%).`,
        `Crossing risk: ${crossingRiskLabel[forecast.boundaryPressure.crossingRisk]} with ${forecast.boundaryPressure.nearestDistance} points to threshold.`,
        `Momentum: ${forecast.boundaryPressure.momentum.replaceAll("-", " ")}.`,
      ],
    };
  }

  return {
    view: "default",
    label: "Default view",
    summary: "Core weekly interpretation for operators.",
    bullets: [
      homeBriefModel.decisionShiftSummary,
      homeBriefModel.guardrail,
      homeBriefModel.reversalTrigger,
    ],
  };
};
