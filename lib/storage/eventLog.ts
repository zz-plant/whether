type Cursor = string | null;

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };
export type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const parseCursor = (cursor: Cursor): number => {
  if (!cursor) return -1;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isNaN(parsed) ? -1 : parsed;
};

const DEFAULT_LIST_LIMIT = 64;

/**
 * Hard ceiling on how many entries a single list() may read. Topics grow without bound,
 * so reading the whole log puts every caller on a cost curve that ends in a stalled
 * request (and blows the Workers subrequest budget long before that).
 */
const MAX_SCAN_ENTRIES = 1000;

/** KV round-trips dominate; batch them instead of bursting a whole page at once. */
const READ_CONCURRENCY = 64;

export class DurableEventLog<T> {
  private readonly prefix: string;
  private readonly indexKey: string;
  private readonly inMemoryEntries: Array<{ index: number; item: T }> = [];
  private persistQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly topic: string,
    private readonly kv: KvNamespaceLike | null,
  ) {
    this.prefix = `${topic}:`;
    this.indexKey = `meta:${topic}:index`;
  }

  private toKey(index: number): string {
    return `${this.prefix}${String(index).padStart(12, "0")}`;
  }

  private parseIndex(key: string): number | null {
    if (!key.startsWith(this.prefix)) return null;
    const parsed = Number.parseInt(key.slice(this.prefix.length), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async append(item: T): Promise<number> {
    const cloned = clone(item);
    let assignedIndex = this.inMemoryEntries.length;

    if (!this.kv) {
      if (this.inMemoryEntries.length > 0) {
        assignedIndex = this.inMemoryEntries[this.inMemoryEntries.length - 1].index + 1;
      }
      this.inMemoryEntries.push({ index: assignedIndex, item: cloned });
      return assignedIndex;
    }

    const nextQueue = this.persistQueue.then(async () => {
      const currentRaw = await this.kv!.get(this.indexKey);
      const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
      const nextIndex = Number.isNaN(current) ? 0 : current + 1;
      assignedIndex = nextIndex;
      await this.kv!.put(this.toKey(nextIndex), JSON.stringify(cloned));
      await this.kv!.put(this.indexKey, String(nextIndex));
      // Deliberately not mirrored into inMemoryEntries: reads go to KV in this mode, so
      // retaining every appended item would grow the isolate's heap without ever being read.
    });

    this.persistQueue = nextQueue.catch(() => undefined);
    await nextQueue;
    return assignedIndex;
  }

  async list(options?: {
    cursor?: Cursor;
    limit?: number;
    filter?: (item: T) => boolean;
  }): Promise<{ items: T[]; nextCursor: Cursor }> {
    await this.persistQueue;
    const cursor = options?.cursor ?? null;
    const limit = options?.limit ?? DEFAULT_LIST_LIMIT;
    const threshold = parseCursor(cursor);

    if (!this.kv) {
      const matching = this.inMemoryEntries.filter(
        (entry) => entry.index > threshold && (!options?.filter || options.filter(entry.item)),
      );
      const limited = cursor ? matching.slice(0, limit) : matching.slice(-limit);
      const items = limited.map((entry) => clone(entry.item)).reverse();
      const nextCursor =
        limited.length > 0 ? `${limited[limited.length - 1].index}` : cursor;
      return { items, nextCursor };
    }

    const candidates = await this.resolveIndexes(threshold);

    // Without a cursor the caller wants current state, so scan the newest slice. With a
    // cursor they are following the tail forward, so scan from the cursor onward. Either
    // way the window is capped so cost does not scale with total log length.
    const scanned = cursor
      ? candidates.slice(0, MAX_SCAN_ENTRIES)
      : candidates.slice(-MAX_SCAN_ENTRIES);

    const collected = await this.readIndexes(scanned, options?.filter);

    collected.sort((a, b) => a.index - b.index);
    const limited = cursor ? collected.slice(0, limit) : collected.slice(-limit);
    const items = limited.map((entry) => clone(entry.item)).reverse();
    const nextCursor =
      limited.length > 0 ? `${limited[limited.length - 1].index}` : cursor;

    return { items, nextCursor };
  }

  /**
   * The index key records the highest assigned index, and indexes are dense, so the whole
   * keyspace is derivable without listing. Listing is the fallback for logs written before
   * the index key existed.
   */
  private async resolveIndexes(threshold: number): Promise<number[]> {
    const rawLatest = await this.kv!.get(this.indexKey);
    const latest = rawLatest === null ? Number.NaN : Number.parseInt(rawLatest, 10);

    if (Number.isFinite(latest)) {
      const indexes: number[] = [];
      for (let index = Math.max(threshold + 1, 0); index <= latest; index++) {
        indexes.push(index);
      }
      return indexes;
    }

    const indexes: number[] = [];
    let listCursor: string | undefined;

    do {
      const page = await this.kv!.list({ prefix: this.prefix, cursor: listCursor, limit: 1000 });
      for (const key of page.keys) {
        const index = this.parseIndex(key.name);
        if (index !== null && index > threshold) {
          indexes.push(index);
        }
      }
      listCursor = page.cursor;
      if (page.list_complete) break;
    } while (listCursor);

    return indexes.sort((left, right) => left - right);
  }

  private async readIndexes(
    indexes: number[],
    filter?: (item: T) => boolean,
  ): Promise<Array<{ index: number; item: T }>> {
    const collected: Array<{ index: number; item: T }> = [];

    for (let offset = 0; offset < indexes.length; offset += READ_CONCURRENCY) {
      const batch = indexes.slice(offset, offset + READ_CONCURRENCY);
      const raws = await Promise.all(batch.map((index) => this.kv!.get(this.toKey(index))));

      for (let i = 0; i < batch.length; i++) {
        const raw = raws[i];
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as T;
          if (filter && !filter(parsed)) continue;
          collected.push({ index: batch[i], item: parsed });
        } catch {
          /* Skip invalid JSON */
        }
      }
    }

    return collected;
  }

  async latest(): Promise<T | null> {
    await this.persistQueue;
    if (!this.kv) {
      const last = this.inMemoryEntries[this.inMemoryEntries.length - 1];
      return last ? clone(last.item) : null;
    }

    const currentRaw = await this.kv.get(this.indexKey);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
    if (current < 0 || Number.isNaN(current)) return null;

    const raw = await this.kv.get(this.toKey(current));
    return raw ? clone(JSON.parse(raw) as T) : null;
  }
}
