import type { RegimeKey } from "../regimeEngine";

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

type DecisionKnobContext = {
  regime: RegimeKey;
  severityDelta: number;
  nearestThresholdGap: number;
  weakSignalCount: number;
};

const buildKnobRationale = (key: DecisionKnob["key"], context: DecisionKnobContext) => {
  const thresholdCaution = context.nearestThresholdGap <= 8;
  const severityShift =
    context.severityDelta > 0
      ? "Conditions deteriorated versus prior week"
      : context.severityDelta < 0
        ? "Conditions improved versus prior week"
        : "Conditions are steady versus prior week";
  const weakSignalLabel = context.weakSignalCount > 0 ? `${context.weakSignalCount} weak signal${context.weakSignalCount > 1 ? "s" : ""}` : "signals are stable";

  if (key === "approvalVelocity") {
    return thresholdCaution
      ? `${severityShift}; near-threshold risk keeps approvals paced while ${weakSignalLabel}.`
      : `${severityShift}; approval speed follows ${context.regime.toLowerCase()} conditions while ${weakSignalLabel}.`;
  }

  if (key === "experimentTolerance") {
    return thresholdCaution
      ? `${severityShift}; threshold proximity caps experimentation despite ${weakSignalLabel}.`
      : `${severityShift}; experiment tolerance tracks current risk appetite and ${weakSignalLabel}.`;
  }

  return thresholdCaution
    ? `${severityShift}; keep stronger controls until threshold risk eases and ${weakSignalLabel}.`
    : `${severityShift}; controls align to current regime with ${weakSignalLabel}.`;
};

export const deriveDecisionKnobs = (
  regime: RegimeKey,
  severityDelta: number,
  context?: { nearestThresholdGap?: number; weakSignalCount?: number },
): DecisionKnob[] => {
  const severityDirection = severityDelta === 0 ? 0 : severityDelta > 0 ? 1 : -1;
  const shift = Math.min(1, Math.abs(severityDirection));
  const baseline = knobsByRegime[regime];
  const knobContext: DecisionKnobContext = {
    regime,
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
