import type { RegimeAssessment } from "../regimeEngine";
import type { ForecastModel } from "./forecastModel";
import type { BoundedDecisionRule } from "./boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "./reportCopy";
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

// "Reverse" is this layer's compact form and has no matching value in
// DECISION_CONTRACT_LABELS; widening it to "Reversal" would change output.
type BoundedLineLabel =
  | typeof DECISION_CONTRACT_LABELS.slot.action
  | typeof DECISION_CONTRACT_LABELS.threshold.trigger
  | "Reverse";

const boundedLine = (label: BoundedLineLabel, value: string) =>
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
    boundedLine(DECISION_CONTRACT_LABELS.slot.action, action),
    boundedLine(DECISION_CONTRACT_LABELS.threshold.trigger, trigger),
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

/** A profile with at least one field set is the reader's; an empty one means the illustrative default. */
const hasCompanyProfile = (profile?: Partial<CompanyProfile>): boolean =>
  Boolean(profile && Object.values(profile).some((value) => value !== undefined));

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
    boundedLine(DECISION_CONTRACT_LABELS.slot.action, homeBriefModel.decisionShiftSummary),
    boundedLine(DECISION_CONTRACT_LABELS.threshold.trigger, homeBriefModel.guardrail),
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

    const paceCopy =
      adjusted.actionBias === "loosen"
        ? "Run this sector a step ahead of the base call."
        : adjusted.actionBias === "tighten"
          ? "Run this sector a step behind the base call."
          : "Run this sector at the base call.";
    const sectorAction = `${adjusted.adjustedPostureLabel}. ${paceCopy}`;

    return {
      view,
      label: "Sector view",
      summary: `This sector reads as ${adjusted.adjustedPostureLabel}. ${paceCopy}`,
      bullets: formatBullets([
        boundedLine(DECISION_CONTRACT_LABELS.slot.action, sectorAction),
        boundedLine(DECISION_CONTRACT_LABELS.threshold.trigger, homeBriefModel.guardrail),
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
      summary: hasCompanyProfile(companyProfile)
        ? "Translate the weekly call into company-specific bounded rules without changing the base posture."
        : "Illustrative: these rules assume a Series B company with $1–10M ARR and 12–18 months of runway. Whether does not take your company's figures here; use the runway planner on Planning for yours.",
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
      ? `Runway risk is ${plan.runwayRisk.level}, so cut burn now to reach the ${plan.raiseTimingRecommendation.startMonth}–${plan.raiseTimingRecommendation.endMonth} month raise window.`
      : `Runway risk is ${plan.runwayRisk.level}, so keep funding growth up to the ${plan.burnAdjustment.ceilingPercent}% burn ceiling.`;

    return {
      view,
      label: "Financial view",
      summary: financialInput
        ? "This week's call, translated into runway: how fast to spend, when to raise, and how far burn can move."
        : "Illustrative: this week's call translated into runway for a typical company in this regime, not your figures. The runway planner on Planning sizes it with yours.",
      bullets: formatBullets([
        boundedLine(DECISION_CONTRACT_LABELS.slot.action, actionPhrase),
        boundedLine(
          DECISION_CONTRACT_LABELS.threshold.trigger,
          `Open the raise between month ${plan.raiseTimingRecommendation.startMonth} and ${plan.raiseTimingRecommendation.endMonth}; safe runway is ${plan.raiseTimingRecommendation.timeToSafeRunwayTargetMonths} months out.`,
        ),
        boundedLine(
          "Reverse",
          `Move burn by ${plan.burnAdjustment.recommendedDeltaPercent}%, anywhere between ${plan.burnAdjustment.floorPercent}% and ${plan.burnAdjustment.ceilingPercent}%.`,
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
    const closestDimension = tightnessGap <= riskGap ? "Funding pressure" : "Risk appetite";
    const closestScore = tightnessGap <= riskGap ? assessment.scores.tightness : assessment.scores.riskAppetite;
    const closestThreshold = tightnessGap <= riskGap ? thresholds.tightnessRegime : thresholds.riskAppetiteRegime;

    let dynamicMomentum = momentumCopy[forecast.boundaryPressure.momentum];
    if (forecast.boundaryPressure.momentum === "toward-threshold") {
      dynamicMomentum = `${closestDimension} is closing on its boundary — ${closestScore.toFixed(1)} today against a gate of ${closestThreshold.toFixed(1)}.`;
    } else if (forecast.boundaryPressure.momentum === "away-from-threshold") {
      dynamicMomentum = `${closestDimension} is pulling away from its boundary — ${closestScore.toFixed(1)} today against a gate of ${closestThreshold.toFixed(1)}.`;
    }

    return {
      view,
      label: "Forecast view",
      summary:
        "How likely this call is to flip if the current momentum holds.",
      bullets: formatBullets([
        boundedLine(DECISION_CONTRACT_LABELS.slot.action, `Operate for ${topRegime[0]} while the current posture holds — it carries ${topRegime[1]}% of the next-90-day weight.`),
        boundedLine(
          DECISION_CONTRACT_LABELS.threshold.trigger,
          `${forecast.boundaryPressure.distance} points separate this call from its ${closestDimension.toLowerCase()} boundary, at ${crossingRiskLabel[forecast.boundaryPressure.crossingRisk].toLowerCase()} crossing risk.`,
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
