/**
 * Decision Shield logic for translating capital postures into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";
import { BASE_RATE_SOURCE_LABELS } from "./regimeEngineCore";
import { REGIME_LABELS } from "./regimePresentation";
import {
  DECISION_ACTION_LABELS,
  DECISION_GUARDRAILS,
  DECISION_VERDICT_MATRIX,
} from "./decisionShieldConfig";
import {
  computeRunwayShare,
  formatCommitmentUsd,
  parsePlanCommitment,
  type ParsedCommitment,
} from "./planCommitment";

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
  const { baseRate, baseRateUsed, curveSlope, tightness, riskAppetite } = assessment.scores;
  const { baseRateTightness } = assessment.thresholds;

  /* This line said "The Fed rate is X%" for a reading that is the one-month
     bill, and `buildShareText` copies these bullets verbatim into the block
     operators paste into a thread — so the misnaming travelled further than the
     screen it was written on. */
  const rateLabel = BASE_RATE_SOURCE_LABELS[baseRateUsed];
  bullets.push(
    baseRate > baseRateTightness
      ? `${rateLabel} is ${baseRate.toFixed(2)}%, above the ${baseRateTightness}% line where capital gets expensive.`
      : `${rateLabel} is ${baseRate.toFixed(2)}%, below the ${baseRateTightness}% line, so the cost of capital is manageable.`
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
  /** Net monthly cash burn. With `runwayMonths` this stands in for a cash
   *  balance, which is the figure a founder is likelier to know from memory. */
  monthlyBurnUsd?: number;
  businessModel?: "VC_BACKED" | "BOOTSTRAPPED";
  grossMarginPct?: number;
}

/**
 * Runway below which a new commitment is treated as critical rather than merely
 * expensive, in months.
 *
 * Named because the prose used to quote a different number than the rule: the
 * check was `< 12` and the sentence beside it read "below the 15-month safe
 * threshold". An operator reading that could not reproduce the verdict from the
 * stated rule, which is the one thing every bounded rule here has to allow.
 */
const RUNWAY_CRITICAL_MONTHS = 12;

/**
 * Share of available cash a single first-year commitment can consume before the
 * verdict moves.
 *
 * Sizing only ever makes a call worse, never better. A small commitment in the
 * wrong regime is still a bet in the wrong direction, so there is no de-escalation
 * rung here — the regime matrix owns direction and this owns magnitude.
 */
const COMMITMENT_SHARE_ELEVATED = 0.25;
const COMMITMENT_SHARE_SEVERE = 0.5;

/**
 * The last rule to move the verdict, so the headline can name the real cause.
 *
 * Without this the headline read "considered DANGEROUS in Sunny conditions" for a
 * plan graded dangerous purely on size — crediting the week for a call the week
 * did not make, directly above a sizing line that said otherwise.
 */
type VerdictDriver = "REGIME" | "RUNWAY" | "REVERSIBILITY" | "SIZE";

export const isBusinessModel = (
  value: string,
): value is NonNullable<CompanyFinancialProfile["businessModel"]> =>
  value === "VC_BACKED" || value === "BOOTSTRAPPED";

interface PlanStressTestRequest {
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
  /**
   * Whether the category came from something in the sentence or from the
   * fallback. Unmatched text still classifies as HIRE so every lookup keyed by
   * `DecisionAction` keeps working, and callers used to have no way to tell that
   * apart from a real match — "asdf qwerty" produced "Hire is considered SAFE"
   * with the same confidence as a described hiring plan. Surfaces must show this
   * and offer a correction.
   */
  detectionConfidence: "MATCHED" | "ASSUMED";
  /** What the sentence said about size. `annualUsd` is null when it said nothing. */
  commitment: ParsedCommitment;
  /** The commitment against available cash, when the caller supplied enough to divide by. */
  runwayShare: { share: number; cashUsd: number; cashBasis: string } | null;
  /** One line naming what sizing did to the verdict, or why it could not size the plan. */
  sizingNote: string;
  /** Which rule produced the verdict above. */
  verdictDriver: VerdictDriver;
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

type Detection = { category: DecisionCategory; action: DecisionAction; confidence: "MATCHED" | "ASSUMED" };

const detectCategoryAndAction = (text: string, categoryOverride?: DecisionCategory): Detection => {
  if (categoryOverride) {
    /* The caller said which kind of decision this is, so there is nothing to
       infer and nothing to be unsure about. */
    const matched = "MATCHED" as const;
    if (categoryOverride === "HIRING") return { category: "HIRING", action: "HIRE", confidence: matched };
    if (categoryOverride === "INFRASTRUCTURE") return { category: "INFRASTRUCTURE", action: "INFRA_SPEND", confidence: matched };
    if (categoryOverride === "PRICING") return { category: "PRICING", action: "DISCOUNT", confidence: matched };
    if (categoryOverride === "ROADMAP") return { category: "ROADMAP", action: "REWRITE", confidence: matched };
    if (categoryOverride === "M_AND_A") return { category: "M_AND_A", action: "ACQUIRE", confidence: matched };
    if (categoryOverride === "GEOGRAPHIC_EXPANSION") return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION", confidence: matched };
    return { category: "RESTRUCTURING", action: "RESTRUCTURE", confidence: matched };
  }

  const lower = text.toLowerCase();
  if (/\b(hire|hiring|headcount|recruiting|engineer|engineers|sdr|developer|team member)\b/.test(lower)) {
    return { category: "HIRING", action: "HIRE", confidence: "MATCHED" };
  }
  if (/\b(lease|office|rent|real estate|sq ft|square foot)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND", confidence: "MATCHED" };
  }
  if (/\b(cloud|aws|gpu|server|cluster|instances|infrastructure|database|hosting)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND", confidence: "MATCHED" };
  }
  if (/\b(discount|pricing|price|deal|contract discount|payment term)\b/.test(lower)) {
    return { category: "PRICING", action: "DISCOUNT", confidence: "MATCHED" };
  }
  if (/\b(acquire|acquisition|merger|m&a|buy company)\b/.test(lower)) {
    return { category: "M_AND_A", action: "ACQUIRE", confidence: "MATCHED" };
  }
  if (/\b(rewrite|refactor|architecture|rebuild|v2 migration)\b/.test(lower)) {
    return { category: "ROADMAP", action: "REWRITE", confidence: "MATCHED" };
  }
  if (/\b(expand|international|europe|asia|new market|geo)\b/.test(lower)) {
    return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION", confidence: "MATCHED" };
  }

  /* Nothing in the sentence named a decision type. Still HIRING, because every
     downstream table is keyed by `DecisionAction` and there is no "unknown"
     column — but flagged, so the surface can show what it assumed and let the
     reader correct it rather than quietly grading the wrong kind of decision. */
  return { category: "HIRING", action: "HIRE", confidence: "ASSUMED" };
};

/** Names the rule that decided, not the week, unless the week is what decided. */
const buildStressHeadline = ({
  actionLabel,
  verdict,
  verdictDriver,
  regimeLabel,
  runwayMonths,
}: {
  actionLabel: string;
  verdict: DecisionVerdict;
  verdictDriver: VerdictDriver;
  regimeLabel: string;
  runwayMonths?: number;
}): string => {
  if (verdictDriver === "SIZE") {
    return `${actionLabel} is ${verdict} at this size, not on ${regimeLabel} conditions alone.`;
  }
  if (verdictDriver === "RUNWAY") {
    return `${actionLabel} is ${verdict} on ${runwayMonths} months of runway in ${regimeLabel} conditions.`;
  }
  if (verdictDriver === "REVERSIBILITY") {
    return `${actionLabel} is ${verdict} because the plan is structured to be reversible.`;
  }
  return `${actionLabel} is considered ${verdict} in ${regimeLabel} conditions.`;
};

export const stressTestDecisionPlan = (
  assessment: RegimeAssessment,
  request: PlanStressTestRequest
): PlanStressTestResult => {
  const lifecycle = request.lifecycle ?? "GROWTH";
  const { category, action, confidence: detectionConfidence } = detectCategoryAndAction(request.planText, request.category);
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
  let verdictDriver: VerdictDriver = "REGIME";
  const fragileAssumptions: string[] = [];
  let financialImpactSummary: string | undefined = undefined;

  if (profile) {
    if (
      profile.runwayMonths !== undefined &&
      profile.runwayMonths < RUNWAY_CRITICAL_MONTHS &&
      (assessment.regime === "DEFENSIVE" || assessment.regime === "SCARCITY")
    ) {
      verdict = "DANGEROUS";
      verdictDriver = "RUNWAY";
      fragileAssumptions.push(
        `Critical runway constraint: With only ${profile.runwayMonths} months cash buffer, capital markets in ${regimeLabel} severely penalize refinancing.`
      );
      financialImpactSummary = `Runway of ${profile.runwayMonths} months is under the ${RUNWAY_CRITICAL_MONTHS}-month line this rule uses for ${regimeLabel} conditions.`;
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
    verdictDriver = "REVERSIBILITY";
  }

  /*
   * Size last, and deliberately after the reversibility upgrade above.
   *
   * That upgrade reads a keyword out of the operator's own sentence, so running
   * it after this would let the word "reversible" talk a commitment worth half
   * the company's cash back down to SAFE. Structure can soften a posture call;
   * it cannot shrink a number. Ordering is the whole guarantee here, so leave it.
   */
  const commitment = parsePlanCommitment(request.planText);
  const runwayShare = computeRunwayShare({
    annualUsd: commitment.annualUsd,
    cashBalanceUsd: profile?.cashBalanceUsd,
    monthlyBurnUsd: profile?.monthlyBurnUsd,
    runwayMonths: profile?.runwayMonths,
  });

  let sizingNote: string;
  if (runwayShare) {
    const pct = Math.round(runwayShare.share * 100);
    const spend = formatCommitmentUsd(commitment.annualUsd!);
    if (runwayShare.share >= COMMITMENT_SHARE_SEVERE) {
      verdict = "DANGEROUS";
      verdictDriver = "SIZE";
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis} — at or over the ${Math.round(COMMITMENT_SHARE_SEVERE * 100)}% line, so this is graded dangerous on size alone.`;
      fragileAssumptions.push(
        `Assumes the raise or revenue that refills ${pct}% of available cash arrives before this commitment ends.`
      );
    } else if (runwayShare.share >= COMMITMENT_SHARE_ELEVATED) {
      verdict = adjustVerdict(verdict, "up");
      verdictDriver = "SIZE";
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis} — over the ${Math.round(COMMITMENT_SHARE_ELEVATED * 100)}% line, so the call is one step harsher than the regime alone would give.`;
    } else {
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis}, under the ${Math.round(COMMITMENT_SHARE_ELEVATED * 100)}% line that would move the call.`;
    }
  } else if (commitment.annualUsd !== null) {
    sizingNote = `Read ${formatCommitmentUsd(commitment.annualUsd)} for the first year, but sizing it needs your cash or monthly burn — without one the verdict is the regime's alone.`;
  } else {
    sizingNote = "No amount in the plan, so this is graded on posture only. Add a figure to size it against your cash.";
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
    headline: buildStressHeadline({
      actionLabel: formatDecisionAction(action),
      verdict,
      verdictDriver,
      regimeLabel,
      runwayMonths: profile?.runwayMonths,
    }),
    detectedCategory: category,
    detectedAction: action,
    detectionConfidence,
    commitment,
    runwayShare,
    sizingNote,
    verdictDriver,
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
