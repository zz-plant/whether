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
import { deriveSectorAdjustedPosture, type SectorKey } from "./sectorSensitivity";


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

const compactClause = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1).trimEnd()}…`;
};

const boundedLine = (label: "Action" | "Trigger" | "Reverse", value: string) =>
  `${label}: ${compactClause(value)}`;

const boundedTriplet = ({
  action,
  trigger,
  reverse,
}: {
  action: string;
  trigger: string;
  reverse: string;
}) =>
  [
    boundedLine("Action", action),
    boundedLine("Trigger", trigger),
    boundedLine("Reverse", reverse),
  ].join(" | ");

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
  sector,
  isFallback,
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
  sector?: SectorKey;
  isFallback?: boolean;
}): InterpretationLayer => {
  const canonicalBullets = [
    boundedLine("Action", homeBriefModel.decisionShiftSummary),
    boundedLine("Trigger", homeBriefModel.guardrail),
    boundedLine("Reverse", homeBriefModel.reversalTrigger),
  ];

  const formatBullets = (bullets: string[]) => {
    if (isFallback) {
      return bullets.map((b) => b.replace(/^Action:\s*/, "Action: [Cached Signal] "));
    }
    return bullets;
  };


  if (view === "sector") {
    const sectorKey = sector ?? companyProfile?.sector ?? "b2b-saas";
    const adjusted = deriveSectorAdjustedPosture(
      {
        regime: assessment.regime,
        scores: assessment.scores,
        thresholds: assessment.thresholds ?? { tightnessRegime: 70, riskAppetiteRegime: 50 },
      },
      sectorKey,
    );

    const baseAction = homeBriefModel.decisionShiftSummary;
    let sectorAction = baseAction;
    if (adjusted.postureVariant !== "neutral") {
      const directionLabel = adjusted.actionBias === "loosen" ? "easing/growth" : "tightening/caution";
      sectorAction = `${adjusted.adjustedPostureLabel} variant: Shift operating pace to bias ${directionLabel}. ${baseAction}`;
    } else {
      sectorAction = `${adjusted.adjustedPostureLabel}: ${baseAction}`;
    }

    return {
      view,
      label: "Sector view",
      summary: `Sector posture adjusted for ${adjusted.adjustedPostureLabel}: ${
        adjusted.actionBias === "hold" ? "Hold baseline calls." : `Bias ${adjusted.actionBias}.`
      }`,
      bullets: formatBullets([
        boundedLine("Action", sectorAction),
        boundedLine("Trigger", homeBriefModel.guardrail),
        boundedLine("Reverse", adjusted.reversalCondition),
      ]),
    };
  }

  if (view === "company") {
    const adjustedRules = buildCompanyAdjustedRules({
      assessment,
      postureRules: decisionRules,
      profile: companyProfile,
    });

    if (adjustedRules.length === 0) {
      return {
        view,
        label: "Company view",
        summary:
          "Company-specific rules are unavailable this week; use canonical bounded decisions until profile rules return.",
        bullets: formatBullets(canonicalBullets),
      };
    }

    return {
      view,
      label: "Company view",
      summary:
        "Translate the weekly call into company-specific bounded rules without changing the base posture.",
      bullets: formatBullets(
        adjustedRules
          .slice(0, 3)
          .map((rule) =>
            boundedTriplet({
              action: rule.recommendation,
              trigger: rule.pauseTrigger,
              reverse: rule.resumeTrigger,
            }),
          ),
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

    const isTighteningRegime = assessment.regime === "SCARCITY" || assessment.regime === "DEFENSIVE";
    const actionPhrase = isTighteningRegime
      ? `Runway risk ${plan.runwayRisk.level.toUpperCase()}: Tighten burn immediately to match the ${plan.raiseTimingRecommendation.startMonth}-${plan.raiseTimingRecommendation.endMonth}m window.`
      : `Runway risk ${plan.runwayRisk.level.toUpperCase()}: Sustain growth investments within the ${plan.burnAdjustment.ceilingPercent}% ceiling limit.`;

    return {
      view,
      label: "Financial view",
      summary:
        "Translate this week into bounded runway decisions: pace now, raise window, and burn range.",
      bullets: formatBullets([
        boundedLine("Action", actionPhrase),
        boundedLine(
          "Trigger",
          `Raise window ${plan.raiseTimingRecommendation.startMonth}-${plan.raiseTimingRecommendation.endMonth} months; safe target in ${plan.raiseTimingRecommendation.timeToSafeRunwayTargetMonths} months.`,
        ),
        boundedLine(
          "Reverse",
          `Use burn delta ${plan.burnAdjustment.recommendedDeltaPercent}% (range ${plan.burnAdjustment.floorPercent}% to ${plan.burnAdjustment.ceilingPercent}%) to move faster or slower.`,
        ),
      ]),
      financialAction: {
        runwayRisk: plan.runwayRisk.summary,
        raiseTiming: plan.raiseTimingRecommendation.summary,
        burnAdjustment: plan.burnAdjustment.summary,
      },
    };
  }

  if (view === "forecast") {
    const topRegime =
      Object.entries(forecast.next90DayProbabilities).sort((a, b) => b[1] - a[1])[0] ??
      [assessment.regime, 0];
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

    const thresholds = assessment.thresholds ?? { tightnessRegime: 70, riskAppetiteRegime: 50 };
    const tightnessGap = Math.abs(assessment.scores.tightness - thresholds.tightnessRegime);
    const riskGap = Math.abs(assessment.scores.riskAppetite - thresholds.riskAppetiteRegime);
    const closestDimension = tightnessGap <= riskGap ? "Tightness" : "Risk Appetite";
    const closestScore = tightnessGap <= riskGap ? assessment.scores.tightness : assessment.scores.riskAppetite;
    const closestThreshold = tightnessGap <= riskGap ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;

    let dynamicMomentum = momentumCopy[forecast.boundaryPressure.momentum];
    if (forecast.boundaryPressure.momentum === "toward-threshold") {
      dynamicMomentum = `Momentum is accelerating toward the ${closestDimension} boundary (now ${closestScore.toFixed(1)} vs gate ${closestThreshold.toFixed(1)}).`;
    } else if (forecast.boundaryPressure.momentum === "away-from-threshold") {
      dynamicMomentum = `Momentum is widening buffer from ${closestDimension} boundary (now ${closestScore.toFixed(1)} vs gate ${closestThreshold.toFixed(1)}).`;
    }

    return {
      view,
      label: "Forecast view",
      summary:
        "Boundary pressure indicates how likely this call is to flip if signal momentum persists.",
      bullets: formatBullets([
        boundedLine("Action", `Operate for ${topRegime[0]} (${topRegime[1]}%) while current posture holds.`),
        boundedLine(
          "Trigger",
          `${forecast.boundaryPressure.distance} points to ${closestDimension} boundary; crossing risk ${crossingRiskLabel[forecast.boundaryPressure.crossingRisk].toUpperCase()}.`,
        ),
        boundedLine("Reverse", dynamicMomentum),
      ]),
    };
  }

  return {
    view: "default",
    label: "Default view",
    summary: "Core weekly interpretation for operators. The canonical decision lives above.",
    bullets: formatBullets(canonicalBullets),
  };
};
