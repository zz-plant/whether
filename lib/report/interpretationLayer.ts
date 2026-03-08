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
    return {
      view,
      label: "Sector view",
      summary:
        "Apply the macro call through sector sensitivity before changing pace.",
      bullets: homeBriefModel.macroOverlay.map(
        (item) => `${item.label}: ${item.detail}`,
      ),
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
            `${rule.recommendation} Stop: ${rule.pauseTrigger} Reversal: ${rule.resumeTrigger}`,
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
        `Runway risk ${plan.runwayRisk.level.toUpperCase()} (${plan.runwayRisk.score}/100); downside flip ${plan.runwayRisk.macroRiskDownsideFlip}/100.`,
        `Raise window ${plan.raiseTimingRecommendation.startMonth}-${plan.raiseTimingRecommendation.endMonth} months; safe-runway target in ${plan.raiseTimingRecommendation.timeToSafeRunwayTargetMonths} months.`,
        `Burn adjustment ${plan.burnAdjustment.recommendedDeltaPercent}% (range ${plan.burnAdjustment.floorPercent}% to ${plan.burnAdjustment.ceilingPercent}%).`,
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
        `Highest likelihood next posture: ${topRegime[0]} (${topRegime[1]}%).`,
        `Threshold distance: ${forecast.boundaryPressure.distance} points to the nearest posture boundary.`,
        `Crossing risk: ${crossingRiskLabel[forecast.boundaryPressure.crossingRisk]}.`,
        momentumCopy[forecast.boundaryPressure.momentum],
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
