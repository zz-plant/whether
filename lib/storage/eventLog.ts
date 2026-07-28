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
      this.inMemoryEntries.push({ index: nextIndex, item: cloned });
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
    const limit = options?.limit ?? 64;
    const threshold = parseCursor(cursor);

    if (!this.kv) {
      const matching = this.inMemoryEntries.filter(
        (entry) => entry.index > threshold && (!options?.filter || options.filter(entry.item)),
      );
      const limited = matching.slice(0, limit);
      const items = limited.map((entry) => clone(entry.item)).reverse();
      const nextCursor =
        limited.length > 0 ? `${limited[limited.length - 1].index}` : cursor;
      return { items, nextCursor };
    }

    const collected: Array<{ index: number; item: T }> = [];
    let listCursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: this.prefix, cursor: listCursor, limit: 1000 });
      const matchingKeys: Array<{ keyName: string; index: number }> = [];

      for (const key of page.keys) {
        const index = this.parseIndex(key.name);
        if (index !== null && index > threshold) {
          matchingKeys.push({ keyName: key.name, index });
        }
      }

      const raws = await Promise.all(matchingKeys.map(({ keyName }) => this.kv!.get(keyName)));
      for (let i = 0; i < matchingKeys.length; i++) {
        const raw = raws[i];
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as T;
          if (options?.filter && !options.filter(parsed)) continue;
          collected.push({ index: matchingKeys[i].index, item: parsed });
        } catch {
          /* Skip invalid JSON */
        }
      }

      listCursor = page.cursor;
      if (page.list_complete) break;
    } while (listCursor);

    collected.sort((a, b) => a.index - b.index);
    const limited = collected.slice(0, limit);
    const items = limited.map((entry) => clone(entry.item)).reverse();
    const nextCursor =
      limited.length > 0 ? `${limited[limited.length - 1].index}` : cursor;

    return { items, nextCursor };
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
