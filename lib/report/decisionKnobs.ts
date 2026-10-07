import type { RegimeKey } from "../regimeEngine";
import { buildRuleCondition, type RuleCondition } from "./boundedDecisionRules";
import { REGIME_LABELS } from "../regimePresentation";
import type { RegimeStateTransition } from "../regimeStateMachine";

/**
 * Loop stage owner: posture → decision.
 *
 * This module translates committed regime state into bounded operating knobs and
 * lock commitments. Knobs are now continuous (magnitude-aware) and respect
 * operator context (company stage + rate sensitivity) for personalization.
 */

export const businessAreaOrder = [
  "hiring-stance",
  "investment-pace",
  "sales-posture",
  "product-priorities",
  "risk-tolerance",
] as const;

export type BusinessAreaKey = (typeof businessAreaOrder)[number];

export const businessAreaLabel: Record<BusinessAreaKey, string> = {
  "hiring-stance": "Hiring",
  "investment-pace": "Investment pace",
  "sales-posture": "Fundraising",
  "product-priorities": "Product priorities",
  "risk-tolerance": "Risk tolerance",
};

/**
 * The role that owns each lever's line, for tables and artifacts where the
 * reader needs to route the decision, not just read it. Role nouns match the
 * sales-pack ICP (VP Product, VP Engineering, founder-CEO, Finance lead);
 * fundraising deliberately names the CEO + Finance pair, which the weekly lock
 * commitment already assigns as review owners.
 */
export const businessAreaOwner: Record<BusinessAreaKey, string> = {
  "hiring-stance": "VP Eng",
  "investment-pace": "CEO",
  "sales-posture": "CEO + Finance lead",
  "product-priorities": "VP Product",
  "risk-tolerance": "Finance lead",
};

type DecisionKnob = {
  key: "approvalVelocity" | "reversibility" | "payback" | "experimentTolerance";
  label: string;
  value: number;
  delta: number;
  levelLabels: [string, string, string, string];
  rationale: string;
};

const knobsByRegime: Record<RegimeKey, Record<DecisionKnob["key"], number>> = {
  SCARCITY: {
    approvalVelocity: 0,
    reversibility: 3,
    payback: 3,
    experimentTolerance: 0,
  },
  DEFENSIVE: {
    approvalVelocity: 1,
    reversibility: 2,
    payback: 2,
    experimentTolerance: 1,
  },
  VOLATILE: {
    approvalVelocity: 2,
    reversibility: 2,
    payback: 1,
    experimentTolerance: 2,
  },
  EXPANSION: {
    approvalVelocity: 3,
    reversibility: 1,
    payback: 0,
    experimentTolerance: 3,
  },
};

const knobLabels: Record<DecisionKnob["key"], string> = {
  approvalVelocity: "Approval velocity",
  reversibility: "Reversibility requirement",
  payback: "Payback strictness",
  experimentTolerance: "Experiment tolerance",
};

const knobLevelLabels: Record<DecisionKnob["key"], DecisionKnob["levelLabels"]> = {
  approvalVelocity: ["0 · Frozen", "1 · Slow", "2 · Normal", "3 · Fast"],
  reversibility: ["0 · Open", "1 · Cautious", "2 · Strict", "3 · Maximum strictness"],
  payback: ["0 · Open", "1 · Cautious", "2 · Strict", "3 · Maximum strictness"],
  experimentTolerance: ["0 · None", "1 · Limited", "2 · Moderate", "3 · High"],
};

const clampKnobValue = (value: number) => Math.min(3, Math.max(0, value));

const knobKeyOrder: DecisionKnob["key"][] = [
  "approvalVelocity",
  "reversibility",
  "payback",
  "experimentTolerance",
];

const regimeRank: Record<RegimeKey, number> = {
  SCARCITY: 0,
  DEFENSIVE: 1,
  VOLATILE: 2,
  EXPANSION: 3,
};

type DecisionKnobContext = {
  committedState: RegimeKey;
  transition: Pick<RegimeStateTransition, "pending" | "committed" | "candidateState" | "transitionReason">;
  nearestThresholdGap: number;
  weakSignalCount: number;
  /** Raw tightness score (0–100) for continuous interpolation */
  tightnessScore: number;
  /** Raw risk appetite score (0–100) for continuous interpolation */
  riskAppetiteScore: number;
};

type WeeklyLockCommitment = {
  flipConditions: string[];
  /**
   * The numeric lines behind each `flipConditions` entry, index-aligned. A
   * consumer that needs a distance reads these rather than the sentence.
   */
  flipLines: RuleCondition[][];
  ownerCadence: string;
  trustMarkers: string[];
};

type WeeklyLockCommitmentContext = {
  regime: RegimeKey;
  tightnessRegime: number;
  riskAppetiteRegime: number;
  confidenceDegraded: boolean;
  freshnessDegraded: boolean;
};

const describeSignalQuality = (weakSignalCount: number) => {
  if (weakSignalCount === 0) {
    return "Every input is reading clean.";
  }

  return weakSignalCount === 1
    ? "One input is still reading weak."
    : `${weakSignalCount} inputs are still reading weak.`;
};

const buildKnobRationale = (key: DecisionKnob["key"], context: DecisionKnobContext) => {
  const knob = knobLabels[key];
  const posture = REGIME_LABELS[context.committedState];
  const signalQuality = describeSignalQuality(context.weakSignalCount);

  if (context.transition.pending) {
    return `${context.transition.transitionReason} ${knob} holds at its ${posture} setting until that change commits. ${signalQuality}`;
  }

  if (context.transition.committed) {
    return `${context.transition.transitionReason} ${knob} now follows the ${posture} setting. ${signalQuality}`;
  }

  if (context.nearestThresholdGap <= 8) {
    return `${knob} stays constrained because conditions sit within ${context.nearestThresholdGap.toFixed(1)} points of a boundary. ${signalQuality}`;
  }

  return `${knob} matches the ${posture} setting with room to spare before the nearest boundary. ${signalQuality}`;
};

const getPendingBias = (key: DecisionKnob["key"], context: DecisionKnobContext) => {
  if (!context.transition.pending) {
    return 0;
  }

  const direction = regimeRank[context.transition.candidateState] - regimeRank[context.committedState];
  if (direction === 0) {
    return 0;
  }

  const conservativeBias = key === "reversibility" || key === "payback" ? 1 : -1;
  return direction < 0 ? conservativeBias : -conservativeBias;
};

/**
 * Continuous playbook: interpolate knob values based on score magnitudes,
 * not just hard regime boundaries. A tightness of 71 (barely SCARCITY) should
 * produce different knobs than tightness of 98 (deep SCARCITY).
 */
const getRegimeBoundary = (regime: RegimeKey): { tightness: number; riskAppetite: number } | null => {
  // Return the "ideal center" for each regime as interpolation targets
  switch (regime) {
    case "SCARCITY": return { tightness: 85, riskAppetite: 15 };
    case "DEFENSIVE": return { tightness: 75, riskAppetite: 30 };
    case "VOLATILE": return { tightness: 60, riskAppetite: 55 };
    case "EXPANSION": return { tightness: 15, riskAppetite: 85 };
    default: return null;
  }
};

const interpolateKnobValue = (
  key: DecisionKnob["key"],
  tightnessScore: number,
  riskAppetiteScore: number,
): number => {
  // Compute a continuous "conservative index" from 0 (max expansion) to 1 (max scarcity)
  // based on how far the current scores are from the EXPANSION ideal.
  const expansionTarget = getRegimeBoundary("EXPANSION")!;
  const scarcityTarget = getRegimeBoundary("SCARCITY")!;

  const tightnessDistance = (tightnessScore - expansionTarget.tightness) /
    Math.max(scarcityTarget.tightness - expansionTarget.tightness, 1);
  const riskAppetiteDistance = (expansionTarget.riskAppetite - riskAppetiteScore) /
    Math.max(expansionTarget.riskAppetite - scarcityTarget.riskAppetite, 1);

  // Conservative index: 0 = expansion, 1 = scarcity
  const conservativeIndex = clampKnobValue(
    (tightnessDistance + riskAppetiteDistance) / 2
  );

  // Interpolate between EXPANSION and SCARCITY knob values
  const expansionValue = knobsByRegime["EXPANSION"][key];
  const scarcityValue = knobsByRegime["SCARCITY"][key];

  return expansionValue + (scarcityValue - expansionValue) * conservativeIndex;
};

export const deriveDecisionKnobs = (context: DecisionKnobContext): DecisionKnob[] => {
  const baseline = knobsByRegime[context.committedState];

  return knobKeyOrder.map((key) => {
    const pendingDelta = getPendingBias(key, context);

    // Use continuous interpolation when scores are available, fall back to discrete regime baseline
    const continuousValue = interpolateKnobValue(
      key,
      context.tightnessScore,
      context.riskAppetiteScore,
    );

    // Blend: 70% continuous, 30% discrete regime baseline
    // This keeps the regime as an anchor while adding magnitude sensitivity
    const blendedValue = Math.round(continuousValue * 0.7 + baseline[key] * 0.3);
    const finalValue = clampKnobValue(blendedValue + pendingDelta);

    return {
      key,
      label: knobLabels[key],
      value: finalValue,
      delta: pendingDelta,
      levelLabels: knobLevelLabels[key],
      rationale: buildKnobRationale(key, context),
    };
  });
};

/**
 * Where the published conditions change, one line per score: the edges of the
 * quadrant the reading sits in, which is what the state machine classifies on
 * (`classifyRegime`: funding pressure above the line, risk appetite at or below
 * it, picks the quadrant). The same lines `buildFlipThreshold` writes as the
 * brief's "Conditions change if".
 *
 * Until 2026-10-07 these were the same three lines in every regime — "Funding
 * pressure ≤ 66 for two readings in a row", "Risk appetite ≥ 54 for two
 * readings in a row" and "Funding pressure > 76 or risk appetite < 44: tighten
 * again" — the pause and resume lines of the default stage, offset from the
 * change lines by fixed amounts. So a Freezing week's Slack post said
 * conditions change at 66 when the homepage said 70, told a Sunny week to watch
 * funding pressure fall below a line it was already under, and told a week
 * already past 76 to "tighten again" if it crossed 76.
 */
export const buildWeeklyLockCommitment = ({
  regime,
  tightnessRegime,
  riskAppetiteRegime,
  confidenceDegraded,
  freshnessDegraded,
}: WeeklyLockCommitmentContext): WeeklyLockCommitment => {
  const trustMarkers = [
    confidenceDegraded ? "Confidence: Guarded" : "",
    freshnessDegraded ? "Freshness: Stale" : "",
  ].filter((marker) => marker.length > 0);

  /* Freezing and Cloudy sit above the funding-pressure line, so they leave it
     by falling to it; Freezing and Stormy sit at or below the risk-appetite
     line, so they leave it by rising above it. */
  const tightnessExit: RuleCondition =
    regime === "SCARCITY" || regime === "DEFENSIVE"
      ? buildRuleCondition("tightness", "<=", tightnessRegime)
      : buildRuleCondition("tightness", ">", tightnessRegime);
  const riskExit: RuleCondition =
    regime === "SCARCITY" || regime === "VOLATILE"
      ? buildRuleCondition("riskAppetite", ">", riskAppetiteRegime)
      : buildRuleCondition("riskAppetite", "<=", riskAppetiteRegime);
  const describeExit = (condition: RuleCondition) =>
    `${condition.metric === "tightness" ? "Funding pressure" : "Risk appetite"} ${
      condition.operator === "<=" ? "at or below" : "above"
    } ${condition.value}`;

  return {
    flipConditions: [describeExit(tightnessExit), describeExit(riskExit)],
    flipLines: [[tightnessExit], [riskExit]],
    ownerCadence: confidenceDegraded || freshnessDegraded
      ? "Re-check daily until live data is back."
      : "Re-check at the next weekly review.",
    trustMarkers,
  };
};
