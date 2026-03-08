import { getPlaybookGuidance } from "../playbook";
import type { RegimeKey } from "../regimeEngine";
import { buildCanonicalBoundedDecisionRules } from "./boundedDecisionRules";
import { deriveDecisionKnobs } from "./decisionKnobs";

export type PlannerSector = "b2b-saas" | "consumer" | "infrastructure";
export type PlannerStage = "seed" | "series-a" | "growth" | "public";
export type PlannerPosture = "RISK_ON" | "TRANSITION" | "SAFETY_MODE";

export type RunwayPlannerInput = {
  runwayMonths: number;
  monthlyBurn: number;
  monthlyRevenue: number;
  growthRate: number;
  sector: PlannerSector;
  stage: PlannerStage;
  regime: RegimeKey;
  posture: PlannerPosture;
};

export type RunwayPlannerOutput = {
  runwayRisk: {
    score: number;
    level: "low" | "moderate" | "high" | "critical";
    summary: string;
  };
  safeRunwayBand: {
    minMonths: number;
    maxMonths: number;
    summary: string;
  };
  raiseTimingWindow: {
    startMonth: number;
    endMonth: number;
    summary: string;
  };
  burnAdjustmentRange: {
    minPercent: number;
    maxPercent: number;
    summary: string;
  };
  boundedRules: {
    burnDiscipline: string;
    capitalRaising: string;
  };
};

const SAFE_RUNWAY_BAND_BY_REGIME: Record<RegimeKey, { min: number; max: number }> = {
  SCARCITY: { min: 18, max: 30 },
  DEFENSIVE: { min: 15, max: 24 },
  VOLATILE: { min: 12, max: 20 },
  EXPANSION: { min: 9, max: 18 },
};

const STAGE_BAND_DELTA: Record<PlannerStage, number> = {
  seed: 3,
  "series-a": 2,
  growth: 0,
  public: -1,
};

const SECTOR_BAND_DELTA: Record<PlannerSector, number> = {
  infrastructure: 2,
  "b2b-saas": 0,
  consumer: -1,
};

const POSTURE_RISK_DELTA: Record<PlannerPosture, number> = {
  SAFETY_MODE: 8,
  TRANSITION: 4,
  RISK_ON: -4,
};

const BURN_RANGE_BY_REGIME: Record<RegimeKey, { min: number; max: number }> = {
  SCARCITY: { min: -30, max: -15 },
  DEFENSIVE: { min: -20, max: -8 },
  VOLATILE: { min: -12, max: 0 },
  EXPANSION: { min: -5, max: 10 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

const growthToDecimal = (growthRate: number) => growthRate / 100;

const sanitize = (input: RunwayPlannerInput): RunwayPlannerInput => ({
  ...input,
  runwayMonths: clamp(Number.isFinite(input.runwayMonths) ? input.runwayMonths : 0, 1, 60),
  monthlyBurn: clamp(Number.isFinite(input.monthlyBurn) ? input.monthlyBurn : 0, 0, 100_000_000),
  monthlyRevenue: clamp(Number.isFinite(input.monthlyRevenue) ? input.monthlyRevenue : 0, 0, 100_000_000),
  growthRate: clamp(Number.isFinite(input.growthRate) ? input.growthRate : 0, -40, 80),
});

const inferRiskLevel = (score: number): RunwayPlannerOutput["runwayRisk"]["level"] => {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "moderate";
  return "low";
};

const buildSafeBand = (input: RunwayPlannerInput) => {
  const base = SAFE_RUNWAY_BAND_BY_REGIME[input.regime];
  const growthDelta = input.growthRate >= 20 ? -2 : input.growthRate >= 12 ? -1 : input.growthRate <= 4 ? 1 : 0;
  const minMonths = clamp(base.min + STAGE_BAND_DELTA[input.stage] + SECTOR_BAND_DELTA[input.sector] + growthDelta, 6, 36);
  const maxMonths = clamp(base.max + STAGE_BAND_DELTA[input.stage] + SECTOR_BAND_DELTA[input.sector] + growthDelta, minMonths + 4, 42);
  return { minMonths, maxMonths };
};

const projectRunwayTrajectory = (input: RunwayPlannerInput) => {
  const growth = growthToDecimal(input.growthRate);
  const projectedRevenueInSixMonths = input.monthlyRevenue * Math.pow(1 + growth, 6);
  const netBurnNow = Math.max(input.monthlyBurn - input.monthlyRevenue, 0);
  const netBurnInSixMonths = Math.max(input.monthlyBurn - projectedRevenueInSixMonths, 0);
  const burnImprovementPct =
    netBurnNow === 0 ? 0 : ((netBurnNow - netBurnInSixMonths) / netBurnNow) * 100;

  return {
    netBurnNow,
    netBurnInSixMonths,
    burnImprovementPct,
    burnMultiple: input.monthlyRevenue > 0 ? input.monthlyBurn / input.monthlyRevenue : 4,
  };
};

const getKnobLevel = (
  input: RunwayPlannerInput,
  runwayGap: number,
  key: "approvalVelocity" | "payback",
) => {
  const knobs = deriveDecisionKnobs(input.regime, 0, {
    nearestThresholdGap: Math.abs(runwayGap) * 3,
  });
  const knob = knobs.find((item) => item.key === key);
  if (!knob) {
    return key === "approvalVelocity" ? "1 · Slow" : "1 · Cautious";
  }
  return knob.levelLabels[knob.value] ?? knob.levelLabels[1];
};

const deriveRaiseWindow = (
  runwayRisk: RunwayPlannerOutput["runwayRisk"]["level"],
  runwayGap: number,
  runwayMonths: number,
  safeMinMonths: number,
) => {
  if (runwayRisk === "critical") {
    return { startMonth: 0, endMonth: 2 };
  }
  if (runwayRisk === "high") {
    return { startMonth: 1, endMonth: 3 };
  }

  const urgencyBoost = runwayGap > 0 ? 1 : 0;
  const runwayCoverage = runwayMonths / safeMinMonths;
  if (runwayRisk === "moderate" || runwayCoverage < 1.1) {
    return { startMonth: 2 - urgencyBoost, endMonth: 5 - urgencyBoost };
  }

  return { startMonth: 4, endMonth: 8 };
};

export const getRunwayPlannerBaselineInput = (
  regime: RegimeKey,
  posture: PlannerPosture,
): RunwayPlannerInput => ({
  runwayMonths: regime === "SCARCITY" ? 11 : regime === "DEFENSIVE" ? 13 : regime === "VOLATILE" ? 14 : 16,
  monthlyBurn: regime === "EXPANSION" ? 900_000 : 700_000,
  monthlyRevenue: regime === "SCARCITY" ? 420_000 : 500_000,
  growthRate: regime === "EXPANSION" ? 18 : regime === "VOLATILE" ? 10 : 7,
  sector: "b2b-saas",
  stage: "growth",
  regime,
  posture,
});

export const buildRunwayPlan = (rawInput: RunwayPlannerInput): RunwayPlannerOutput => {
  const input = sanitize(rawInput);
  const safeBand = buildSafeBand(input);
  const runwayGap = safeBand.minMonths - input.runwayMonths;
  const trajectory = projectRunwayTrajectory(input);

  const runwayGapPenalty = runwayGap > 0 ? runwayGap * 5.5 : runwayGap * 1.5;
  const burnMultiplePenalty = (trajectory.burnMultiple - 1) * 10;
  const trajectoryRelief = clamp(trajectory.burnImprovementPct, -20, 35) * -0.35;
  const growthPenalty = input.growthRate < 4 ? 4 : 0;

  const riskScore = clamp(
    44 + runwayGapPenalty + burnMultiplePenalty + POSTURE_RISK_DELTA[input.posture] + trajectoryRelief + growthPenalty,
    0,
    100,
  );
  const riskLevel = inferRiskLevel(riskScore);

  const raiseWindow = deriveRaiseWindow(riskLevel, runwayGap, input.runwayMonths, safeBand.minMonths);

  const baseBurnRange = BURN_RANGE_BY_REGIME[input.regime];
  const riskTightening = riskLevel === "critical" ? -8 : riskLevel === "high" ? -5 : riskLevel === "moderate" ? -2 : 0;
  const growthOffset = input.growthRate >= 20 && input.regime === "EXPANSION" ? 4 : 0;
  const burnMinPercent = clamp(baseBurnRange.min + riskTightening, -45, 10);
  const burnMaxPercent = clamp(baseBurnRange.max + growthOffset, burnMinPercent + 4, 20);

  const rules = buildCanonicalBoundedDecisionRules({
    regime: input.regime,
    thresholds: {
      tightnessRegime: 70,
      riskAppetiteRegime: 50,
    },
    scores: {
      tightness: 70,
      riskAppetite: 50,
    },
  });
  const burnRule = rules.find((rule) => rule.area === "burn-discipline");
  const capitalRule = rules.find((rule) => rule.area === "capital-raising");

  const playbook = getPlaybookGuidance(input.regime);
  const approvalVelocity = getKnobLevel(input, runwayGap, "approvalVelocity");
  const paybackStrictness = getKnobLevel(input, runwayGap, "payback");

  return {
    runwayRisk: {
      score: round(riskScore),
      level: riskLevel,
      summary: `${riskLevel.toUpperCase()} runway risk: ${Math.round(trajectory.netBurnNow).toLocaleString()} net burn/mo vs ${round(safeBand.minMonths)}-${round(safeBand.maxMonths)} safe-month band.`,
    },
    safeRunwayBand: {
      minMonths: round(safeBand.minMonths),
      maxMonths: round(safeBand.maxMonths),
      summary: `Operate with ${round(safeBand.minMonths)}-${round(safeBand.maxMonths)} months of runway for ${input.stage} ${input.sector} teams.`,
    },
    raiseTimingWindow: {
      ...raiseWindow,
      summary: `Run raise in ${raiseWindow.startMonth}-${raiseWindow.endMonth} months; approval velocity ${approvalVelocity}. Flip to later window after runway exceeds ${round(safeBand.minMonths)} months.` ,
    },
    burnAdjustmentRange: {
      minPercent: burnMinPercent,
      maxPercent: burnMaxPercent,
      summary: `Adjust burn ${burnMinPercent}% to ${burnMaxPercent}% with payback strictness ${paybackStrictness}. Reverse only after two weekly reads stabilize and runway clears ${round(safeBand.minMonths)} months.`,
    },
    boundedRules: {
      burnDiscipline: burnRule
        ? `${burnRule.recommendation} ${burnRule.pauseTrigger} ${burnRule.resumeTrigger} Playbook stop: ${playbook.stopItems[0] ?? "Avoid unbudgeted bets."}`
        : "Gate discretionary burn and resume only after threshold improvement.",
      capitalRaising: capitalRule
        ? `${capitalRule.recommendation} ${capitalRule.pauseTrigger} ${capitalRule.resumeTrigger} Playbook start: ${playbook.startItems[0] ?? "Invest in margin-positive moves."}`
        : "Stage fundraising with explicit pause and resume conditions.",
    },
  };
};

export const formatRunwayPlanCompactBlock = (plan: RunwayPlannerOutput) =>
  [
    "Financial implications:",
    `• Runway risk: ${plan.runwayRisk.level.toUpperCase()} (${plan.runwayRisk.score}/100).`,
    `• Safe runway band: ${plan.safeRunwayBand.minMonths}-${plan.safeRunwayBand.maxMonths} months.`,
    `• Raise timing window: ${plan.raiseTimingWindow.startMonth}-${plan.raiseTimingWindow.endMonth} months.`,
    `• Suggested burn adjustment: ${plan.burnAdjustmentRange.minPercent}% to ${plan.burnAdjustmentRange.maxPercent}%.`,
    `• Capital-raising guardrail: ${plan.boundedRules.capitalRaising}`,
    `• Burn-discipline guardrail: ${plan.boundedRules.burnDiscipline}`,
  ].join("\n");
