import { parseDecisionMemoryEntry, type DecisionMemoryEntry } from "../decisionMemory";
import { getWhetherKv, parseStoredJson, type KvNamespace } from "../runtime/kv";
import { selectStoreByBinding } from "../runtime/storeSelection";

type Cursor = string | null;

interface DecisionMemoryRepository {
  append(entry: DecisionMemoryEntry): Promise<void>;
  list(options: { cursor?: Cursor; limit?: number; clientId: string }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }>;
  backendStatus(): "durable" | "local-fallback";
}

const DEFAULT_LIMIT = 64;

export class InMemoryDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly entriesByClient = new Map<string, DecisionMemoryEntry[]>();

  async append(entry: DecisionMemoryEntry): Promise<void> {
    const clientId = entry.context.clientId;
    const current = this.entriesByClient.get(clientId) ?? [];
    const cloned: DecisionMemoryEntry = typeof structuredClone === "function"
      ? structuredClone(entry)
      : JSON.parse(JSON.stringify(entry));
    current.push(cloned);
    this.entriesByClient.set(clientId, current);
  }

  async list(options: {
    cursor?: Cursor;
    limit?: number;
    clientId: string;
  }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }> {
    const list = this.entriesByClient.get(options.clientId) ?? [];
    const limit = options.limit ?? DEFAULT_LIMIT;

    // Sort newest first
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = sorted.findIndex((e) => e.id === options.cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const page = sorted.slice(startIndex, startIndex + limit);
    const nextCursor =
      page.length === limit && startIndex + limit < sorted.length
        ? page[page.length - 1].id
        : null;

    return {
      entries: page,
      nextCursor,
    };
  }

  backendStatus(): "durable" | "local-fallback" {
    return "local-fallback";
  }

  clear(): void {
    this.entriesByClient.clear();
  }
}

export class KvDecisionMemoryRepository implements DecisionMemoryRepository {
  constructor(private readonly kv: KvNamespace) {}

  private toKey(clientId: string, createdAt: string, id: string): string {
    const timestamp = new Date(createdAt).getTime();
    return `dm:${clientId}:${timestamp}_${id}`;
  }

  async append(entry: DecisionMemoryEntry): Promise<void> {
    const key = this.toKey(entry.context.clientId, entry.createdAt, entry.id);
    await this.kv.put(key, JSON.stringify(entry));
  }

  async list(options: {
    cursor?: Cursor;
    limit?: number;
    clientId: string;
  }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }> {
    const limit = options.limit ?? DEFAULT_LIMIT;
    const prefix = `dm:${options.clientId}:`;

    const listResult = await this.kv.list({
      prefix,
      cursor: options.cursor ?? undefined,
      limit,
    });

    const entries: DecisionMemoryEntry[] = [];
    const keys = listResult.keys.map((k) => k.name);

    if (keys.length > 0) {
      const rawEntries = await Promise.all(
        keys.map((k) => this.kv.get(k, { cacheTtl: 60 })),
      );

      for (const raw of rawEntries) {
        const entry = parseStoredJson(raw, parseDecisionMemoryEntry);
        if (entry) entries.push(entry);
      }
    }

    // Sort newest first
    entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      entries,
      nextCursor: listResult.list_complete ? null : listResult.cursor ?? null,
    };
  }

  backendStatus(): "durable" | "local-fallback" {
    return "durable";
  }
}

const repositorySelection = selectStoreByBinding(
  getWhetherKv,
  (kv): DecisionMemoryRepository => (kv ? new KvDecisionMemoryRepository(kv) : new InMemoryDecisionMemoryRepository()),
);

export const getDecisionMemoryRepository = (): DecisionMemoryRepository => repositorySelection.get();

/** Test hook: an empty in-memory repository, held until the next reset whatever the binding does. */
export const resetDecisionMemoryRepository = (): DecisionMemoryRepository =>
  repositorySelection.reset(new InMemoryDecisionMemoryRepository());
