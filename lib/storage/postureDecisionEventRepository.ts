import type { RegimeKey } from "../regimeEngine";
import { buildLineage, type DurableLineage } from "./lineage";
import { DurableEventLog, type KvNamespaceLike } from "./eventLog";

export type PostureDecisionEvent = DurableLineage & {
  id?: string;
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

const IDEMPOTENCY_PREFIX = "posture-decision:idempotency:";

class InMemoryPostureDecisionEventRepository implements PostureDecisionEventRepository {
  private readonly eventLog = new DurableEventLog<PostureDecisionEvent>("posture-decision", null);

  async append(event: PostureDecisionEvent) {
    await this.eventLog.append(event);
  }

  async list(options?: { cursor?: PostureDecisionCursor; limit?: number }) {
    const result = await this.eventLog.list({ cursor: options?.cursor, limit: options?.limit });
    return { events: result.items, nextCursor: result.nextCursor };
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const result = await this.eventLog.list({ limit: 100, filter: (e) => e.idempotencyKey === idempotencyKey });
    return result.items[0] ?? null;
  }

  async latest() {
    return this.eventLog.latest();
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvPostureDecisionEventRepository implements PostureDecisionEventRepository {
  private readonly eventLog: DurableEventLog<PostureDecisionEvent>;

  constructor(private readonly kv: KvNamespaceLike) {
    this.eventLog = new DurableEventLog("posture-decision", kv);
  }

  async append(event: PostureDecisionEvent) {
    const nextIndex = await this.eventLog.append(event);
    await this.kv.put(IDEMPOTENCY_PREFIX + event.idempotencyKey, String(nextIndex)).catch(() => undefined);
  }

  async list(options?: { cursor?: PostureDecisionCursor; limit?: number }) {
    const result = await this.eventLog.list({ cursor: options?.cursor, limit: options?.limit });
    return { events: result.items, nextCursor: result.nextCursor };
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const indexRaw = await this.kv.get(IDEMPOTENCY_PREFIX + idempotencyKey);
    if (!indexRaw) {
      const fallbackList = await this.eventLog.list({ limit: 100, filter: (e) => e.idempotencyKey === idempotencyKey });
      return fallbackList.items[0] ?? null;
    }
    const result = await this.eventLog.list({ limit: 100, filter: (e) => e.idempotencyKey === idempotencyKey });
    return result.items[0] ?? null;
  }

  async latest() {
    return this.eventLog.latest();
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = (): KvNamespaceLike | null => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; POSTURE_EVENTS_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { POSTURE_EVENTS_KV?: KvNamespaceLike }).POSTURE_EVENTS_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }

  return binding;
};

let sharedRepository: PostureDecisionEventRepository | null = null;

export const getPostureDecisionEventRepository = (): PostureDecisionEventRepository => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvPostureDecisionEventRepository(kv) : new InMemoryPostureDecisionEventRepository();
  }
  return sharedRepository;
};

export const resetPostureDecisionEventRepository = (): PostureDecisionEventRepository => {
  sharedRepository = new InMemoryPostureDecisionEventRepository();
  return sharedRepository;
};

export const buildPostureDecisionEvent = (
  payload: Omit<PostureDecisionEvent, keyof DurableLineage>,
): PostureDecisionEvent => ({
  ...buildLineage("source-ingested-at"),
  ...payload,
});
