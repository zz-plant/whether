import type { RegimeAssessment, RegimeDiagnostics, RegimeKey, RegimeThresholds } from "../regimeEngine";

export type RegimeState = {
  regime: RegimeKey;
  enteredAt: string;
  lastEvaluatedAt: string;
  confidence: RegimeDiagnostics["confidence"];
};

export type TransitionRule = {
  from: RegimeKey;
  to: RegimeKey;
  threshold: string;
  when: (scores: { tightness: number; riskAppetite: number }, thresholds: RegimeThresholds) => boolean;
};

const thresholdCrossed = (before: number, after: number, threshold: number) =>
  (before <= threshold && after > threshold) || (before > threshold && after <= threshold);

export const transitionRules: TransitionRule[] = [
  {
    from: "SCARCITY",
    to: "DEFENSIVE",
    threshold: "riskAppetite > riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "SCARCITY",
    to: "VOLATILE",
    threshold: "tightness <= tightnessRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
  {
    from: "SCARCITY",
    to: "EXPANSION",
    threshold: "tightness <= tightnessRegime && riskAppetite > riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "DEFENSIVE",
    to: "SCARCITY",
    threshold: "riskAppetite <= riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
  {
    from: "DEFENSIVE",
    to: "VOLATILE",
    threshold: "tightness <= tightnessRegime && riskAppetite <= riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
  {
    from: "DEFENSIVE",
    to: "EXPANSION",
    threshold: "tightness <= tightnessRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "VOLATILE",
    to: "SCARCITY",
    threshold: "tightness > tightnessRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
  {
    from: "VOLATILE",
    to: "DEFENSIVE",
    threshold: "tightness > tightnessRegime && riskAppetite > riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "VOLATILE",
    to: "EXPANSION",
    threshold: "riskAppetite > riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "EXPANSION",
    to: "SCARCITY",
    threshold: "tightness > tightnessRegime && riskAppetite <= riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
  {
    from: "EXPANSION",
    to: "DEFENSIVE",
    threshold: "tightness > tightnessRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime,
  },
  {
    from: "EXPANSION",
    to: "VOLATILE",
    threshold: "riskAppetite <= riskAppetiteRegime",
    when: ({ tightness, riskAppetite }, thresholds) =>
      tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime,
  },
];

const classifyFromThresholds = (
  tightness: number,
  riskAppetite: number,
  thresholds: RegimeThresholds,
): RegimeKey => {
  if (tightness > thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "SCARCITY";
  }
  if (tightness > thresholds.tightnessRegime && riskAppetite > thresholds.riskAppetiteRegime) {
    return "DEFENSIVE";
  }
  if (tightness <= thresholds.tightnessRegime && riskAppetite <= thresholds.riskAppetiteRegime) {
    return "VOLATILE";
  }
  return "EXPANSION";
};

export const evaluateRegimeStateMachine = ({
  previousState,
  scores,
  thresholds,
  asOf,
  confidence,
}: {
  previousState?: RegimeState | null;
  scores: { tightness: number; riskAppetite: number };
  thresholds: RegimeThresholds;
  asOf: string;
  confidence: RegimeDiagnostics["confidence"];
}) => {
  const computedRegime = classifyFromThresholds(scores.tightness, scores.riskAppetite, thresholds);
  if (!previousState) {
    return {
      state: {
        regime: computedRegime,
        enteredAt: asOf,
        lastEvaluatedAt: asOf,
        confidence,
      },
      transition: null,
    };
  }

  const fromRules = transitionRules.filter((rule) => rule.from === previousState.regime);
  const matchedRule = fromRules.find((rule) => rule.when(scores, thresholds));
  const nextRegime = matchedRule?.to ?? previousState.regime;

  return {
    state: {
      regime: nextRegime,
      enteredAt: nextRegime === previousState.regime ? previousState.enteredAt : asOf,
      lastEvaluatedAt: asOf,
      confidence,
    },
    transition:
      nextRegime === previousState.regime
        ? null
        : {
            from: previousState.regime,
            to: nextRegime,
            threshold: matchedRule?.threshold ?? "manual transition",
            crossedThreshold: thresholdCrossed(
              previousState.regime === "SCARCITY" || previousState.regime === "DEFENSIVE"
                ? thresholds.tightnessRegime + 1
                : thresholds.tightnessRegime - 1,
              scores.tightness,
              thresholds.tightnessRegime,
            ),
          },
  };
};

export const buildFlipWatch = (assessment: RegimeAssessment) => {
  const { regime, thresholds } = assessment;
  if (regime === "SCARCITY") {
    return "Loosen only if tightness holds below threshold or appetite recovers above guardrail.";
  }
  if (regime === "DEFENSIVE") {
    return "Flip to SCARCITY if appetite weakens; flip to EXPANSION if tightness cools under threshold.";
  }
  if (regime === "VOLATILE") {
    return "Tighten if tightness rises above threshold; loosen if appetite sustains above threshold.";
  }
  return `Tighten if tightness exceeds ${thresholds.tightnessRegime} or appetite slips below ${thresholds.riskAppetiteRegime}.`;
};
