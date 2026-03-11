import type { RegimeDiagnostics, RegimeKey } from "../regimeEngine";

export type DecisionTransitionEvent = {
  id: string;
  timestamp: string;
  from: RegimeKey;
  to: RegimeKey;
  triggerValues: {
    tightness: number;
    riskAppetite: number;
    thresholdRule: string;
  };
  confidence: RegimeDiagnostics["confidence"];
  reversalConditions: string[];
};

const decisionEvents: DecisionTransitionEvent[] = [];

export const appendDecisionTransitionEvent = (event: Omit<DecisionTransitionEvent, "id">) => {
  const withId: DecisionTransitionEvent = {
    ...event,
    id: `${event.timestamp}:${event.from}->${event.to}:${decisionEvents.length + 1}`,
  };
  decisionEvents.push(withId);
  return withId;
};

export const readDecisionTransitionEvents = () => [...decisionEvents];

export const replayDecisionState = () => {
  const events = readDecisionTransitionEvents();
  const last = events.at(-1) ?? null;
  return {
    currentRegime: last?.to ?? null,
    lastTransition: last,
    eventCount: events.length,
  };
};
