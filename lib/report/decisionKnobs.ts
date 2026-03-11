import type { RegimeKey } from "../regimeEngine";
import type { RegimeState } from "./regimeStateMachine";

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
  SCARCITY: { approvalVelocity: 0, reversibility: 3, payback: 3, experimentTolerance: 0 },
  DEFENSIVE: { approvalVelocity: 1, reversibility: 2, payback: 2, experimentTolerance: 1 },
  VOLATILE: { approvalVelocity: 2, reversibility: 2, payback: 1, experimentTolerance: 2 },
  EXPANSION: { approvalVelocity: 3, reversibility: 1, payback: 0, experimentTolerance: 3 },
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

const knobKeyOrder: DecisionKnob["key"][] = ["approvalVelocity", "reversibility", "payback", "experimentTolerance"];
const clampKnobValue = (value: number) => Math.min(3, Math.max(0, value));

type DecisionKnobContext = {
  state: RegimeState;
  severityDelta: number;
  nearestThresholdGap: number;
  weakSignalCount: number;
};

const buildKnobRationale = (key: DecisionKnob["key"], context: DecisionKnobContext) => {
  const thresholdCaution = context.nearestThresholdGap <= 8;
  const stabilityLabel = context.state.lastEvaluatedAt === context.state.enteredAt ? "new regime entered" : "state held";
  const severityShift =
    context.severityDelta > 0
      ? "Conditions deteriorated versus prior refresh"
      : context.severityDelta < 0
        ? "Conditions improved versus prior refresh"
        : "Conditions are steady versus prior refresh";
  const weakSignalLabel =
    context.weakSignalCount > 0
      ? `${context.weakSignalCount} weak signal${context.weakSignalCount > 1 ? "s" : ""}`
      : "signals are stable";

  return `${severityShift}; ${stabilityLabel}; ${thresholdCaution ? "near-threshold caution active" : "state-machine band stable"}; ${weakSignalLabel}.`;
};

export const deriveDecisionKnobs = (
  state: RegimeState,
  severityDelta: number,
  context?: { nearestThresholdGap?: number; weakSignalCount?: number },
): DecisionKnob[] => {
  const severityDirection = severityDelta === 0 ? 0 : severityDelta > 0 ? 1 : -1;
  const shift = Math.min(1, Math.abs(severityDirection));
  const baseline = knobsByRegime[state.regime];
  const knobContext: DecisionKnobContext = {
    state,
    severityDelta,
    nearestThresholdGap: context?.nearestThresholdGap ?? 100,
    weakSignalCount: context?.weakSignalCount ?? 0,
  };

  return knobKeyOrder.map((key) => {
    const conservativeBias = key === "reversibility" || key === "payback" ? 1 : -1;
    const delta = shift * severityDirection * conservativeBias;
    return {
      key,
      label: knobLabels[key],
      value: clampKnobValue(baseline[key] + delta),
      delta,
      levelLabels: knobLevelLabels[key],
      rationale: buildKnobRationale(key, knobContext),
    };
  });
};

export type WeeklyLockCommitment = {
  currentCall: string;
  flipConditions: string[];
  ownerCadence: string;
  trustMarkers: string[];
};

type WeeklyLockCommitmentContext = {
  state: RegimeState;
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

export const buildWeeklyLockCommitment = ({
  state,
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
  ].filter(Boolean);

  return {
    currentCall: weeklyCallByRegime[state.regime],
    flipConditions: [
      `Tightness ≤ ${Math.max(tightnessRegime - loosenBy, 0)} for 2 consecutive refreshes.`,
      `Risk appetite ≥ ${Math.min(riskAppetiteRegime + loosenBy, 100)} for 2 consecutive refreshes.`,
      `Re-tighten if tightness > ${Math.min(tightnessRegime + tightenBy, 100)} or risk appetite < ${Math.max(riskAppetiteRegime - tightenBy, 0)}.`,
    ],
    ownerCadence:
      confidenceDegraded || freshnessDegraded
        ? "Owner: CEO + Finance lead · Checkpoint: daily 10:00 review until trust markers clear."
        : "Owner: CEO + Finance lead · Checkpoint: Mon/Thu operating review.",
    trustMarkers,
  };
};
