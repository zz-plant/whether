/**
 * Decision Shield logic for translating capital postures into operator-safe verdicts.
 * Produces shareable, plain-English guidance tied to sensor conditions.
 */
import type { RegimeAssessment } from "./regimeEngine";
import { REGIME_REVERSAL_DAYS } from "./regimeEngine";
import { BASE_RATE_SOURCE_LABELS } from "./report/regimeDescription";
import { REGIME_LABELS } from "./regimePresentation";
import { formatSignalReading } from "./report/signalTranslations";
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
import { netMonthlyBurnUsd, resolveProfileRunwayMonths, type OperatorProfile } from "./operatorProfile";

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
  SAFE: "a safe move",
  RISKY: "a risky move",
  DANGEROUS: "a dangerous move",
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
  /* The plain name leads and the instrument follows as its source, the order
     every reader surface uses: the name says what the number does, the source
     says where it was read. */
  const rateLabel = `The short-term borrowing rate (${BASE_RATE_SOURCE_LABELS[baseRateUsed].replace(/^The /, "the ")})`;
  bullets.push(
    baseRate > baseRateTightness
      ? `${rateLabel} is ${baseRate.toFixed(2)}%, above the ${baseRateTightness}% line where capital gets expensive.`
      : `${rateLabel} is ${baseRate.toFixed(2)}%, below the ${baseRateTightness}% line, so the cost of capital is manageable.`
  );

  if (curveSlope === null) {
    bullets.push("The recession warning gauge is unavailable this week, so inversion risk is unconfirmed.");
  } else if (curveSlope < 0) {
    bullets.push(
      `The recession warning gauge (10-year minus 2-year rate) is ${curveSlope.toFixed(2)}%: long-term rates are below short-term rates. That has historically come before recessions.`
    );
  } else {
    bullets.push(
      `The recession warning gauge (10-year minus 2-year rate) is +${curveSlope.toFixed(2)}%: long-term rates are above short-term rates. That leaves room for risk-taking.`
    );
  }

  /* Each score with its scale and meaning, not "funding pressure at 72": these
     bullets are copied verbatim into the share text, where no chart sits beside
     the number to say which end of 0-100 is bad. */
  bullets.push(
    `${formatSignalReading("tightness", tightness)}. ${formatSignalReading("riskAppetite", riskAppetite)}. Together they put conditions at ${REGIME_LABELS[assessment.regime]}.`
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
    summary: `On this week's signals, ${actionLabel.toLowerCase()} is ${VERDICT_COPY[verdict]} for a ${LIFECYCLE_COPY[input.lifecycle]} company in ${REGIME_LABELS[assessment.regime]} conditions.`,
    bullets,
    guardrail: DECISION_GUARDRAILS[input.action],
    reversalTrigger: buildReversalTrigger(assessment),
  };
};

export interface CompanyFinancialProfile {
  runwayMonths?: number;
  cashBalanceUsd?: number;
  /** Net monthly cash burn. With `runwayMonths` this stands in for a cash
   *  balance, which is the figure a founder is likelier to know from memory.
   *  Zero or below when revenue covers spending, which sizes nothing. */
  monthlyBurnUsd?: number;
  /** The revenue net burn is spend less of, named beside it in the sizing line. */
  monthlyRevenueUsd?: number;
  businessModel?: "VC_BACKED" | "BOOTSTRAPPED";
  grossMarginPct?: number;
}

/**
 * The stress test's reading of the operator's own figures: the cash balance
 * when one was entered (it always took one; nothing passed it), else net burn
 * × runway. Net, not spend — `monthlyBurnUsd` on the profile is spend, and
 * multiplying it by runway overstated the balance whenever revenue was coming
 * in. Revenue travels with it so the sizing line can show the subtraction (the
 * stress test's form has no revenue box), and a net burn at or below zero is
 * passed as it is, so the test can say revenue covers spending rather than ask
 * for figures already entered.
 */
export const companyFinancialProfileFor = (
  profile: OperatorProfile,
  businessModel: CompanyFinancialProfile["businessModel"],
): CompanyFinancialProfile => ({
  runwayMonths: resolveProfileRunwayMonths(profile),
  cashBalanceUsd: profile.cashUsd,
  monthlyBurnUsd: netMonthlyBurnUsd(profile),
  monthlyRevenueUsd: profile.monthlyRevenueUsd,
  grossMarginPct: profile.grossMarginPct,
  businessModel,
});

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

/** A plan the test could read as one of the decisions it has rules for. */
export interface GradedPlan {
  verdict: DecisionVerdict;
  headline: string;
  detectedCategory: DecisionCategory;
  detectedAction: DecisionAction;
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

/**
 * A plan the test has no rules for, and says so.
 *
 * Unmatched text used to classify as HIRE, because every table here is keyed by
 * `DecisionAction`: "Raise prices from $9 to $19" and "Take a $50k angel check"
 * came back "Hire is considered DANGEROUS", the second with $50k of incoming
 * money read as a first-year cost. A flag on the result said the category was
 * assumed, and no surface read it. No verdict is the honest answer to a decision
 * the matrix has no row for.
 */
interface UngradedPlan {
  verdict: null;
  headline: string;
  /** What to do instead: the decisions the test can grade. */
  nextStep: string;
  /** Words `matchDecisionPage` resolves to the answer that does cover this, when the plan named a topic. */
  answerTopic: string | null;
}

export type PlanStressTestResult = GradedPlan | UngradedPlan;

export interface PlanComparisonResult {
  planA: PlanStressTestResult;
  planB: PlanStressTestResult;
  /** Null when either plan could not be graded, so there is nothing to prefer. */
  preferredPlan: "A" | "B" | "TIE" | null;
  comparativeRecommendation: string;
}

type Detection = { category: DecisionCategory; action: DecisionAction } | { ungraded: Omit<UngradedPlan, "verdict"> };

const GRADABLE_DECISIONS =
  "It grades hiring, infrastructure, vendor deals and discounts, rewrites, acquisitions and geographic expansion.";

/* Checked before the hiring words, so "Raise a $2M seed to hire engineers" is not
   a hire whose first-year cost is $2M. Only the money's direction matters here. */
const RAISING_MONEY =
  /\b(?:raise|raising)\s+(?:an?\s+|our\s+|the\s+|some\s+)?(?:\$|\d|seed|pre-seed|series|bridge|round|capital|money|funding|venture)|\b(?:angel\s+(?:check|cheque|round|investor|investment)|seed\s+round|bridge\s+round|series\s+[a-d]\b|convertible\s+note|venture\s+debt|fundraise)\b/;

/* Before the pricing words, which grade a discount: a price rise is the opposite
   move, and "Discount is RISKY" answered "raise my price" with the wrong decision. */
const RAISING_PRICE =
  /\b(?:raise|raising|increase|increasing|hike|hiking|double|doubling)\s+(?:\S+\s+){0,3}?(?:price|prices|pricing)\b|\bpric(?:e|ing)\s+(?:increase|rise|hike)\b|\bcharge\s+more\b/;

/* "buy company" was the only spelling, so "buy a smaller competitor" was not an acquisition. */
const BUYING_A_COMPANY =
  /\b(?:buy|buying)\s+(?:(?:a|an|the|our|one|another)\s+)?(?:\S+\s+){0,2}?(?:competitor|rival|startup|(?:company|business)(?!\s+(?:car|cars|card|cards|class|laptop|laptops|phone|phones|insurance)\b))\b/;

const VENTURE_DEBT = /\bventure\s+(?:debt|loan)\b/;

/* A tender offer is also how a buyer acquires a company, which spends cash the test has a row for. */
const TENDER_OFFER_FOR_A_COMPANY = /\btender\s+offer\b.*\b(?:competitor|rival|startup)\b|\b(?:competitor|rival|startup)\b.*\btender\s+offer\b/;

const readsAsAcquisition = (lower: string) =>
  /\b(acquire|acquiring|acquisition|merger|m&a)\b/.test(lower) || BUYING_A_COMPANY.test(lower) || TENDER_OFFER_FOR_A_COMPANY.test(lower);

/* Shares changing hands between holders, not money the company spends or raises. */
const SECONDARY_SALE = /\b(?:secondary\s+(?:sale|sales|offering|transaction)|tender\s+offer)\b/;

const detectCategoryAndAction = (text: string, categoryOverride?: DecisionCategory): Detection => {
  if (categoryOverride) {
    /* The caller said which kind of decision this is, so there is nothing to infer. */
    if (categoryOverride === "HIRING") return { category: "HIRING", action: "HIRE" };
    if (categoryOverride === "INFRASTRUCTURE") return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
    if (categoryOverride === "PRICING") return { category: "PRICING", action: "DISCOUNT" };
    if (categoryOverride === "ROADMAP") return { category: "ROADMAP", action: "REWRITE" };
    if (categoryOverride === "M_AND_A") return { category: "M_AND_A", action: "ACQUIRE" };
    if (categoryOverride === "GEOGRAPHIC_EXPANSION") return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION" };
    return { category: "RESTRUCTURING", action: "RESTRUCTURE" };
  }

  const lower = text.toLowerCase();
  if (VENTURE_DEBT.test(lower)) {
    return {
      ungraded: {
        headline: "Not graded: this brings money in, and the stress test grades commitments that spend it.",
        nextStep: `${GRADABLE_DECISIONS} The answer on venture debt covers this one.`,
        answerTopic: "should-startups-take-venture-debt-now",
      },
    };
  }
  if (SECONDARY_SALE.test(lower) && !readsAsAcquisition(lower)) {
    return {
      ungraded: {
        headline: "Not graded: this sells existing shares, and the stress test grades commitments that spend the company's cash.",
        nextStep: `${GRADABLE_DECISIONS} The answer on compensation is the nearest to this one.`,
        answerTopic: "should-startups-change-compensation-now",
      },
    };
  }
  if (RAISING_MONEY.test(lower)) {
    return {
      ungraded: {
        headline: "Not graded: this brings money in, and the stress test grades commitments that spend it.",
        nextStep: `${GRADABLE_DECISIONS} The answer on raising capital covers this one.`,
        answerTopic: "should-startups-raise-capital-now",
      },
    };
  }
  /* No bare "lead", "principal" or "architect": each is a role only beside a
     hiring verb, and that verb already matches here ("Hire 1 principal
     architect"). Alone they claimed "sales lead time" and "loan principal" as
     hires before the pricing or roadmap checks below could run. "recruit"
     joins the bare list; "add" and "open" are hiring only with a number
     ("add 3 engineers", "open 2 roles"), matching the parse layer's
     HEADCOUNT_AFTER_VERB, so "open a London office" still reads as an office. */
  if (
    /\b(hire|hires|hired|hiring|headcount|recruit|recruiting|poach|engineer|engineers|sdr|developer|contractor|contractors|freelancer|consultant|team member)\b/.test(lower)
    || /\b(?:add|adding|open)\s+\d{1,4}\b/.test(lower)
    || /\b\d{1,4}\s+(?:new\s+)?(?:roles?|people)\b/.test(lower)
  ) {
    return { category: "HIRING", action: "HIRE" };
  }
  if (/\b(lease|office|rent|real estate|sq ft|square foot)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
  }
  if (/\b(cloud|aws|gpus?|server|cluster|instances|infrastructure|database|hosting)\b/.test(lower)) {
    return { category: "INFRASTRUCTURE", action: "INFRA_SPEND" };
  }
  if (RAISING_PRICE.test(lower)) {
    return {
      ungraded: {
        headline: "Not graded: this raises a price, and the stress test grades discounts, the opposite move.",
        nextStep: `${GRADABLE_DECISIONS} The answer on raising prices covers this one.`,
        answerTopic: "should-startups-raise-prices-now",
      },
    };
  }
  if (/\b(discount|discounts|pricing|price|prices|deal|contract discount|payment term|prepay|vendor|annual commit|usage flex|usage-based|annual contracts?)\b/.test(lower)) {
    return { category: "PRICING", action: "DISCOUNT" };
  }
  if (readsAsAcquisition(lower)) {
    return { category: "M_AND_A", action: "ACQUIRE" };
  }
  if (/\b(rewrite|refactor|architecture|rebuild|v2 migration|tech debt)\b/.test(lower)) {
    return { category: "ROADMAP", action: "REWRITE" };
  }
  if (/\b(expand|international|europe|asia|new market|geo)\b/.test(lower)) {
    return { category: "GEOGRAPHIC_EXPANSION", action: "REGIONAL_EXPANSION" };
  }

  return {
    ungraded: {
      headline: "Not graded: this doesn't name a decision the stress test has rules for.",
      nextStep: `${GRADABLE_DECISIONS} Name one of those in the plan, or read this week's guidance for the area it touches.`,
      answerTopic: null,
    },
  };
};

/**
 * Where a piece of text would go without grading it: a decision the test has rules for, or the
 * answer that covers it, or neither. For a caller holding a question no answer page matched, which
 * has no reading loaded and should not need one to say where to look next.
 */
export const routePlanText = (
  text: string,
): { gradable: true; category: DecisionCategory } | { gradable: false; answerTopic: string | null } => {
  const detection = detectCategoryAndAction(text);
  return "ungraded" in detection
    ? { gradable: false, answerTopic: detection.ungraded.answerTopic }
    : { gradable: true, category: detection.category };
};

/* The pricing row is keyed DISCOUNT, and it also grades vendor deals and annual contracts. A headline
   calling those a discount answered a plan that never offered one. */
const headlineActionLabel = (action: DecisionAction, text: string) => {
  const lower = text.toLowerCase();
  if (action !== "DISCOUNT" || /\bdiscounts?\b/.test(lower)) return formatDecisionAction(action);
  if (/\bannual\s+contracts?\b/.test(lower)) return "Annual contract";
  return /\bpric(?:e|es|ing)\b/.test(lower) ? "This pricing change" : "This deal";
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
  const detection = detectCategoryAndAction(request.planText, request.category);
  if ("ungraded" in detection) return { verdict: null, ...detection.ungraded };
  const { category, action } = detection;
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
        profile.businessModel === "BOOTSTRAPPED"
          ? `With under ${RUNWAY_CRITICAL_MONTHS} months of cash reserve, navigating ${regimeLabel} conditions leaves little room for operating losses.`
          : `With under ${RUNWAY_CRITICAL_MONTHS} months of cash, raising in ${regimeLabel} conditions is hard.`
      );
      financialImpactSummary = `Runway of ${profile.runwayMonths} months is under the ${RUNWAY_CRITICAL_MONTHS}-month line this rule uses for ${regimeLabel} conditions.`;
    } else if (profile.businessModel === "BOOTSTRAPPED" && profile.grossMarginPct && profile.grossMarginPct >= 70) {
      if (verdict === "RISKY") {
        verdict = "SAFE";
      }
      financialImpactSummary = `Bootstrapped with ${profile.grossMarginPct}% gross margin, so tighter funding matters less.`;
    } else if (profile.runwayMonths !== undefined) {
      financialImpactSummary = `Runway of ${profile.runwayMonths} months, read against ${regimeLabel} conditions.`;
    }
  }

  const isExplicitlyReversible = /\b(contract-to-hire|contract to hire|milestone|(?:monthly|flexible) rolling|month-to-month|on-demand|convertible|short-term|reversible)\b/i.test(request.planText);
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
    monthlyRevenueUsd: profile?.monthlyRevenueUsd,
    runwayMonths: profile?.runwayMonths,
  });
  /* Revenue covers spending: runway × net burn is no balance at all, so only a
     cash figure sizes the plan. This read "sizing it needs your cash or monthly
     burn" with runway and spend both filled in. */
  const revenueCoversSpend = typeof profile?.monthlyBurnUsd === "number" && profile.monthlyBurnUsd <= 0;

  let sizingNote: string;
  if (runwayShare) {
    const pct = Math.round(runwayShare.share * 100);
    const spend = formatCommitmentUsd(commitment.annualUsd!);
    if (runwayShare.share >= COMMITMENT_SHARE_SEVERE) {
      verdict = "DANGEROUS";
      verdictDriver = "SIZE";
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis} — at or over the ${Math.round(COMMITMENT_SHARE_SEVERE * 100)}% line, so this is graded dangerous on size alone.`;
      fragileAssumptions.push(
        profile?.businessModel === "BOOTSTRAPPED"
          ? `Assumes customer revenue that refills ${pct}% of available cash arrives before this commitment ends.`
          : `Assumes the raise or revenue that refills ${pct}% of available cash arrives before this commitment ends.`
      );
    } else if (runwayShare.share >= COMMITMENT_SHARE_ELEVATED) {
      verdict = adjustVerdict(verdict, "up");
      verdictDriver = "SIZE";
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis} — over the ${Math.round(COMMITMENT_SHARE_ELEVATED * 100)}% line, so the verdict is one step harsher than conditions alone would give.`;
    } else {
      sizingNote = `${spend} in the first year is ${pct}% of ${runwayShare.cashBasis}, under the ${Math.round(COMMITMENT_SHARE_ELEVATED * 100)}% line that would move the verdict.`;
    }
  } else if (commitment.annualUsd !== null && revenueCoversSpend) {
    sizingNote = `Read ${formatCommitmentUsd(commitment.annualUsd)} for the first year. Revenue covers your spending, so there is no burn to size it against: sizing it needs your cash in the bank, and without it the verdict rests on conditions alone.`;
  } else if (commitment.annualUsd !== null) {
    sizingNote = `Read ${formatCommitmentUsd(commitment.annualUsd)} for the first year, but sizing it needs your cash, or your runway and monthly spend — without them the verdict rests on conditions alone.`;
  } else {
    sizingNote = "No amount in the plan, so this is graded on conditions only. Add a figure to size it against your cash.";
  }

  if (tightness > 60 && profile?.businessModel !== "BOOTSTRAPPED") {
    fragileAssumptions.push(
      `Assumes capital and debt refinancing remain cheap while funding pressure is elevated (${tightness}/100).`
    );
  }
  if (curveSlope !== null && curveSlope < 0) {
    fragileAssumptions.push(
      `Assumes customers keep buying at the same pace with the yield curve inverted (${curveSlope.toFixed(2)}%). Past inversions have stretched sales cycles.`
    );
  }
  if (riskAppetite < 50 && profile?.businessModel !== "BOOTSTRAPPED") {
    fragileAssumptions.push(
      `Assumes investors will fund fast burn while risk appetite is low (${riskAppetite}/100).`
    );
  } else if (profile?.businessModel === "BOOTSTRAPPED" && profile.grossMarginPct !== undefined && profile.grossMarginPct < 50) {
    fragileAssumptions.push(
      `Gross margin (${profile.grossMarginPct}%) provides limited buffer if customer demand slows.`
    );
  }
  if (fragileAssumptions.length === 0) {
    /* Only a bootstrapped profile reaches this with funding tight: the two
       funding warnings above skip it, because it is not raising. Calling
       funding loose there contradicted the scores on the same screen. */
    const fundingLoose = tightness <= 60 && riskAppetite >= 50;
    fragileAssumptions.push(
      fundingLoose
        ? `Funding is loose now; watch for the short-term borrowing rate moving above ${baseRate.toFixed(2)}%.`
        : "Assumes customer revenue keeps paying for this: funding is tight now, so a shortfall would be costly to raise."
    );
  }

  let reversibleAlternative = "";
  if (category === "HIRING") {
    reversibleAlternative =
      "Hire for new roles on 6-month contract-to-hire terms that convert at a milestone. When hiring several, keep permanent offers to half the plan.";
  } else if (category === "INFRASTRUCTURE") {
    reversibleAlternative =
      "Avoid multi-year upfront reservations; use 6-to-12 month convertible commitments or monthly rolling tiers to preserve liquidity.";
  } else if (category === "PRICING") {
    reversibleAlternative =
      "Give a discount only for the full year paid upfront, so it brings in cash you don't have to raise.";
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
      actionLabel: headlineActionLabel(action, request.planText),
      verdict,
      verdictDriver,
      regimeLabel,
      runwayMonths: profile?.runwayMonths,
    }),
    detectedCategory: category,
    detectedAction: action,
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

  if (planA.verdict === null || planB.verdict === null) {
    const ungraded = planA.verdict !== null ? "Plan B could not" : planB.verdict !== null ? "Plan A could not" : "Neither plan could";
    return {
      planA,
      planB,
      preferredPlan: null,
      comparativeRecommendation: `${ungraded} be graded, so there is nothing to compare yet.`,
    };
  }

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
    comparativeRecommendation = `Plan A (${planA.verdict}) holds up better than Plan B (${planB.verdict}) in ${REGIME_LABELS[assessment.regime]} conditions.`;
  } else if (scoreB > scoreA) {
    preferredPlan = "B";
    comparativeRecommendation = `Plan B (${planB.verdict}) is structurally safer than Plan A (${planA.verdict}) by preserving higher reversibility.`;
  } else {
    preferredPlan = "TIE";
    comparativeRecommendation = `Both plans grade ${planA.verdict}. Prefer the one with the shorter commitment.`;
  }

  return {
    planA,
    planB,
    preferredPlan,
    comparativeRecommendation,
  };
};
