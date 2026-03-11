import type { RegimeKey } from "../regimeEngine";
import type { RegimeStateTransition } from "./regimeStateMachine";

export const operatingLeverOrder = [
  "hiring-stance",
  "investment-pace",
  "sales-posture",
  "product-priorities",
  "risk-tolerance",
] as const;

export type OperatingLeverKey = (typeof operatingLeverOrder)[number];

export const operatingLeverLabel: Record<OperatingLeverKey, string> = {
  "hiring-stance": "Hiring stance",
  "investment-pace": "Investment pace",
  "sales-posture": "Sales posture",
  "product-priorities": "Product priorities",
  "risk-tolerance": "Risk tolerance",
};

export type DecisionKnob = {
  key: "approvalVelocity" | "reversibility" | "payback" | "experimentTolerance";
  label: string;
  value: number;
  delta: number;
  levelLabels: [string, string, string, string];
  rationale: string;
};

export const knobsByRegime: Record<RegimeKey, Record<DecisionKnob["key"], number>> = {
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

export type DecisionKnobContext = {
  committedState: RegimeKey;
  transition: Pick<RegimeStateTransition, "pending" | "committed" | "candidateState" | "transitionReason">;
  nearestThresholdGap: number;
  weakSignalCount: number;
};

export type WeeklyLockCommitment = {
  currentCall: string;
  flipConditions: string[];
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

const weeklyCallByRegime: Record<RegimeKey, string> = {
  SCARCITY: "Freeze discretionary spend; protect cash-critical execution.",
  DEFENSIVE: "Gate net-new commitments to short-payback work only.",
  VOLATILE: "Approve only reversible bets with explicit checkpoint exits.",
  EXPANSION: "Scale proven bets, but keep milestone-based approval gates.",
};

const buildKnobRationale = (key: DecisionKnob["key"], context: DecisionKnobContext) => {
  const thresholdCaution = context.nearestThresholdGap <= 8;
  const weakSignalLabel = context.weakSignalCount > 0 ? `${context.weakSignalCount} weak signal${context.weakSignalCount > 1 ? "s" : ""}` : "signals are stable";

  if (context.transition.pending) {
    return `${context.transition.transitionReason} Keep ${key} on committed ${context.committedState.toLowerCase()} settings while ${weakSignalLabel}.`;
  }

  if (context.transition.committed) {
    return `${context.transition.transitionReason} ${key} now follows committed ${context.committedState.toLowerCase()} posture with ${weakSignalLabel}.`;
  }

  if (thresholdCaution) {
    return `Near-threshold risk keeps ${key} constrained while ${weakSignalLabel}.`;
  }

  return `${key} aligns to committed ${context.committedState.toLowerCase()} posture and ${weakSignalLabel}.`;
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

export const deriveDecisionKnobs = (context: DecisionKnobContext): DecisionKnob[] => {
  const baseline = knobsByRegime[context.committedState];

  return knobKeyOrder.map((key) => {
    const delta = getPendingBias(key, context);
    return {
      key,
      label: knobLabels[key],
      value: clampKnobValue(baseline[key] + delta),
      delta,
      levelLabels: knobLevelLabels[key],
      rationale: buildKnobRationale(key, context),
    };
  });
};

export const buildWeeklyLockCommitment = ({
  regime,
  tightnessRegime,
  riskAppetiteRegime,
  confidenceDegraded,
  freshnessDegraded,
}: WeeklyLockCommitmentContext): WeeklyLockCommitment => {
  const tightenBy = 6;
  const loosenBy = 4;

  const trustMarkers = [
    confidenceDegraded ? "Confidence: Guarded" : "",
    freshnessDegraded ? "Freshness: Stale" : "",
  ].filter((marker) => marker.length > 0);

  return {
    currentCall: weeklyCallByRegime[regime],
    flipConditions: [
      `Tightness ≤ ${Math.max(tightnessRegime - loosenBy, 0)} for 2 consecutive refreshes.`,
      `Risk appetite ≥ ${Math.min(riskAppetiteRegime + loosenBy, 100)} for 2 consecutive refreshes.`,
      `Re-tighten if tightness > ${Math.min(tightnessRegime + tightenBy, 100)} or risk appetite < ${Math.max(riskAppetiteRegime - tightenBy, 0)}.`,
    ],
    ownerCadence: confidenceDegraded || freshnessDegraded
      ? "Owner: CEO + Finance lead · Checkpoint: daily 10:00 review until trust markers clear."
      : "Owner: CEO + Finance lead · Checkpoint: Mon/Thu operating review.",
    trustMarkers,
  };
};
