import type { DecisionMemoryEntry } from "../decisionMemory";
import { DurableEventLog, type KvNamespaceLike } from "./eventLog";

type Cursor = string | null;

export interface DecisionMemoryRepository {
  append(entry: DecisionMemoryEntry): Promise<void>;
  list(options?: { cursor?: Cursor; limit?: number; clientId?: string }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }>;
  backendStatus(): "durable" | "local-fallback";
}

class InMemoryDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly eventLog = new DurableEventLog<DecisionMemoryEntry>("decision-memory", null);

  async append(entry: DecisionMemoryEntry) {
    await this.eventLog.append(entry);
  }

  async list(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const result = await this.eventLog.list({
      cursor: options?.cursor,
      limit: options?.limit,
      filter: options?.clientId ? (item) => item.context.clientId === options.clientId : undefined,
    });
    return { entries: result.items, nextCursor: result.nextCursor };
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly eventLog: DurableEventLog<DecisionMemoryEntry>;

  constructor(kv: KvNamespaceLike) {
    this.eventLog = new DurableEventLog("decision-memory", kv);
  }

  async append(entry: DecisionMemoryEntry) {
    await this.eventLog.append(entry);
  }

  async list(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const result = await this.eventLog.list({
      cursor: options?.cursor,
      limit: options?.limit,
      filter: options?.clientId ? (item) => item.context.clientId === options.clientId : undefined,
    });
    return { entries: result.items, nextCursor: result.nextCursor };
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = (): KvNamespaceLike | null => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; DECISION_MEMORY_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { DECISION_MEMORY_KV?: KvNamespaceLike }).DECISION_MEMORY_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }
  return binding;
};

let sharedRepository: DecisionMemoryRepository | null = null;

export const getDecisionMemoryRepository = (): DecisionMemoryRepository => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvDecisionMemoryRepository(kv) : new InMemoryDecisionMemoryRepository();
  }
  return sharedRepository;
};

export const resetDecisionMemoryRepository = (): DecisionMemoryRepository => {
  sharedRepository = new InMemoryDecisionMemoryRepository();
  return sharedRepository;
};
