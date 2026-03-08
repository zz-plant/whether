import type { RegimeAssessment } from "../regimeEngine";
import type { ForecastModel } from "./forecastModel";
import type { BoundedDecisionRule } from "./boundedDecisionRules";
import {
  buildCompanyAdjustedRules,
  type CompanyProfile,
} from "./companyProfile";
import {
  buildRunwayPlanFromRequest,
  type PlannerPosture,
  type PlannerSector,
  type PlannerStage,
} from "./runwayPlanner";

export const interpretationViews = [
  "default",
  "sector",
  "company",
  "financial",
  "forecast",
] as const;

export type InterpretationView = (typeof interpretationViews)[number];

export type InterpretationLayer = {
  view: InterpretationView;
  label: string;
  summary: string;
  bullets: string[];
  financialAction?: {
    runwayRisk: string;
    raiseTiming: string;
    burnAdjustment: string;
  };
};

const compactClause = (value: string, max = 118) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1).trimEnd()}…`;
};

const boundedLine = (label: "Action" | "Trigger" | "Reverse", value: string) =>
  `${label}: ${compactClause(value)}`;

type FinancialViewInput = {
  runway: number;
  burn: number;
  revenue: number;
  growthRate: number;
  sector: PlannerSector;
  stage: PlannerStage;
};

const postureForPolicyPosture = (
  posture: RegimeAssessment["policyAssessment"]["posture"],
): PlannerPosture => {
  if (posture === "RISK_ON") return "RISK_ON";
  if (posture === "TRANSITION") return "TRANSITION";
  return "SAFETY_MODE";
};

const getDefaultFinancialInput = (
  assessment: RegimeAssessment,
): FinancialViewInput => ({
  runway:
    assessment.regime === "SCARCITY"
      ? 11
      : assessment.regime === "DEFENSIVE"
        ? 13
        : assessment.regime === "VOLATILE"
          ? 14
          : 16,
  burn: assessment.regime === "EXPANSION" ? 900_000 : 700_000,
  revenue: assessment.regime === "SCARCITY" ? 420_000 : 500_000,
  growthRate: assessment.regime === "EXPANSION" ? 18 : assessment.regime === "VOLATILE" ? 10 : 7,
  sector: "b2b-saas",
  stage: "growth",
});

export const isInterpretationView = (
  value: string | undefined,
): value is InterpretationView =>
  Boolean(value && interpretationViews.includes(value as InterpretationView));

const crossingRiskLabel: Record<
  ForecastModel["boundaryPressure"]["crossingRisk"],
  string
> = {
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
  financialInput,
  companyProfile,
}: {
  view: InterpretationView;
  homeBriefModel: ReturnType<
    typeof import("./homeBriefModel").buildHomeBriefModel
  >;
  assessment: RegimeAssessment;
  forecast: ForecastModel;
  decisionRules: BoundedDecisionRule[];
  financialInput?: FinancialViewInput;
  companyProfile?: Partial<CompanyProfile>;
}): InterpretationLayer => {
  if (view === "sector") {
    const primaryOverlay = homeBriefModel.macroOverlay.slice(0, 1);
    const sectorShift = primaryOverlay[0]
      ? `${primaryOverlay[0].label}: ${primaryOverlay[0].detail}`
      : "Apply sector sensitivity only when sector demand diverges from the base call.";
    return {
      view,
      label: "Sector view",
      summary:
        "Apply the macro call through sector sensitivity before changing pace.",
      bullets: [
        boundedLine("Action", sectorShift),
        boundedLine("Trigger", "Tighten one notch if sector demand weakens faster than the base posture implies."),
        boundedLine("Reverse", "Return to the base posture once sector drag normalizes for two consecutive updates."),
      ],
    };
  }

  if (view === "company") {
    const adjustedRules = buildCompanyAdjustedRules({
      assessment,
      postureRules: decisionRules,
      profile: companyProfile,
    });

    return {
      view,
      label: "Company view",
      summary:
        "Use bounded operator rules so teams know what to tighten now, what to stop, and when to reverse.",
      bullets: adjustedRules
        .slice(0, 3)
        .map(
          (rule) =>
            `${boundedLine("Action", rule.recommendation)} ${boundedLine("Trigger", rule.pauseTrigger)} ${boundedLine("Reverse", rule.resumeTrigger)}`,
        ),
    };
  }

  if (view === "financial") {
    const plan = buildRunwayPlanFromRequest(
      financialInput ?? getDefaultFinancialInput(assessment),
      {
        regime: assessment.regime,
        posture: postureForPolicyPosture(assessment.policyAssessment.posture),
      },
    );

    return {
      view,
      label: "Financial view",
      summary:
        "Translate this week into bounded runway decisions: risk now vs downside, raise window, and burn delta.",
      bullets: [
        boundedLine(
          "Action",
          `Runway risk ${plan.runwayRisk.level.toUpperCase()} at ${plan.runwayRisk.score}/100; protect downside now.`,
        ),
        boundedLine(
          "Trigger",
          `Raise window ${plan.raiseTimingRecommendation.startMonth}-${plan.raiseTimingRecommendation.endMonth} months; safe target in ${plan.raiseTimingRecommendation.timeToSafeRunwayTargetMonths} months.`,
        ),
        boundedLine(
          "Reverse",
          `Burn delta ${plan.burnAdjustment.recommendedDeltaPercent}% (range ${plan.burnAdjustment.floorPercent}% to ${plan.burnAdjustment.ceilingPercent}%).`,
        ),
      ],
      financialAction: {
        runwayRisk: plan.runwayRisk.summary,
        raiseTiming: plan.raiseTimingRecommendation.summary,
        burnAdjustment: plan.burnAdjustment.summary,
      },
    };
  }

  if (view === "forecast") {
    const topRegime = Object.entries(forecast.next90DayProbabilities).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const momentumCopy: Record<
      ForecastModel["boundaryPressure"]["momentum"],
      string
    > = {
      "toward-threshold": "Momentum is moving toward a posture boundary.",
      "away-from-threshold":
        "Momentum is moving away from the nearest posture boundary.",
      mixed: "Momentum is mixed across boundary signals.",
      stable: "Momentum is stable with no directional boundary drift.",
    };

    return {
      view,
      label: "Forecast view",
      summary:
        "Boundary pressure indicates how likely this call is to flip if signal momentum persists.",
      bullets: [
        boundedLine("Action", `Operate for ${topRegime[0]} scenario (${topRegime[1]}%) while current posture holds.`),
        boundedLine(
          "Trigger",
          `${forecast.boundaryPressure.distance} points to boundary; crossing risk ${crossingRiskLabel[forecast.boundaryPressure.crossingRisk]}.`,
        ),
        boundedLine("Reverse", momentumCopy[forecast.boundaryPressure.momentum]),
      ],
    };
  }

  return {
    view: "default",
    label: "Default view",
    summary: "Core weekly interpretation for operators.",
    bullets: [
      boundedLine("Action", homeBriefModel.decisionShiftSummary),
      boundedLine("Trigger", homeBriefModel.guardrail),
      boundedLine("Reverse", homeBriefModel.reversalTrigger),
    ],
  };
};
