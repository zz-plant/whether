import { getPlaybookGuidance } from "../playbook";
import type { RegimeAssessment } from "../regimeEngine";
import type { BoundedDecisionRule, DecisionArea } from "./boundedDecisionRules";
import {
  buildRunwayPlanFromRequest,
  type PlannerPosture,
  type PlannerSector,
  type PlannerStage,
} from "./runwayPlanner";

export type CompanyStage = "seed" | "series-b" | "late-stage";
export type CompanyRevenueBand = "pre-revenue" | "sub-1m-arr" | "1-10m-arr" | "10m-plus-arr";
export type CompanyRunwayBand = "under-12m" | "12-18m" | "18m-plus";
export type CompanyGrowthBand = "contracting" | "flat" | "moderate" | "high";
export type CompanyTeamSizeBand = "1-20" | "21-100" | "101-500" | "500-plus";
export type CompanySector = PlannerSector;
export type CompanyBusinessModel = "b2b" | "b2c" | "marketplace" | "usage-based";

export type CompanyProfile = {
  stage: CompanyStage;
  revenueBand: CompanyRevenueBand;
  runwayBand: CompanyRunwayBand;
  growthBand: CompanyGrowthBand;
  teamSizeBand: CompanyTeamSizeBand;
  sector: CompanySector;
  businessModel: CompanyBusinessModel;
};

export type CompanyAdjustedRule = BoundedDecisionRule & {
  priority: number;
};

const defaultProfile: CompanyProfile = {
  stage: "series-b",
  revenueBand: "1-10m-arr",
  runwayBand: "12-18m",
  growthBand: "moderate",
  teamSizeBand: "21-100",
  sector: "b2b-saas",
  businessModel: "b2b",
};

const stagePriorityDelta: Record<CompanyStage, Partial<Record<DecisionArea, number>>> = {
  seed: {
    hiring: 5,
    "capital-raising": 3,
    "product-tempo": 2,
  },
  "series-b": {
    "burn-discipline": 3,
    "product-tempo": 2,
  },
  "late-stage": {
    "burn-discipline": 5,
    "expansion-bets": 3,
  },
};

const sectorAdjustment: Record<CompanySector, Partial<Record<DecisionArea, string>>> = {
  consumer: {
    "product-tempo": "Use weekly retention and conversion checkpoints before broad launch scope.",
    "expansion-bets": "Keep market expansion reversible until demand quality is steady for two reads.",
  },
  "b2b-saas": {
    hiring: "Bias hiring toward quota-carrying and reliability roles with payback visibility.",
    "capital-raising": "Anchor process on pipeline durability and churn resilience proof.",
  },
  infrastructure: {
    "burn-discipline": "Gate capacity and compute commitments by contracted usage ramps.",
    "capital-raising": "Prioritize financing durability for longer infrastructure sales cycles.",
  },
};

const stageAdjustment: Record<CompanyStage, Partial<Record<DecisionArea, { recommendation: string; stop: string; reverse: string }>>> = {
  seed: {
    hiring: {
      recommendation: "Keep net-new hiring founder-led and tied to immediate delivery risk.",
      stop: "team growth exceeds 20 people without weekly shipping throughput gains",
      reverse: "two consecutive weeks of on-time delivery and runway remains above 12 months",
    },
    "capital-raising": {
      recommendation: "Maintain an always-on investor narrative and open process early.",
      stop: "active raise distracts from core product milestones for more than one sprint",
      reverse: "core milestone velocity is restored and downside runway is above 12 months",
    },
  },
  "series-b": {
    "product-tempo": {
      recommendation: "Prioritize roadmap slices that improve expansion and retention inside two quarters.",
      stop: "new initiative payback horizon exceeds two quarters without validation",
      reverse: "validated cohort-level payback returns inside two quarters",
    },
  },
  "late-stage": {
    "burn-discipline": {
      recommendation: "Force spend reviews through margin and efficiency deltas before approval.",
      stop: "quarterly margin trajectory weakens while discretionary spend grows",
      reverse: "margin trajectory stabilizes and discretionary spend growth slows",
    },
    "expansion-bets": {
      recommendation: "Limit expansion to tranches with board-visible rollback criteria.",
      stop: "expansion tranche misses two consecutive stage gates",
      reverse: "stage gates are met with positive unit economics for two reads",
    },
  },
};

const runwayMonthsByBand: Record<CompanyRunwayBand, number> = {
  "under-12m": 10,
  "12-18m": 15,
  "18m-plus": 21,
};

const revenueByBand: Record<CompanyRevenueBand, number> = {
  "pre-revenue": 0,
  "sub-1m-arr": 70_000,
  "1-10m-arr": 450_000,
  "10m-plus-arr": 1_200_000,
};

const growthRateByBand: Record<CompanyGrowthBand, number> = {
  contracting: -8,
  flat: 2,
  moderate: 10,
  high: 24,
};

const stageToPlannerStage: Record<CompanyStage, PlannerStage> = {
  seed: "seed",
  "series-b": "growth",
  "late-stage": "public",
};

const postureForPolicyPosture = (
  posture: RegimeAssessment["policyAssessment"]["posture"],
): PlannerPosture => {
  if (posture === "RISK_ON") return "RISK_ON";
  if (posture === "TRANSITION") return "TRANSITION";
  return "SAFETY_MODE";
};

const baseAreaPriority: Record<DecisionArea, number> = {
  "capital-raising": 100,
  "burn-discipline": 95,
  hiring: 90,
  "product-tempo": 85,
  "expansion-bets": 80,
};

export const resolveCompanyProfile = (profile?: Partial<CompanyProfile>): CompanyProfile => {
  const definedOverrides = Object.fromEntries(Object.entries(profile ?? {}).filter(([, value]) => value !== undefined)) as Partial<
    CompanyProfile
  >;

  return {
    ...defaultProfile,
    ...definedOverrides,
  };
};

export const buildCompanyAdjustedRules = ({
  assessment,
  postureRules,
  profile,
}: {
  assessment: RegimeAssessment;
  postureRules: BoundedDecisionRule[];
  profile?: Partial<CompanyProfile>;
}): CompanyAdjustedRule[] => {
  const resolvedProfile = resolveCompanyProfile(profile);
  const playbook = getPlaybookGuidance(assessment.regime, {
    thresholds: assessment.thresholds,
    scores: assessment.scores,
  });
  const runwayPlan = buildRunwayPlanFromRequest(
    {
      runway: runwayMonthsByBand[resolvedProfile.runwayBand],
      burn: resolvedProfile.stage === "late-stage" ? 2_000_000 : 900_000,
      revenue: revenueByBand[resolvedProfile.revenueBand],
      growthRate: growthRateByBand[resolvedProfile.growthBand],
      sector: resolvedProfile.sector,
      stage: stageToPlannerStage[resolvedProfile.stage],
    },
    {
      regime: assessment.regime,
      posture: postureForPolicyPosture(assessment.policyAssessment.posture),
    },
  );

  return postureRules
    .map((rule) => {
      const sectorRule = sectorAdjustment[resolvedProfile.sector][rule.area];
      const stageRule = stageAdjustment[resolvedProfile.stage][rule.area];
      const runwayConstraint =
        rule.area === "capital-raising"
          ? runwayPlan.raiseTimingRecommendation.summary
          : rule.area === "burn-discipline"
            ? runwayPlan.burnAdjustment.summary
            : runwayPlan.runwayRisk.summary;

      const priority =
        baseAreaPriority[rule.area] +
        (stagePriorityDelta[resolvedProfile.stage][rule.area] ?? 0) +
        (runwayPlan.runwayRisk.level === "high" || runwayPlan.runwayRisk.level === "critical"
          ? rule.area === "capital-raising" || rule.area === "burn-discipline"
            ? 6
            : 0
          : 0);

      return {
        ...rule,
        recommendation: [rule.recommendation, sectorRule, stageRule?.recommendation, `Runway constraint: ${runwayConstraint}`]
          .filter(Boolean)
          .join(" "),
        pauseTrigger: [rule.pauseTrigger, stageRule ? `Stop if ${stageRule.stop}.` : null, `Playbook stop: ${playbook.stopItems[0]}.`]
          .filter(Boolean)
          .join(" "),
        resumeTrigger: [rule.resumeTrigger, stageRule ? `Reverse when ${stageRule.reverse}.` : null, `Playbook restart: ${playbook.startItems[0]}.`]
          .filter(Boolean)
          .join(" "),
        priority,
      };
    })
    .sort((a, b) => b.priority - a.priority);
};
