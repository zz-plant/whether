import { getWhetherKv, type KvNamespace } from "../runtime/kv";
import { DurableEventLog, parseCursor } from "../storage/eventLog";
import { selectStoreByBinding } from "../runtime/storeSelection";
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

/**
 * The durable half is a DurableEventLog under the topic `decision-event`, which writes the keys
 * this store always has: `decision-event:<12-digit index>` and the `meta:decision-event:index`
 * counter. It used to carry its own copy of that log — the clone, the key format, the counter,
 * the queue and the 1000-entry scan cap — line for line.
 */
const DECISION_EVENT_TOPIC = "decision-event";

/** Ceiling on a single unpaginated read so log length cannot stall the route. */
const MAX_EVENT_SCAN = 1000;

const freeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value)) {
    if (typeof nested === "object" && nested !== null && !Object.isFrozen(nested)) {
      freeze(nested);
    }
  }

  return value;
};

const isRegimeDecisionEvent = (value: unknown): value is RegimeDecisionEvent =>
  typeof value === "object"
  && value !== null
  && Reflect.get(value, "type") === "RegimeDecisionEvent"
  && typeof Reflect.get(value, "id") === "string";

export class DecisionEventStore {
  private readonly events: RegimeDecisionEvent[] = [];
  private readonly log: DurableEventLog<RegimeDecisionEvent> | null;
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(cloudflareKv: KvNamespace | null = null) {
    this.log = cloudflareKv ? new DurableEventLog(DECISION_EVENT_TOPIC, cloudflareKv, isRegimeDecisionEvent) : null;
  }

  /**
   * Synchronous for the caller: the event is in this isolate's list at once, and the durable
   * write follows on a queue whose failure is non-fatal — the in-memory stream stays available.
   */
  append(event: RegimeDecisionEvent): RegimeDecisionEvent {
    const next = freeze(structuredClone(event));
    this.events.push(next);

    const log = this.log;
    if (log) {
      this.persistQueue = this.persistQueue
        .then(() => log.append(next))
        .then(
          () => undefined,
          () => undefined,
        );
    }

    return structuredClone(next);
  }

  async whenDurableFlushCompletes() {
    await this.persistQueue;
  }

  /**
   * `limit` bounds the durable read itself rather than trimming afterwards. Callers page
   * through an append-only log that grows without end, so reading it whole to return a
   * page puts this route on the same cost curve that stalled the report path.
   */
  async listSince(cursor: Cursor, limit?: number): Promise<ListSinceResult> {
    const inMemory = this.listSinceInMemory(cursor, limit);
    if (!this.log) {
      return inMemory;
    }

    await this.whenDurableFlushCompletes();
    const durable = await this.listSinceDurable(this.log, cursor, limit);
    if (durable.events.length === 0) {
      return inMemory;
    }
    return durable;
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

  private listSinceInMemory(cursor: Cursor, limit?: number): ListSinceResult {
    const startIndex = parseCursor(cursor) + 1;
    const safeStart = Math.max(0, startIndex);
    const window = this.events.slice(safeStart);
    // Mirrors the durable path: return one past the page so callers can detect `hasMore`.
    const sliced = (limit === undefined ? window : window.slice(0, limit + 1)).map((event) =>
      structuredClone(event),
    );
    const nextCursor = this.events.length > 0 ? `${this.events.length - 1}` : cursor;

    return {
      events: sliced,
      cursor: nextCursor,
    };
  }

  private async listSinceDurable(
    log: DurableEventLog<RegimeDecisionEvent>,
    cursor: Cursor,
    limit?: number,
  ): Promise<ListSinceResult> {
    // Read one past the requested page so callers can still detect `hasMore` without
    // paying for the rest of the log. Uncached: this is a tail a caller polls.
    const scanCeiling = limit === undefined ? MAX_EVENT_SCAN : Math.min(limit + 1, MAX_EVENT_SCAN);
    const collected = await log.readAfter(parseCursor(cursor), scanCeiling);

    const last = collected[collected.length - 1];
    return {
      events: collected.map(({ item }) => item),
      cursor: last ? `${last.index}` : cursor,
    };
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

const buildReversalConditions = (
  previousState: RegimeKey,
  nextState: RegimeKey,
  thresholds: RegimeThresholds,
): string[] => {
  const tightening = isTightening(previousState, nextState);
  if (tightening) {
    return [
      `Funding pressure <= ${thresholds.tightnessRegime} for two readings in a row.`,
      `Risk appetite > ${thresholds.riskAppetiteRegime} for two readings in a row.`,
    ];
  }

  return [
    `Funding pressure > ${thresholds.tightnessRegime} for two readings in a row.`,
    `Risk appetite <= ${thresholds.riskAppetiteRegime} for two readings in a row.`,
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

const decisionEventStoreSelection = selectStoreByBinding(getWhetherKv, (kv) => new DecisionEventStore(kv));

export const getDecisionEventStore = () => decisionEventStoreSelection.get();

export const resetDecisionEventStore = () => decisionEventStoreSelection.reset();
