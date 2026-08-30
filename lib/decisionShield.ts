/**
 * Decision Shield logic for translating capital postures into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";
import { REGIME_LABELS } from "./regimePresentation";
import {
  DECISION_ACTION_LABELS,
  DECISION_GUARDRAILS,
  DECISION_VERDICT_MATRIX,
} from "./decisionShieldConfig";

export type LifecycleStage = "DISCOVERY" | "GROWTH" | "SCALE" | "MATURE";
export type DecisionCategory =
  | "HIRING"
  | "ROADMAP"
  | "PRICING"
  | "INFRASTRUCTURE"
  | "M_AND_A"
  | "GEOGRAPHIC_EXPANSION"
  | "RESTRUCTURING";
export type DecisionAction =
  | "HIRE"
  | "REWRITE"
  | "LAUNCH"
  | "DISCOUNT"
  | "EXPAND"
  | "ACQUIRE"
  | "DIVEST"
  | "INFRA_SPEND"
  | "REGIONAL_EXPANSION"
  | "RESTRUCTURE";
export type DecisionVerdict = "SAFE" | "RISKY" | "DANGEROUS";

const VERDICT_ORDER: DecisionVerdict[] = ["SAFE", "RISKY", "DANGEROUS"];

const VERDICT_COPY: Record<DecisionVerdict, string> = {
  SAFE: "a safe call",
  RISKY: "a risky call",
  DANGEROUS: "a dangerous call",
};

const LIFECYCLE_COPY: Record<LifecycleStage, string> = {
  DISCOVERY: "discovery-stage",
  GROWTH: "growth-stage",
  SCALE: "scaling",
  MATURE: "mature",
};

export interface DecisionInput {
  lifecycle: LifecycleStage;
  category: DecisionCategory;
  action: DecisionAction;
  context?: string;
}

export interface DecisionOutput {
  verdict: DecisionVerdict;
  summary: string;
  bullets: string[];
  guardrail: string;
  reversalTrigger: string;
}

export const formatDecisionAction = (action: DecisionAction) =>
  DECISION_ACTION_LABELS[action];


const adjustVerdict = (verdict: DecisionVerdict, direction: "up" | "down"): DecisionVerdict => {
  const index = VERDICT_ORDER.indexOf(verdict);
  if (direction === "up") {
    return VERDICT_ORDER[Math.min(index + 1, VERDICT_ORDER.length - 1)];
  }
  return VERDICT_ORDER[Math.max(index - 1, 0)];
};

const applyContextualVerdict = (baseVerdict: DecisionVerdict, input: DecisionInput): DecisionVerdict => {
  const capitalIntensiveActions: DecisionAction[] = [
    "HIRE",
    "REWRITE",
    "INFRA_SPEND",
    "EXPAND",
    "ACQUIRE",
    "REGIONAL_EXPANSION",
  ];

  if (input.lifecycle === "DISCOVERY" && capitalIntensiveActions.includes(input.action)) {
    return adjustVerdict(baseVerdict, "up");
  }

  if (
    input.lifecycle === "MATURE" &&
    input.category === "RESTRUCTURING" &&
    (input.action === "DIVEST" || input.action === "RESTRUCTURE")
  ) {
    return adjustVerdict(baseVerdict, "down");
  }

  return baseVerdict;
};

const buildSensorBullets = (assessment: RegimeAssessment): string[] => {
  const bullets: string[] = [];
  const { baseRate, curveSlope, tightness, riskAppetite } = assessment.scores;
  const { baseRateTightness } = assessment.thresholds;

  bullets.push(
    baseRate > baseRateTightness
      ? `The Fed rate is ${baseRate.toFixed(2)}%, above the ${baseRateTightness}% line where capital gets expensive.`
      : `The Fed rate is ${baseRate.toFixed(2)}%, below the ${baseRateTightness}% line, so the cost of capital is manageable.`
  );

  if (curveSlope === null) {
    bullets.push("The recession warning gauge is unavailable this week, so inversion risk is unconfirmed.");
  } else if (curveSlope < 0) {
    bullets.push(`The yield curve is inverted at ${curveSlope.toFixed(2)}%, which historically argues for caution.`);
  } else {
    bullets.push(`The yield curve is positive at ${curveSlope.toFixed(2)}%, which leaves room for risk-taking.`);
  }

  bullets.push(
    `Funding pressure at ${tightness} against risk appetite at ${riskAppetite} holds conditions in ${REGIME_LABELS[assessment.regime]}.`
  );

  return bullets;
};

const buildReversalTrigger = (assessment: RegimeAssessment) => {
  const { tightnessRegime, riskAppetiteRegime } = assessment.thresholds;
  const cash = `funding pressure (now ${assessment.scores.tightness})`;
  const risk = `risk appetite (now ${assessment.scores.riskAppetite})`;
  const hold = `for ${REGIME_REVERSAL_DAYS} straight days`;

  if (assessment.regime === "SCARCITY") {
    return `Revisit once ${cash} drops below ${tightnessRegime} and ${risk} rises above ${riskAppetiteRegime} ${hold}.`;
  }

  if (assessment.regime === "DEFENSIVE") {
    return `Revisit once ${cash} drops below ${tightnessRegime}, or ${risk} falls to or below ${riskAppetiteRegime} ${hold}.`;
  }

  if (assessment.regime === "VOLATILE") {
    return `Revisit once ${cash} rises above ${tightnessRegime}, or ${risk} rises above ${riskAppetiteRegime} ${hold}.`;
  }

  return `Revisit once ${cash} rises above ${tightnessRegime}, or ${risk} falls to or below ${riskAppetiteRegime} ${hold}.`;
};

export const evaluateDecision = (
  assessment: RegimeAssessment,
  input: DecisionInput
): DecisionOutput => {
  const baseVerdict = DECISION_VERDICT_MATRIX[input.action][assessment.regime];
  const verdict = applyContextualVerdict(baseVerdict, input);
  const actionLabel = formatDecisionAction(input.action);
  const bullets = buildSensorBullets(assessment);

  return {
    verdict,
    summary: `On this week's signals, ${actionLabel.toLowerCase()} is ${VERDICT_COPY[verdict]} for a ${LIFECYCLE_COPY[input.lifecycle]} team in ${REGIME_LABELS[assessment.regime]} conditions.`,
    bullets,
    guardrail: DECISION_GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};

export interface CompanyFinancialProfile {
  runwayMonths?: number;
  cashBalanceUsd?: number;
  businessModel?: "VC_BACKED" | "BOOTSTRAPPED";
  grossMarginPct?: number;
}

export interface PlanStressTestRequest {
  planText: string;
  lifecycle?: LifecycleStage;
  category?: DecisionCategory;
  companyProfile?: CompanyFinancialProfile;
}

export interface PlanStressTestResult {
  verdict: DecisionVerdict;
  headline: string;
  detectedCategory: DecisionCategory;
  detectedAction: DecisionAction;
  fragileAssumptions: string[];
  boundedGuardrail: string;
  reversalTrigger: string;
  reversibleAlternative: string;
  financialImpactSummary?: string;
}

export interface PlanComparisonResult {
  planA: PlanStressTestResult;
  planB: PlanStressTestResult;
  preferredPlan: "A" | "B" | "TIE";
  comparativeRecommendation: string;
}

const detectCategoryAndAction = (text: string, categoryOverride?: DecisionCategory): { category: DecisionCategory; action: DecisionAction } => {
  if (categoryOverride) {
    if (categoryOverride === "HIRING") return { category: "HIRING", action: "HIRE" };
    if (categoryOverride === "INFRASTRUCTURE") return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
    if (categoryOverride === "PRICING") return { category: "PRICING", action: "DISCOUNT" };
    if (categoryOverride === "ROADMAP") return { category: "ROADMAP", action: "REWRITE" };
    if (categoryOverride === "M_AND_A") return { category: "M_AND_A", action: "ACQUIRE" };
    if (categoryOverride === "GEOGRAPHIC_EXPANSION") return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION" };
    return { category: "RESTRUCTURING", action: "RESTRUCTURE" };
  }

  const lower = text.toLowerCase();
  if (/\b(hire|hiring|headcount|recruiting|engineer|engineers|sdr|developer|team member)\b/.test(lower)) {
    return { category: "HIRING", action: "HIRE" };
  }
  if (/\b(lease|office|rent|real estate|sq ft|square foot)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
  }
  if (/\b(cloud|aws|gpu|server|cluster|instances|infrastructure|database|hosting)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
  }
  if (/\b(discount|pricing|price|deal|contract discount|payment term)\b/.test(lower)) {
    return { category: "PRICING", action: "DISCOUNT" };
  }
  if (/\b(acquire|acquisition|merger|m&a|buy company)\b/.test(lower)) {
    return { category: "M_AND_A", action: "ACQUIRE" };
  }
  if (/\b(rewrite|refactor|architecture|rebuild|v2 migration)\b/.test(lower)) {
    return { category: "ROADMAP", action: "REWRITE" };
  }
  if (/\b(expand|international|europe|asia|new market|geo)\b/.test(lower)) {
    return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION" };
  }

  return { category: "HIRING", action: "HIRE" };
};

export const stressTestDecisionPlan = (
  assessment: RegimeAssessment,
  request: PlanStressTestRequest
): PlanStressTestResult => {
  const lifecycle = request.lifecycle ?? "GROWTH";
  const { category, action } = detectCategoryAndAction(request.planText, request.category);
  const profile = request.companyProfile;

  const baseEvaluation = evaluateDecision(assessment, {
    lifecycle,
    category,
    action,
    context: request.planText,
  });

  const { tightness, riskAppetite, baseRate, curveSlope } = assessment.scores;
  const regimeLabel = REGIME_LABELS[assessment.regime];

  let verdict = baseEvaluation.verdict;
  const fragileAssumptions: string[] = [];
  let financialImpactSummary: string | undefined = undefined;

  if (profile) {
    if (profile.runwayMonths !== undefined && profile.runwayMonths < 12 && (assessment.regime === "DEFENSIVE" || assessment.regime === "SCARCITY")) {
      verdict = "DANGEROUS";
      fragileAssumptions.push(
        `Critical runway constraint: With only ${profile.runwayMonths} months cash buffer, capital markets in ${regimeLabel} severely penalize refinancing.`
      );
      financialImpactSummary = `Current runway (${profile.runwayMonths}m) is below the 15-month safe threshold for ${regimeLabel} conditions.`;
    } else if (profile.businessModel === "BOOTSTRAPPED" && profile.grossMarginPct && profile.grossMarginPct >= 70) {
      if (verdict === "RISKY") {
        verdict = "SAFE";
      }
      financialImpactSummary = `Bootstrapped profile with high gross margins (${profile.grossMarginPct}%) mitigates external equity market tightness.`;
    } else if (profile.runwayMonths !== undefined) {
      financialImpactSummary = `Runway buffer (${profile.runwayMonths}m) evaluated against ${regimeLabel} posture baseline.`;
    }
  }

  const isExplicitlyReversible = /\b(contract-to-hire|contract to hire|milestone|monthly rolling|on-demand|convertible|short-term|reversible)\b/i.test(request.planText);
  if (isExplicitlyReversible && verdict === "RISKY") {
    verdict = "SAFE";
  }

  if (tightness > 60 && profile?.businessModel !== "BOOTSTRAPPED") {
    fragileAssumptions.push(
      `Assumes capital and debt refinancing remain cheap while funding pressure is elevated (${tightness}/100).`
    );
  }
  if (curveSlope !== null && curveSlope < 0) {
    fragileAssumptions.push(
      `Assumes steady customer procurement velocity despite inverted yield curve (${curveSlope.toFixed(2)}%), which historically stretches enterprise sales cycles.`
    );
  }
  if (riskAppetite < 50) {
    fragileAssumptions.push(
      `Assumes investor and market risk tolerance supports aggressive capital burn (current risk appetite is subdued at ${riskAppetite}/100).`
    );
  }
  if (fragileAssumptions.length === 0) {
    fragileAssumptions.push(
      `Macro conditions are relatively accommodative, but monitor sudden Fed base rate shifts above ${baseRate.toFixed(2)}%.`
    );
  }

  let reversibleAlternative = "";
  if (category === "HIRING") {
    reversibleAlternative =
      "Cap permanent full-time hiring to 50% of the planned reqs; convert remainder to 6-month contract-to-hire with milestone-gated conversion.";
  } else if (category === "INFRASTRUCTURE") {
    reversibleAlternative =
      "Avoid multi-year upfront reservations; use 6-to-12 month convertible commitments or monthly rolling tiers to preserve liquidity.";
  } else if (category === "PRICING") {
    reversibleAlternative =
      "Condition discounts strictly on 100% annual upfront cash collection to generate non-dilutive working capital.";
  } else if (category === "ROADMAP") {
    reversibleAlternative =
      "Stage the technical refactor in 2-week vertical slices rather than a monolithic multi-month lock-in.";
  } else {
    reversibleAlternative =
      "Structure agreement with 90-day review windows and explicit break clauses tied to quarterly revenue targets.";
  }

  return {
    verdict,
    headline: `${formatDecisionAction(action)} is considered ${verdict} in ${regimeLabel} conditions.`,
    detectedCategory: category,
    detectedAction: action,
    fragileAssumptions,
    boundedGuardrail: baseEvaluation.guardrail,
    reversalTrigger: baseEvaluation.reversalTrigger,
    reversibleAlternative,
    financialImpactSummary,
  };
};

export const compareDecisionPlans = (
  assessment: RegimeAssessment,
  planAText: string,
  planBText: string,
  companyProfile?: CompanyFinancialProfile
): PlanComparisonResult => {
  const planA = stressTestDecisionPlan(assessment, { planText: planAText, companyProfile });
  const planB = stressTestDecisionPlan(assessment, { planText: planBText, companyProfile });

  const scoreMap: Record<DecisionVerdict, number> = {
    SAFE: 3,
    RISKY: 2,
    DANGEROUS: 1,
  };

  const scoreA = scoreMap[planA.verdict];
  const scoreB = scoreMap[planB.verdict];

  let preferredPlan: "A" | "B" | "TIE" = "TIE";
  let comparativeRecommendation = "";

  if (scoreA > scoreB) {
    preferredPlan = "A";
    comparativeRecommendation = `Plan A (${planA.verdict}) carries significantly lower macro risk than Plan B (${planB.verdict}) under current ${REGIME_LABELS[assessment.regime]} posture.`;
  } else if (scoreB > scoreA) {
    preferredPlan = "B";
    comparativeRecommendation = `Plan B (${planB.verdict}) is structurally safer than Plan A (${planA.verdict}) by preserving higher reversibility.`;
  } else {
    preferredPlan = "TIE";
    comparativeRecommendation = `Both plans carry equivalent macro risk profiles (${planA.verdict}). Prioritize the option with shorter commitment duration.`;
  }

  return {
    planA,
    planB,
    preferredPlan,
    comparativeRecommendation,
  };
};
