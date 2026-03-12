import type { DecisionMemoryEntry } from "../decisionMemory";

type Cursor = string | null;

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };
type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

export interface DecisionMemoryRepository {
  append(entry: DecisionMemoryEntry): Promise<void>;
  list(options?: { cursor?: Cursor; limit?: number; clientId?: string }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }>;
  backendStatus(): "durable" | "local-fallback";
}

const ENTRY_PREFIX = "decision-memory:";
const ENTRY_INDEX_KEY = "decision-memory:index";

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const parseCursor = (cursor: Cursor) => {
  if (!cursor) {
    return -1;
  }
  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

const toKey = (index: number) => `${ENTRY_PREFIX}${String(index).padStart(12, "0")}`;
const parseIndex = (key: string) => {
  if (!key.startsWith(ENTRY_PREFIX)) {
    return null;
  }
  const parsed = Number.parseInt(key.slice(ENTRY_PREFIX.length), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

class InMemoryDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly entries: DecisionMemoryEntry[] = [];

  async append(entry: DecisionMemoryEntry) {
    this.entries.unshift(clone(entry));
    this.entries.splice(64);
  }

  async list(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);
    const filtered = options?.clientId
      ? this.entries.filter((entry) => entry.context.clientId === options.clientId)
      : this.entries;
    const ascending = [...filtered].reverse();
    const from = ascending.slice(Math.max(0, threshold + 1), Math.max(0, threshold + 1) + limit);
    const entries = from.reverse().map((entry) => clone(entry));
    const nextCursor = entries.length > 0 ? `${threshold + entries.length}` : cursor;
    return { entries, nextCursor };
  }

  backendStatus() {
    return "local-fallback" as const;
  }
}

class KvDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly fallback = new InMemoryDecisionMemoryRepository();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly kv: KvNamespaceLike) {}

  async append(entry: DecisionMemoryEntry) {
    await this.fallback.append(entry);
    this.queue = this.queue.then(async () => {
      const currentRaw = await this.kv.get(ENTRY_INDEX_KEY);
      const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
      const next = Number.isNaN(current) ? 0 : current + 1;
      await this.kv.put(toKey(next), JSON.stringify(entry));
      await this.kv.put(ENTRY_INDEX_KEY, String(next));
    }).catch(() => undefined);

    await this.queue;
  }

  async list(options?: { cursor?: Cursor; limit?: number; clientId?: string }) {
    await this.queue;
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);
    const collected: Array<{ index: number; entry: DecisionMemoryEntry }> = [];
    let listCursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: ENTRY_PREFIX, cursor: listCursor, limit: 1000 });
      for (const key of page.keys) {
        const index = parseIndex(key.name);
        if (index === null || index <= threshold) {
          continue;
        }
        const raw = await this.kv.get(key.name);
        if (!raw) {
          continue;
        }
        const parsed = JSON.parse(raw) as DecisionMemoryEntry;
        if (options?.clientId && parsed.context.clientId !== options.clientId) {
          continue;
        }
        collected.push({ index, entry: parsed });
      }
      listCursor = page.cursor;
      if (page.list_complete) {
        break;
      }
    } while (listCursor);

    collected.sort((a, b) => a.index - b.index);
    const limited = collected.slice(0, limit);
    return {
      entries: limited.map((item) => clone(item.entry)).reverse(),
      nextCursor: limited.length > 0 ? `${limited[limited.length - 1]?.index ?? threshold}` : cursor,
    };
  }

  backendStatus() {
    return "durable" as const;
  }
}

const getKvBinding = () => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; DECISION_MEMORY_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { DECISION_MEMORY_KV?: KvNamespaceLike }).DECISION_MEMORY_KV;

  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }
  return binding;
};

let sharedRepository: DecisionMemoryRepository | null = null;

export const getDecisionMemoryRepository = () => {
  if (!sharedRepository) {
    const kv = getKvBinding();
    sharedRepository = kv ? new KvDecisionMemoryRepository(kv) : new InMemoryDecisionMemoryRepository();
  }
  return sharedRepository;
};

export const resetDecisionMemoryRepository = () => {
  sharedRepository = new InMemoryDecisionMemoryRepository();
  return sharedRepository;
};
