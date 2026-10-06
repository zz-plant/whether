import { getWhetherKv, readKvValues, type KvNamespace } from "../runtime/kv";
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

type CloudflareKvNamespaceLike = KvNamespace;

const EVENT_PREFIX = "decision-event:";
const EVENT_INDEX_KEY = "meta:decision-event:index";

/** Ceiling on a single unpaginated read so log length cannot stall the route. */
const MAX_EVENT_SCAN = 1000;

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

  /**
   * `limit` bounds the durable read itself rather than trimming afterwards. Callers page
   * through an append-only log that grows without end, so reading it whole to return a
   * page puts this route on the same cost curve that stalled the report path.
   */
  async listSince(cursor: Cursor, limit?: number): Promise<ListSinceResult> {
    const inMemory = this.listSinceInMemory(cursor, limit);
    if (!this.cloudflareKv) {
      return inMemory;
    }

    await this.whenDurableFlushCompletes();
    const durable = await this.listSinceDurable(cursor, limit);
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
    const startIndex = parseCursorIndex(cursor) + 1;
    const safeStart = Math.max(0, startIndex);
    const window = this.events.slice(safeStart);
    // Mirrors the durable path: return one past the page so callers can detect `hasMore`.
    const sliced = (limit === undefined ? window : window.slice(0, limit + 1)).map((event) =>
      clone(event),
    );
    const nextCursor = this.events.length > 0 ? `${this.events.length - 1}` : cursor;

    return {
      events: sliced,
      cursor: nextCursor,
    };
  }

  private async resolveEventIndexes(thresholdIndex: number): Promise<number[]> {
    const rawLatest = await this.cloudflareKv!.get(EVENT_INDEX_KEY);
    const latest = rawLatest === null ? Number.NaN : Number.parseInt(rawLatest, 10);

    if (Number.isFinite(latest)) {
      const indexes: number[] = [];
      for (let index = Math.max(thresholdIndex + 1, 0); index <= latest; index++) {
        indexes.push(index);
      }
      return indexes;
    }

    const indexes: number[] = [];
    let listCursor: string | undefined;

    do {
      const page = await this.cloudflareKv!.list({
        prefix: EVENT_PREFIX,
        cursor: listCursor,
        limit: 1000,
      });

      for (const key of page.keys) {
        const index = parseEventIndex(key.name);
        if (index !== null && index > thresholdIndex) {
          indexes.push(index);
        }
      }

      listCursor = page.cursor;
      if (page.list_complete) {
        break;
      }
    } while (listCursor);

    return indexes.sort((left, right) => left - right);
  }

  private async listSinceDurable(cursor: Cursor, limit?: number): Promise<ListSinceResult> {
    if (!this.cloudflareKv) {
      return this.listSinceInMemory(cursor, limit);
    }

    const thresholdIndex = parseCursorIndex(cursor);
    const collected: Array<{ index: number; event: RegimeDecisionEvent }> = [];

    const available = await this.resolveEventIndexes(thresholdIndex);
    // Read one past the requested page so callers can still detect `hasMore` without
    // paying for the rest of the log.
    const scanCeiling = limit === undefined ? MAX_EVENT_SCAN : Math.min(limit + 1, MAX_EVENT_SCAN);
    const selected = available.slice(0, scanCeiling);

    const raws = await readKvValues(this.cloudflareKv, selected.map(toEventKey));

    for (let i = 0; i < selected.length; i++) {
      const raw = raws[i];
      if (!raw) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!isRegimeDecisionEvent(parsed)) {
        continue;
      }

      collected.push({ index: selected[i], event: parsed });
    }

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
