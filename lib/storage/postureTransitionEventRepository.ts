import type { RegimeDiagnostics, RegimeKey, RegimeThresholds } from "../regimeEngine";
import { buildLineage, type DurableLineage } from "./lineage";
import { getJson, getWhetherKv, parseStoredJson, readKvValues, type KvNamespace } from "../runtime/kv";
import { selectStoreByBinding } from "../runtime/storeSelection";

export type PostureTransitionEvent = DurableLineage & {
  id: string;
  type: "PostureTransitionEvent" | "RegimeDecisionEvent";
  recordedAt: string;
  occurredAt: string;
  effectiveRecordDate: string;
  idempotencyKey: string;
  fromState: RegimeKey | null;
  toState: RegimeKey;
  previousState: RegimeKey;
  nextState: RegimeKey;
  reason: string;
  transitionReason: string;
  triggerMetrics?: {
    tightness: number;
    riskAppetite: number;
    thresholds: RegimeThresholds;
    nearestThresholdDelta: number;
    transitionWatch: boolean;
    pendingCount: number;
  };
  confidence?: {
    score: number;
    band: RegimeDiagnostics["confidence"];
  };
  reversalConditions?: string[];
};

type PostureDecisionCursor = string | null;

export interface PostureTransitionEventRepository {
  append(event: PostureTransitionEvent): Promise<void>;
  list(options?: { cursor?: PostureDecisionCursor; limit?: number }): Promise<{ events: PostureTransitionEvent[]; nextCursor: PostureDecisionCursor }>;
  listSince(cursor?: string | null, limit?: number): Promise<{ events: PostureTransitionEvent[]; cursor: string | null }>;
  findByIdempotencyKey(idempotencyKey: string): Promise<PostureTransitionEvent | null>;
  latest(): Promise<PostureTransitionEvent | null>;
  replay(initialState: RegimeKey, events?: PostureTransitionEvent[]): RegimeKey;
  backendStatus(): "durable" | "local-fallback";
  clear?(): Promise<void>;
}


const IDEMPOTENCY_PREFIX = "posture-event:idempotency:";
const EVENT_PREFIX = "posture-event:entry:";
const DEFAULT_LIMIT = 64;
const REGIME_KEYS = new Set(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]);
const EVENT_TYPES = new Set(["PostureTransitionEvent", "RegimeDecisionEvent"]);
const CONFIDENCE_BANDS = new Set(["LOW", "MEDIUM", "HIGH"]);
const TIMESTAMP_SOURCES = new Set(["source-ingested-at", "record-date-midnight", "request-received-at"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRegimeKey = (value: unknown): boolean =>
  typeof value === "string" && REGIME_KEYS.has(value);

const isThresholds = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.baseRateTightness === "number"
    && typeof value.tightnessRegime === "number"
    && typeof value.riskAppetiteRegime === "number";
};

const isTriggerMetrics = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.tightness === "number"
    && typeof value.riskAppetite === "number"
    && isThresholds(value.thresholds)
    && typeof value.nearestThresholdDelta === "number"
    && typeof value.transitionWatch === "boolean"
    && typeof value.pendingCount === "number";
};

const isConfidence = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return typeof value.score === "number"
    && typeof value.band === "string"
    && CONFIDENCE_BANDS.has(value.band);
};

const isPostureTransitionEvent = (value: unknown): value is PostureTransitionEvent => {
  if (!isRecord(value)) return false;
  return typeof value.eventId === "string"
    && typeof value.sourceVersion === "string"
    && typeof value.canonicalTimestampSource === "string"
    && TIMESTAMP_SOURCES.has(value.canonicalTimestampSource)
    && typeof value.id === "string"
    && typeof value.type === "string"
    && EVENT_TYPES.has(value.type)
    && typeof value.recordedAt === "string"
    && typeof value.occurredAt === "string"
    && typeof value.effectiveRecordDate === "string"
    && typeof value.idempotencyKey === "string"
    && (value.fromState === null || isRegimeKey(value.fromState))
    && isRegimeKey(value.toState)
    && isRegimeKey(value.previousState)
    && isRegimeKey(value.nextState)
    && typeof value.reason === "string"
    && typeof value.transitionReason === "string"
    && (value.triggerMetrics === undefined || isTriggerMetrics(value.triggerMetrics))
    && (value.confidence === undefined || isConfidence(value.confidence))
    && (value.reversalConditions === undefined
      || (Array.isArray(value.reversalConditions)
        && value.reversalConditions.every((condition) => typeof condition === "string")));
};

const parsePostureTransitionEvent = (value: unknown): PostureTransitionEvent | null =>
  isPostureTransitionEvent(value) ? value : null;

const clone = <T>(value: T): T => structuredClone(value);

class InMemoryPostureTransitionEventRepository implements PostureTransitionEventRepository {
  private readonly events: PostureTransitionEvent[] = [];
  private readonly idempotencyMap = new Map<string, PostureTransitionEvent>();

  async append(event: PostureTransitionEvent): Promise<void> {
    const cloned = clone(event);
    this.events.push(cloned);
    this.idempotencyMap.set(event.idempotencyKey, cloned);
  }

  async list(options?: {
    cursor?: PostureDecisionCursor;
    limit?: number;
  }): Promise<{ events: PostureTransitionEvent[]; nextCursor: PostureDecisionCursor }> {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const sorted = [...this.events].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    let startIndex = 0;
    if (options?.cursor) {
      const idx = sorted.findIndex((e) => e.id === options.cursor);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }

    const page = sorted.slice(startIndex, startIndex + limit);
    const nextCursor =
      page.length === limit && startIndex + limit < sorted.length
        ? page[page.length - 1].id
        : null;

    return { events: page, nextCursor };
  }

  async listSince(cursor?: string | null, limit = 50): Promise<{ events: PostureTransitionEvent[]; cursor: string | null }> {
    const sorted = [...this.events].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    let startIndex = 0;
    if (cursor) {
      const idx = sorted.findIndex((e) => e.id === cursor);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }
    const page = sorted.slice(startIndex, startIndex + limit);
    const nextCursor = page.length > 0 ? page[page.length - 1].id : cursor ?? null;
    return { events: page, cursor: nextCursor };
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PostureTransitionEvent | null> {
    const found = this.idempotencyMap.get(idempotencyKey);
    return found ? clone(found) : null;
  }

  async latest(): Promise<PostureTransitionEvent | null> {
    if (this.events.length === 0) return null;
    return clone(this.events[this.events.length - 1]);
  }

  replay(initialState: RegimeKey, events?: PostureTransitionEvent[]): RegimeKey {
    const targetEvents = events ?? this.events;
    let current = initialState;
    for (const event of targetEvents) {
      current = event.nextState ?? event.toState;
    }
    return current;
  }

  backendStatus(): "durable" | "local-fallback" {
    return "local-fallback";
  }

  async clear(): Promise<void> {
    this.events.length = 0;
    this.idempotencyMap.clear();
  }
}

export class KvPostureTransitionEventRepository implements PostureTransitionEventRepository {
  constructor(private readonly kv: KvNamespace) {}

  private toKey(timestamp: number, id: string): string {
    return `${EVENT_PREFIX}${timestamp}_${id}`;
  }

  async append(event: PostureTransitionEvent): Promise<void> {
    const timestamp = new Date(event.recordedAt).getTime();
    const key = this.toKey(timestamp, event.id);
    const json = JSON.stringify(event);
    await this.kv.put(key, json);
    await this.kv.put(`${IDEMPOTENCY_PREFIX}${event.idempotencyKey}`, key);
  }

  async list(options?: {
    cursor?: PostureDecisionCursor;
    limit?: number;
  }): Promise<{ events: PostureTransitionEvent[]; nextCursor: PostureDecisionCursor }> {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const page = await this.kv.list({
      prefix: EVENT_PREFIX,
      cursor: options?.cursor ?? undefined,
      limit,
    });

    const events: PostureTransitionEvent[] = [];
    if (page.keys.length > 0) {
      const raws = await readKvValues(this.kv, page.keys.map((k) => k.name), { cacheTtl: 60 });
      for (const raw of raws) {
        const event = parseStoredJson(raw, parsePostureTransitionEvent);
        if (event) events.push(event);
      }
    }

    events.sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    return {
      events,
      nextCursor: page.list_complete ? null : page.cursor ?? null,
    };
  }

  async listSince(cursor?: string | null, limit = 50): Promise<{ events: PostureTransitionEvent[]; cursor: string | null }> {
    const page = await this.list({ cursor, limit });
    return {
      events: [...page.events].reverse(),
      cursor: page.nextCursor,
    };
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PostureTransitionEvent | null> {
    const eventKey = await this.kv.get(`${IDEMPOTENCY_PREFIX}${idempotencyKey}`);
    if (!eventKey) return null;
    return getJson(this.kv, eventKey, parsePostureTransitionEvent);
  }

  async latest(): Promise<PostureTransitionEvent | null> {
    const page = await this.list({ limit: 1 });
    return page.events[0] ?? null;
  }

  replay(initialState: RegimeKey, events?: PostureTransitionEvent[]): RegimeKey {
    let current = initialState;
    if (events) {
      for (const event of events) {
        current = event.nextState ?? event.toState;
      }
    }
    return current;
  }

  backendStatus(): "durable" | "local-fallback" {
    return "durable";
  }
}

const repositorySelection = selectStoreByBinding(
  getWhetherKv,
  (kv): PostureTransitionEventRepository =>
    kv ? new KvPostureTransitionEventRepository(kv) : new InMemoryPostureTransitionEventRepository(),
);

export const getPostureTransitionEventRepository = (): PostureTransitionEventRepository => repositorySelection.get();

/** Test hook: an empty in-memory repository, held until the next reset whatever the binding does. */
export const resetPostureTransitionEventRepository = (): PostureTransitionEventRepository =>
  repositorySelection.reset(new InMemoryPostureTransitionEventRepository());

export const buildPostureTransitionEvent = ({
  id,
  recordedAt,
  effectiveRecordDate,
  idempotencyKey,
  fromState,
  toState,
  reason,
  triggerMetrics,
  confidence,
  reversalConditions,
}: {
  id?: string;
  recordedAt?: string;
  effectiveRecordDate: string;
  idempotencyKey?: string;
  fromState: RegimeKey | null;
  toState: RegimeKey;
  reason: string;
  triggerMetrics?: PostureTransitionEvent["triggerMetrics"];
  confidence?: PostureTransitionEvent["confidence"];
  reversalConditions?: string[];
}): PostureTransitionEvent => {
  const finalId = id ?? (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const finalRecordedAt = recordedAt ?? new Date().toISOString();
  const finalIdempotencyKey = idempotencyKey ?? `${effectiveRecordDate}:${toState}`;
  const previousState = fromState ?? toState;

  return {
    ...buildLineage("source-ingested-at"),
    id: finalId,
    type: "PostureTransitionEvent",
    recordedAt: finalRecordedAt,
    occurredAt: finalRecordedAt,
    effectiveRecordDate,
    idempotencyKey: finalIdempotencyKey,
    fromState,
    toState,
    previousState,
    nextState: toState,
    reason,
    transitionReason: reason,
    triggerMetrics,
    confidence,
    reversalConditions,
  };
};

