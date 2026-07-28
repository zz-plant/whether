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

type CloudflareKvListResult = {
  keys: Array<{ name: string }>;
  list_complete: boolean;
  cursor?: string;
};

export type CloudflareKvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<CloudflareKvListResult>;
};

const EVENT_PREFIX = "decision-event:";
const EVENT_INDEX_KEY = "meta:decision-event:index";

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

const toEventKey = (index: number) => `${EVENT_PREFIX}${String(index).padStart(12, "0")}`;

const parseEventIndex = (key: string) => {
  if (!key.startsWith(EVENT_PREFIX)) {
    return null;
  }
  const parsed = Number.parseInt(key.slice(EVENT_PREFIX.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseCursorIndex = (cursor: Cursor) => {
  if (!cursor) {
    return -1;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

const isRegimeDecisionEvent = (value: unknown): value is RegimeDecisionEvent => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as Partial<RegimeDecisionEvent>;
  return event.type === "RegimeDecisionEvent" && typeof event.id === "string";
};

const sortByOccurredAtThenId = (left: RegimeDecisionEvent, right: RegimeDecisionEvent) => {
  const occurredCompare = left.occurredAt.localeCompare(right.occurredAt);
  if (occurredCompare !== 0) {
    return occurredCompare;
  }
  return left.id.localeCompare(right.id);
};

export class DecisionEventStore {
  private readonly events: RegimeDecisionEvent[] = [];
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(private readonly cloudflareKv: CloudflareKvNamespaceLike | null = null) {}

  append(event: RegimeDecisionEvent): RegimeDecisionEvent {
    const next = freeze(clone(event));
    this.events.push(next);

    if (this.cloudflareKv) {
      this.persistQueue = this.persistQueue
        .then(async () => {
          const currentIndexRaw = await this.cloudflareKv?.get(EVENT_INDEX_KEY);
          const currentIndex = currentIndexRaw ? Number.parseInt(currentIndexRaw, 10) : -1;
          const nextIndex = Number.isNaN(currentIndex) ? 0 : currentIndex + 1;
          await this.cloudflareKv?.put(toEventKey(nextIndex), JSON.stringify(next));
          await this.cloudflareKv?.put(EVENT_INDEX_KEY, String(nextIndex));
        })
        .catch(() => {
          // Non-fatal persistence fallback: keep in-memory event stream available.
        });
    }

    return clone(next);
  }

  async whenDurableFlushCompletes() {
    await this.persistQueue;
  }

  async listSince(cursor: Cursor): Promise<ListSinceResult> {
    const inMemory = this.listSinceInMemory(cursor);
    if (!this.cloudflareKv) {
      return inMemory;
    }

    await this.whenDurableFlushCompletes();
    const durable = await this.listSinceDurable(cursor);
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

  private listSinceInMemory(cursor: Cursor): ListSinceResult {
    const startIndex = parseCursorIndex(cursor) + 1;
    const safeStart = Math.max(0, startIndex);
    const sliced = this.events.slice(safeStart).map((event) => clone(event));
    const nextCursor = this.events.length > 0 ? `${this.events.length - 1}` : cursor;

    return {
      events: sliced,
      cursor: nextCursor,
    };
  }

  private async listSinceDurable(cursor: Cursor): Promise<ListSinceResult> {
    if (!this.cloudflareKv) {
      return this.listSinceInMemory(cursor);
    }

    const thresholdIndex = parseCursorIndex(cursor);
    const collected: Array<{ index: number; event: RegimeDecisionEvent }> = [];
    let listCursor: string | undefined;

    do {
      const page = await this.cloudflareKv.list({
        prefix: EVENT_PREFIX,
        cursor: listCursor,
        limit: 1000,
      });

      const matchingKeys: Array<{ keyName: string; index: number }> = [];
      for (const key of page.keys) {
        const index = parseEventIndex(key.name);
        if (index !== null && index > thresholdIndex) {
          matchingKeys.push({ keyName: key.name, index });
        }
      }

      const raws = await Promise.all(
        matchingKeys.map(({ keyName }) => this.cloudflareKv!.get(keyName)),
      );

      for (let i = 0; i < matchingKeys.length; i++) {
        const raw = raws[i];
        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw) as unknown;
        if (!isRegimeDecisionEvent(parsed)) {
          continue;
        }

        collected.push({ index: matchingKeys[i].index, event: parsed });
      }

      listCursor = page.cursor;
      if (page.list_complete) {
        break;
      }
    } while (listCursor);

    collected.sort((left, right) => left.index - right.index);
    const events = collected.map(({ event }) => clone(event));
    const nextCursor = collected.length > 0 ? `${collected[collected.length - 1]?.index ?? thresholdIndex}` : cursor;

    return {
      events,
      cursor: nextCursor,
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

const getCloudflareKvBinding = () => {
  const maybeBinding = (globalThis as { WHETHER_DURABLE_KV?: CloudflareKvNamespaceLike; DECISION_EVENTS_KV?: CloudflareKvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { DECISION_EVENTS_KV?: CloudflareKvNamespaceLike }).DECISION_EVENTS_KV;
  if (!maybeBinding) {
    return null;
  }

  if (
    typeof maybeBinding.get !== "function" ||
    typeof maybeBinding.put !== "function" ||
    typeof maybeBinding.list !== "function"
  ) {
    return null;
  }

  return maybeBinding;
};

let sharedDecisionEventStore: DecisionEventStore | null = null;

export const getDecisionEventStore = () => {
  if (!sharedDecisionEventStore) {
    sharedDecisionEventStore = new DecisionEventStore(getCloudflareKvBinding());
  }
  return sharedDecisionEventStore;
};

export const resetDecisionEventStore = () => {
  sharedDecisionEventStore = new DecisionEventStore(getCloudflareKvBinding());
  return sharedDecisionEventStore;
};

export const sortRegimeDecisionEvents = (events: RegimeDecisionEvent[]) =>
  [...events].sort(sortByOccurredAtThenId);
