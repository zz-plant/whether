import type { RegimeKey } from "../regimeEngine";
import { buildLineage, type DurableLineage } from "./lineage";

export type PostureDecisionEvent = DurableLineage & {
  recordedAt: string;
  effectiveRecordDate: string;
  idempotencyKey: string;
  fromState: RegimeKey | null;
  toState: RegimeKey;
  reason: string;
};

export type PostureDecisionCursor = string | null;

export interface PostureDecisionEventRepository {
  append(event: PostureDecisionEvent): Promise<void>;
  list(options?: { cursor?: PostureDecisionCursor; limit?: number }): Promise<{ events: PostureDecisionEvent[]; nextCursor: PostureDecisionCursor }>;
  findByIdempotencyKey(idempotencyKey: string): Promise<PostureDecisionEvent | null>;
  latest(): Promise<PostureDecisionEvent | null>;
  backendStatus(): "durable" | "local-fallback";
  clear?(): Promise<void>;
}

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };
type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

const EVENT_PREFIX = "posture-decision:";
const INDEX_KEY = "posture-decision:index";
const IDEMPOTENCY_PREFIX = "posture-decision:idempotency:";

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const toEventKey = (index: number) => `${EVENT_PREFIX}${String(index).padStart(12, "0")}`;

const parseEventIndex = (key: string) => {
  if (!key.startsWith(EVENT_PREFIX)) {
    return null;
  }
  const parsed = Number.parseInt(key.slice(EVENT_PREFIX.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseCursor = (cursor: PostureDecisionCursor) => {
  if (!cursor) {
    return -1;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

class InMemoryPostureDecisionEventRepository implements PostureDecisionEventRepository {
  private readonly events: PostureDecisionEvent[] = [];

  async append(event: PostureDecisionEvent) {
    this.events.unshift(clone(event));
    this.events.splice(64);
  }

  async list(options?: { cursor?: PostureDecisionCursor; limit?: number }) {
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);
    const ascending = [...this.events].reverse();
    const from = ascending.slice(Math.max(0, threshold + 1), Math.max(0, threshold + 1) + limit);
    const events = from.reverse().map((event) => clone(event));
    const nextCursor = events.length > 0 ? `${threshold + events.length}` : cursor;
    return { events, nextCursor };
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return clone(this.events.find((event) => event.idempotencyKey === idempotencyKey) ?? null);
  }

  async latest() {
    return clone(this.events[0] ?? null);
  }

  backendStatus() {
    return "local-fallback" as const;
  }

  async clear() {
    this.events.length = 0;
  }
}

class KvPostureDecisionEventRepository implements PostureDecisionEventRepository {
  private readonly fallback = new InMemoryPostureDecisionEventRepository();
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(private readonly kv: KvNamespaceLike) {}

  async append(event: PostureDecisionEvent) {
    await this.fallback.append(event);
    this.persistQueue = this.persistQueue.then(async () => {
      const currentIndexRaw = await this.kv.get(INDEX_KEY);
      const currentIndex = currentIndexRaw ? Number.parseInt(currentIndexRaw, 10) : -1;
      const nextIndex = Number.isNaN(currentIndex) ? 0 : currentIndex + 1;
      await this.kv.put(toEventKey(nextIndex), JSON.stringify(event));
      await this.kv.put(IDEMPOTENCY_PREFIX + event.idempotencyKey, String(nextIndex));
      await this.kv.put(INDEX_KEY, String(nextIndex));
    }).catch(() => undefined);

    await this.persistQueue;
  }

  async list(options?: { cursor?: PostureDecisionCursor; limit?: number }) {
    await this.persistQueue;
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);
    const collected: Array<{ index: number; event: PostureDecisionEvent }> = [];
    let listCursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: EVENT_PREFIX, cursor: listCursor, limit: 1000 });
      for (const key of page.keys) {
        const index = parseEventIndex(key.name);
        if (index === null || index <= threshold) {
          continue;
        }
        const raw = await this.kv.get(key.name);
        if (!raw) {
          continue;
        }
        collected.push({ index, event: JSON.parse(raw) as PostureDecisionEvent });
      }
      listCursor = page.cursor;
      if (page.list_complete) {
        break;
      }
    } while (listCursor);

    collected.sort((left, right) => left.index - right.index);
    const limited = collected.slice(0, limit);
    const events = limited.map((entry) => clone(entry.event)).reverse();
    const nextCursor = limited.length > 0 ? `${limited[limited.length - 1]?.index ?? threshold}` : cursor;
    return { events, nextCursor };
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    await this.persistQueue;
    const indexRaw = await this.kv.get(IDEMPOTENCY_PREFIX + idempotencyKey);
    if (!indexRaw) {
      return this.fallback.findByIdempotencyKey(idempotencyKey);
    }
    const key = toEventKey(Number.parseInt(indexRaw, 10));
    const raw = await this.kv.get(key);
    if (!raw) {
      return null;
    }
    return clone(JSON.parse(raw) as PostureDecisionEvent);
  }

  async latest() {
    await this.persistQueue;
    const currentIndexRaw = await this.kv.get(INDEX_KEY);
    const currentIndex = currentIndexRaw ? Number.parseInt(currentIndexRaw, 10) : -1;
    if (currentIndex < 0 || Number.isNaN(currentIndex)) {
      return null;
    }
    const raw = await this.kv.get(toEventKey(currentIndex));
    return raw ? clone(JSON.parse(raw) as PostureDecisionEvent) : null;
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = () => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; POSTURE_EVENTS_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { POSTURE_EVENTS_KV?: KvNamespaceLike }).POSTURE_EVENTS_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }

  return binding;
};

let sharedRepository: PostureDecisionEventRepository | null = null;

export const getPostureDecisionEventRepository = () => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvPostureDecisionEventRepository(kv) : new InMemoryPostureDecisionEventRepository();
  }
  return sharedRepository;
};

export const resetPostureDecisionEventRepository = () => {
  sharedRepository = new InMemoryPostureDecisionEventRepository();
  return sharedRepository;
};

export const buildPostureDecisionEvent = (
  payload: Omit<PostureDecisionEvent, keyof DurableLineage>,
): PostureDecisionEvent => ({
  ...buildLineage("source-ingested-at"),
  ...payload,
});
