import type { RegimeDiagnostics, RegimeKey, RegimeThresholds } from "../regimeEngine";

export type RegimeDecisionEvent = {
  id: string;
  type: "RegimeDecisionEvent";
  occurredAt: string;
  previousState: RegimeKey;
  nextState: RegimeKey;
  triggerMetrics: {
    tightness: number;
    riskAppetite: number;
    thresholds: RegimeThresholds;
    nearestThresholdDelta: number;
    transitionWatch: boolean;
    pendingCount: number;
  };
  confidence: {
    score: number;
    band: RegimeDiagnostics["confidence"];
  };
  reversalConditions: string[];
  transitionReason: string;
};

type Cursor = string | null;

type ListSinceResult = {
  events: RegimeDecisionEvent[];
  cursor: Cursor;
};

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const freeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (typeof nested === "object" && nested !== null && !Object.isFrozen(nested)) {
      freeze(nested);
    }
  }

  return value;
};

export class DecisionEventStore {
  private readonly events: RegimeDecisionEvent[] = [];

  append(event: RegimeDecisionEvent): RegimeDecisionEvent {
    const next = freeze(clone(event));
    this.events.push(next);
    return clone(next);
  }

  listSince(cursor: Cursor): ListSinceResult {
    const startIndex = cursor ? Number.parseInt(cursor, 10) + 1 : 0;
    const safeStart = Number.isNaN(startIndex) ? 0 : Math.max(0, startIndex);
    const sliced = this.events.slice(safeStart).map((event) => clone(event));
    const nextCursor = this.events.length > 0 ? `${this.events.length - 1}` : null;

    return {
      events: sliced,
      cursor: nextCursor,
    };
  }

  replay(initialState: RegimeKey, events: RegimeDecisionEvent[]): RegimeKey {
    return events.reduce((state, event) => {
      if (event.previousState !== state) {
        throw new Error(
          `Replay divergence for event ${event.id}: expected previousState=${state}, received ${event.previousState}`,
        );
      }
      return event.nextState;
    }, initialState);
  }

  clear() {
    this.events.length = 0;
  }
}

const confidenceScoreMap: Record<RegimeDiagnostics["confidence"], number> = {
  LOW: 0.35,
  MEDIUM: 0.6,
  HIGH: 0.85,
};

const regimeOrder: RegimeKey[] = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"];

const isTightening = (previousState: RegimeKey, nextState: RegimeKey) =>
  regimeOrder.indexOf(nextState) < regimeOrder.indexOf(previousState);

export const buildReversalConditions = (
  previousState: RegimeKey,
  nextState: RegimeKey,
  thresholds: RegimeThresholds,
): string[] => {
  const tightening = isTightening(previousState, nextState);
  if (tightening) {
    return [
      `Tightness <= ${thresholds.tightnessRegime} for 2 consecutive refreshes.`,
      `Risk appetite > ${thresholds.riskAppetiteRegime} for 2 consecutive refreshes.`,
    ];
  }

  return [
    `Tightness > ${thresholds.tightnessRegime} for 2 consecutive refreshes.`,
    `Risk appetite <= ${thresholds.riskAppetiteRegime} for 2 consecutive refreshes.`,
  ];
};

export const buildRegimeDecisionEvent = ({
  previousState,
  nextState,
  tightness,
  riskAppetite,
  thresholds,
  diagnostics,
  pendingCount,
  transitionReason,
}: {
  previousState: RegimeKey;
  nextState: RegimeKey;
  tightness: number;
  riskAppetite: number;
  thresholds: RegimeThresholds;
  diagnostics: Pick<RegimeDiagnostics, "confidence" | "nearestThresholdDelta" | "transitionWatch">;
  pendingCount: number;
  transitionReason: string;
}): RegimeDecisionEvent => ({
  id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  type: "RegimeDecisionEvent",
  occurredAt: new Date().toISOString(),
  previousState,
  nextState,
  triggerMetrics: {
    tightness,
    riskAppetite,
    thresholds,
    nearestThresholdDelta: diagnostics.nearestThresholdDelta,
    transitionWatch: diagnostics.transitionWatch,
    pendingCount,
  },
  confidence: {
    score: confidenceScoreMap[diagnostics.confidence],
    band: diagnostics.confidence,
  },
  reversalConditions: buildReversalConditions(previousState, nextState, thresholds),
  transitionReason,
});

let sharedDecisionEventStore: DecisionEventStore | null = null;

export const getDecisionEventStore = () => {
  if (!sharedDecisionEventStore) {
    sharedDecisionEventStore = new DecisionEventStore();
  }
  return sharedDecisionEventStore;
};

export const resetDecisionEventStore = () => {
  sharedDecisionEventStore = new DecisionEventStore();
  return sharedDecisionEventStore;
};
