/**
 * Loop stage owner: signal → posture (the words the engine's verdict is stored in).
 *
 * The engine scores and decides; this module writes every sentence a
 * `RegimeAssessment` carries. `scoreRegime` returns codes (the regime key, which
 * corroborating reads moved a score, which data warnings apply, why the machine
 * held or flipped, why the posture refused to move), and
 * `describeRegimeAssessment` turns them into the assessment every surface and
 * every stored snapshot already reads, string for string.
 *
 * Kept apart from scoring for one reason: these strings are stored. The month
 * walk keeps `description` as each entry's summary and the archive generators
 * write them into `data/`, so a wording edit here rewrites archived text on the
 * next regeneration. That is a copy change and should look like one in review,
 * not like a commit to a scoring file.
 */
import {
  BASE_RATE_VELOCITY_LOOKBACK_DAYS,
  BASE_RATE_VELOCITY_POINTS,
  BASE_RATE_VELOCITY_THRESHOLD,
  RISK_APPETITE_MAX_SLOPE,
  RISK_APPETITE_MIN_SLOPE,
  TIGHTNESS_BASE_RATE_POINTS,
  TIGHTNESS_CAP,
  TIGHTNESS_INVERSION_POINTS,
  TREASURY_SOURCE_LABEL,
  type PolicyAssessment,
  type RegimeAssessment,
  type RegimeKey,
  type RegimeScores,
  type RegimeSignalInfluence,
  type RegimeThresholds,
} from "../regimeEngineCore";
import type { MacroContributorCode } from "../regimeEngineDiagnostics";
import type { PolicyRefusalCode, PolicyScoring } from "../regimeEnginePolicy";
import type { RegimeScoring, RegimeWarning } from "../regimeEngineScoring";
import type {
  RegimeLineCrossing,
  RegimeMachineStep,
  RegimeStateTransition,
  RegimeTransitionCause,
} from "../regimeStateMachine";
import type { TreasuryData } from "../types";
import { regimeSignalLabel } from "./signalTranslations";

const REGIME_PROFILES: Record<RegimeKey, { description: string; constraints: string[] }> = {
  SCARCITY: {
    description: "Capital is expensive and lenders are pulling back. Prioritize survival over growth.",
    constraints: [
      "Shorten payback windows and preserve cash.",
      "Delay speculative hiring or large platform rewrites.",
      "Route roadmap bets through revenue certainty.",
    ],
  },
  DEFENSIVE: {
    description: "Capital is expensive but funding stays selective. Operate for efficiency.",
    constraints: [
      "Focus on margin expansion and retention.",
      "Cut low-leverage experiments.",
      "Convert demand with tighter sales cycles.",
    ],
  },
  VOLATILE: {
    description: "Capital is cheaper but funding is wary. Build trust and resilience.",
    constraints: [
      "Ship reliability and security before novelty.",
      "Avoid disruptive pivots that spook buyers.",
      "Lean into proof, references, and guarantees.",
    ],
  },
  EXPANSION: {
    description: "Capital is available and financing conditions are supportive. The weekly guidance sets the tempo inside that window.",
    constraints: [
      "Prioritize reach and learning velocity over perfect finish.",
      "Spend with clear guardrails, even if some experiments fail.",
      "Scale capacity ahead of demand only where leading signals stay strong.",
    ],
  },
};

export const getRegimeProfile = (regime: RegimeKey) => REGIME_PROFILES[regime];

const buildTightnessExplanation = (thresholds: RegimeThresholds) =>
  `Tightness score blends up to three components capped at ${TIGHTNESS_CAP}: ` +
  `base rate points ramp from 0 to ${TIGHTNESS_BASE_RATE_POINTS} when rates move above ${thresholds.baseRateTightness}%, ` +
  `inversion points ramp from 0 to ${TIGHTNESS_INVERSION_POINTS} when slope moves below 0%, ` +
  `and tightening-speed points ramp from 0 to ${BASE_RATE_VELOCITY_POINTS} when the trailing ${BASE_RATE_VELOCITY_LOOKBACK_DAYS}-day ` +
  `base-rate move exceeds ${BASE_RATE_VELOCITY_THRESHOLD} points (the term needs base-rate history; without it it is 0).`;

/**
 * What the risk-appetite axis actually measures, in the reader's words.
 *
 * The score is a *financing-conditions* proxy: it maps the 10Y-2Y slope onto a
 * 0-100 scale. The slope moves when the market reprices expected monetary policy,
 * so the score rises when the central bank eases — March 2020's emergency cuts
 * steepened the curve and lifted the score during the fastest crash on record.
 * Calling that "risk appetite is healthy" published a claim about market
 * psychology that this reading cannot see; observed risk appetite (volatility,
 * credit stress) enters through the separate macro adjustments, which haircut
 * this score but never the other way around. The axis name stays — it is the
 * published vocabulary — but the explanation now says what drives it.
 */
const RISK_APPETITE_EXPLANATION =
  `Risk-appetite score is a financing-conditions proxy: it maps the 10Y-2Y slope from ` +
  `${RISK_APPETITE_MIN_SLOPE}% (capital pulling back) to ${RISK_APPETITE_MAX_SLOPE}% (capital leaning in), scaled to 0-100. ` +
  `The slope is a monetary-expectations read, not observed market appetite — ` +
  `volatility and credit stress enter through separate adjustments.`;

/**
 * What the base rate reading actually is, in the reader's words.
 *
 * `getBaseRate` falls through to the one-month bill on every render — nothing
 * populates `fedFunds` (see `TREASURY_SOURCE_LABEL` in the engine core and the
 * note in `treasury/treasuryClient.ts`). Surfaces used to call the result "the
 * Fed rate" regardless, which put a claim about the policy rate into verdicts
 * and into the text operators paste into threads. Name the series that was
 * read; wiring DFF is a change to the published call and is not this label's job.
 */
export const BASE_RATE_SOURCE_LABELS: Record<RegimeScores["baseRateUsed"], string> = {
  FED: "The federal funds rate",
  "1M": "The 1-month Treasury bill",
  "3M": "The 3-month Treasury bill",
  MISSING: "The short-rate anchor",
};

export const buildRegimeInputs = (
  treasury: TreasuryData,
  baseRate: { value: number; used: RegimeScores["baseRateUsed"] },
  curveSlope: number | null,
): RegimeAssessment["inputs"] => {
  // "Policy base rate (1M)" named a policy rate and then admitted in parentheses
  // that it had read a bill. The label now says which series it is.
  const baseRateLabel =
    baseRate.used === "MISSING"
      ? "Short-rate anchor (missing)"
      : `${BASE_RATE_SOURCE_LABELS[baseRate.used]} (${baseRate.used})`;
  const baseRateNotes =
    baseRate.used === "MISSING"
      ? "No 1M or 3M Treasury rate available; defaulted to 0% for scoring."
      : "Used as the cost-of-money anchor for tightness scoring.";
  const sourceUrl = treasury.source;

  return [
    {
      id: "base-rate",
      label: baseRateLabel,
      value: baseRate.used === "MISSING" ? null : baseRate.value,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
      notes: baseRateNotes,
    },
    {
      id: "two-year",
      label: "US Treasury 2Y",
      value: treasury.yields.twoYear ?? null,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
    },
    {
      id: "ten-year",
      label: "US Treasury 10Y",
      value: treasury.yields.tenYear ?? null,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
    },
    {
      id: "curve-slope",
      label: "Yield curve slope (10Y - 2Y)",
      value: curveSlope,
      unit: "%",
      sourceLabel: TREASURY_SOURCE_LABEL,
      sourceUrl,
      recordDate: treasury.record_date,
      fetchedAt: treasury.fetched_at,
      derivedFrom: "US Treasury 10Y and 2Y yields",
      notes: "Derived metric used to score risk appetite.",
    },
  ];
};

export const buildSignalInfluence = ({
  tightness,
  riskAppetite,
  baseRate,
  curveSlope,
  thresholds,
}: {
  tightness: number;
  riskAppetite: number;
  baseRate: number | null;
  curveSlope: number | null;
  thresholds: RegimeThresholds;
}): RegimeSignalInfluence[] => [
  {
    key: "tightness",
    label: regimeSignalLabel.tightness,
    influence: Math.abs(tightness - thresholds.tightnessRegime),
    unavailable: false,
  },
  {
    key: "riskAppetite",
    label: regimeSignalLabel.riskAppetite,
    influence: Math.abs(riskAppetite - thresholds.riskAppetiteRegime),
    unavailable: false,
  },
  {
    key: "baseRate",
    /**
     * Names the series actually read, matching `BASE_RATE_SOURCE_LABELS` above.
     * This used to say "Fed interest rate" while the reading fell through to the
     * one-month bill on every render.
     */
    label: "Short rate (1M bill)",
    influence:
      typeof baseRate === "number" ? Math.abs(baseRate - thresholds.baseRateTightness) : null,
    unavailable: typeof baseRate !== "number",
  },
  {
    key: "curveSlope",
    label: "Recession warning gauge",
    influence: typeof curveSlope === "number" ? Math.abs(curveSlope) : null,
    unavailable: typeof curveSlope !== "number",
  },
];

const MACRO_CONTRIBUTOR_COPY: Record<MacroContributorCode, string> = {
  "high-yield-stress": "High-yield bond market stress",
  "financial-conditions-tightening": "Financial conditions are tightening",
  "equity-volatility": "Stock market volatility is high",
  "market-stress-veto": "Market stress veto — posture cannot read better than transitional",
  "market-stress-unwind": "Market stress unwinding — expansion tempo capped",
  "vc-funding-slowdown": "VC funding slowdown",
  "tech-layoff-pressure": "Tech layoff pressure",
};

const describeRegimeWarning = (warning: RegimeWarning): string => {
  switch (warning.code) {
    case "base-rate-missing":
      return "Base rate missing; defaulted to threshold for conservative scoring.";
    case "curve-slope-missing":
      return "Curve slope missing; defaulted to cautious floor for scoring.";
    case "tightening-speed":
      return `Tightening-speed term active: the base rate moved ${warning.delta.toFixed(2)}% over its trailing window, contributing ${warning.points} tightness points.`;
    case "market-stress-veto":
      return "Market stress veto is capping the risk-appetite score: realized volatility, not the curve, is setting the ceiling.";
    case "shock-crossing":
      return "Shock crossing: the published reversal condition did not fire, so this flip is unconfirmed until the next read.";
  }
};

const POLICY_REFUSAL_COPY: Record<PolicyRefusalCode, string> = {
  "signals-disagree": "The underlying signals disagree too sharply to move the posture.",
  "signals-dispersed": "Signals have swung too hard over the past 30 days to trust a posture change.",
  "inputs-missing": "Too many inputs are missing to support a posture change.",
};

const describePolicyAssessment = (policy: PolicyScoring): PolicyAssessment => {
  const { reasonCodes, refused, fallbackMessage, executionMode } = policy.refusal;
  const reasons = reasonCodes.map((code) => POLICY_REFUSAL_COPY[code]);
  return {
    ...policy,
    refusal: refused ? { refused, reasons, fallbackMessage, executionMode } : { refused, reasons },
  };
};

const describeLineCrossing = ({ axis, direction, threshold }: RegimeLineCrossing) =>
  `${regimeSignalLabel[axis]} crossed ${direction} ${threshold}`;

const describeTransitionReason = (cause: RegimeTransitionCause): string => {
  if (cause.outcome === "held") {
    return "No threshold crossing changed the committed state.";
  }
  const crossing = cause.crossings.length > 0
    ? `${cause.crossings.map(describeLineCrossing).join("; ")}.`
    : "Evidence moved into a different regime quadrant.";
  if (cause.outcome === "pending") {
    return `${crossing} Transition pending confidence gate (${cause.pendingCount}/${cause.confirmationGate}).`;
  }
  return cause.shock
    ? `${crossing} Committed as a shock crossing — the one-step move bypassed the near-band, so no published reversal condition fired.`
    : `${crossing} Transition committed.`;
};

/**
 * The machine's step as stored: the same fields in the same order, with the
 * cause written out. Only a committed step carries `shock` (set or undefined),
 * exactly as the machine wrote it before it emitted codes.
 */
const describeRegimeTransition = ({ cause, ...step }: RegimeMachineStep): RegimeStateTransition => {
  const transitionReason = describeTransitionReason(cause);
  const { nextState, candidateState, committed, pending, transitionPendingCount, snapshot } = step;
  return cause.outcome === "committed"
    ? { nextState, candidateState, committed, pending, transitionReason, transitionPendingCount, shock: step.shock, snapshot }
    : { nextState, candidateState, committed, pending, transitionReason, transitionPendingCount, snapshot };
};

/**
 * The assessment every surface reads, written from what the engine scored. The
 * field order is the stored order: an operating snapshot is JSON, and a
 * re-read snapshot must equal the one that was written.
 */
export const describeRegimeAssessment = (
  treasury: TreasuryData,
  scoring: RegimeScoring,
): RegimeAssessment => {
  const { regime, scores, thresholds, diagnostics } = scoring;
  const profile = getRegimeProfile(regime);
  return {
    regime,
    regimeTransition: describeRegimeTransition(scoring.transition),
    scores,
    diagnostics: {
      ...diagnostics,
      boundaryContributors: diagnostics.boundaryContributors.map((code) => MACRO_CONTRIBUTOR_COPY[code]),
    },
    description: profile.description,
    constraints: profile.constraints,
    tightnessExplanation: buildTightnessExplanation(thresholds),
    riskAppetiteExplanation: RISK_APPETITE_EXPLANATION,
    dataWarnings: scoring.warnings.map(describeRegimeWarning),
    thresholds,
    inputs: buildRegimeInputs(treasury, { value: scores.baseRate, used: scores.baseRateUsed }, scores.curveSlope),
    policyAssessment: describePolicyAssessment(scoring.policy),
    signalInfluence: buildSignalInfluence({
      tightness: scores.tightness,
      riskAppetite: scores.riskAppetite,
      baseRate: scores.baseRateUsed === "MISSING" ? null : scores.baseRate,
      curveSlope: scores.curveSlope,
      thresholds,
    }),
  };
};
