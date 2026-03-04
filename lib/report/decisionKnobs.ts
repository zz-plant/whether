import type { RegimeKey } from "../regimeEngine";

export type DecisionKnob = {
  key: "approvalVelocity" | "reversibility" | "payback" | "experimentTolerance";
  label: string;
  value: number;
  delta: number;
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

const clampKnobValue = (value: number) => Math.min(3, Math.max(0, value));

export const deriveDecisionKnobs = (
  regime: RegimeKey,
  severityDelta: number,
): DecisionKnob[] => {
  const severityDirection = severityDelta === 0 ? 0 : severityDelta > 0 ? 1 : -1;
  const shift = Math.min(1, Math.abs(severityDirection));
  const baseline = knobsByRegime[regime];

  return (Object.keys(baseline) as DecisionKnob["key"][]).map((key) => {
    const conservativeBias = key === "reversibility" || key === "payback" ? 1 : -1;
    const delta = shift * severityDirection * conservativeBias;
    return {
      key,
      label: knobLabels[key],
      value: clampKnobValue(baseline[key] + delta),
      delta,
    };
  });
};
