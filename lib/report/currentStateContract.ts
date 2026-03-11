import type { RegimeAssessment } from "../regimeEngine";
import type { DecisionTransitionEvent } from "./decisionEventStore";
import type { OperatorAlert } from "./alerting";

export type CurrentStateContract = {
  currentState: RegimeAssessment["regime"];
  lastChange: {
    from: RegimeAssessment["regime"];
    to: RegimeAssessment["regime"];
    at: string;
    confidence: DecisionTransitionEvent["confidence"];
  } | null;
  whatFlipsNext: string[];
  alerts: OperatorAlert[];
};

export const buildCurrentStateContract = ({
  assessment,
  lastTransition,
  alerts,
}: {
  assessment: RegimeAssessment;
  lastTransition: DecisionTransitionEvent | null;
  alerts: OperatorAlert[];
}): CurrentStateContract => ({
  currentState: assessment.regime,
  lastChange: lastTransition
    ? {
        from: lastTransition.from,
        to: lastTransition.to,
        at: lastTransition.timestamp,
        confidence: lastTransition.confidence,
      }
    : null,
  whatFlipsNext: [
    `Tightness <= ${assessment.thresholds.tightnessRegime}`,
    `Risk appetite > ${assessment.thresholds.riskAppetiteRegime}`,
  ],
  alerts,
});
