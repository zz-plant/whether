import { parseDecisionMemoryEntry, type DecisionMemoryEntry } from "../decisionMemory";
import { parseDecisionFollowUpRecord, type DecisionFollowUpRecord } from "../decisionFollowUp";
import { getWhetherKv, parseStoredJson, type KvNamespace } from "../runtime/kv";
import { selectStoreByBinding } from "../runtime/storeSelection";

type Cursor = string | null;

interface DecisionMemoryRepository {
  append(entry: DecisionMemoryEntry): Promise<void>;
  list(options: { cursor?: Cursor; limit?: number; clientId: string }): Promise<{ entries: DecisionMemoryEntry[]; nextCursor: Cursor }>;
  /** The entry this client already recorded under the same idempotency key, if any. */
  findByWriteId(clientId: string, writeId: string): Promise<DecisionMemoryEntry | null>;
  /** The review responses against a client's entries, newest first. */
  appendFollowUp(record: DecisionFollowUpRecord): Promise<void>;
  listFollowUps(options: { clientId: string }): Promise<{ followUps: DecisionFollowUpRecord[] }>;
  backendStatus(): "durable" | "local-fallback";
}

const DEFAULT_LIMIT = 64;

export class InMemoryDecisionMemoryRepository implements DecisionMemoryRepository {
  private readonly entriesByClient = new Map<string, DecisionMemoryEntry[]>();
  private readonly followUpsByClient = new Map<string, DecisionFollowUpRecord[]>();

  async append(entry: DecisionMemoryEntry): Promise<void> {
    const clientId = entry.context.clientId;
    const current = this.entriesByClient.get(clientId) ?? [];
    current.push(structuredClone(entry));
    this.entriesByClient.set(clientId, current);
  }

  async findByWriteId(clientId: string, writeId: string): Promise<DecisionMemoryEntry | null> {
    const current = this.entriesByClient.get(clientId) ?? [];
    return current.find((entry) => entry.writeId === writeId) ?? null;
  }

  async appendFollowUp(record: DecisionFollowUpRecord): Promise<void> {
    const clientId = record.context.clientId;
    const current = this.followUpsByClient.get(clientId) ?? [];
    current.push(structuredClone(record));
    this.followUpsByClient.set(clientId, current);
  }

  async listFollowUps(options: { clientId: string }): Promise<{ followUps: DecisionFollowUpRecord[] }> {
    const list = this.followUpsByClient.get(options.clientId) ?? [];
    const followUps = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { followUps };
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

  private toFollowUpKey(clientId: string, createdAt: string, id: string): string {
    const timestamp = new Date(createdAt).getTime();
    return `df:${clientId}:${timestamp}_${id}`;
  }

  async append(entry: DecisionMemoryEntry): Promise<void> {
    const key = this.toKey(entry.context.clientId, entry.createdAt, entry.id);
    await this.kv.put(key, JSON.stringify(entry));
  }

  async findByWriteId(clientId: string, writeId: string): Promise<DecisionMemoryEntry | null> {
    /* The idempotency window is the offline replay window — recent writes. Scan
       the client's entries (newest first) and stop at the first match; a stale
       write from months ago is not a live duplicate. */
    const prefix = `dm:${clientId}:`;
    const listResult = await this.kv.list({ prefix, limit: 200 });
    for (const key of listResult.keys) {
      const raw = await this.kv.get(key.name, { cacheTtl: 60 });
      const entry = parseStoredJson(raw, parseDecisionMemoryEntry);
      if (entry?.writeId === writeId) return entry;
    }
    return null;
  }

  async appendFollowUp(record: DecisionFollowUpRecord): Promise<void> {
    const key = this.toFollowUpKey(record.context.clientId, record.createdAt, record.id);
    await this.kv.put(key, JSON.stringify(record));
  }

  async listFollowUps(options: { clientId: string }): Promise<{ followUps: DecisionFollowUpRecord[] }> {
    const prefix = `df:${options.clientId}:`;

    const listResult = await this.kv.list({
      prefix,
      limit: 1_000,
    });

    const followUps: DecisionFollowUpRecord[] = [];
    const keys = listResult.keys.map((k) => k.name);

    if (keys.length > 0) {
      const rawEntries = await Promise.all(
        keys.map((k) => this.kv.get(k, { cacheTtl: 60 })),
      );

      for (const raw of rawEntries) {
        const record = parseStoredJson(raw, parseDecisionFollowUpRecord);
        if (record) followUps.push(record);
      }
    }

    // Sort newest first, as the view reads the latest response per entry.
    followUps.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { followUps };
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
