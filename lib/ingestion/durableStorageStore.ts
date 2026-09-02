/**
 * An `IngestionStore` over a Durable Object's storage. This is what the `IngestCoordinator`
 * object runs against; nothing here imports Workers types, so a Map-backed fake can stand in
 * for `ctx.storage` under bun tests.
 *
 * Why an object instead of KV: KV is eventually consistent, so `KvIngestionStore`'s refresh
 * lock is documented as best-effort ("two isolates racing the same expired lock can both
 * win"). A Durable Object executes one request at a time against strongly consistent storage,
 * so check-and-set here is exactly that, and an alarm on the object can refresh due families
 * on its own schedule instead of on whichever request happened to notice they were due.
 */
import type { IngestionStore, StoredMaterializedRecord, StoredSnapshotRecord } from "./store";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";
import { buildLineage } from "../storage/lineage";

/**
 * The subset of DurableObjectStorage this store uses, typed against `unknown` so reads are
 * narrowed here rather than asserted. The real storage's generic methods satisfy it as-is.
 */
export interface CoordinatorStorage {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  list(options?: { prefix?: string; start?: string; limit?: number }): Promise<Map<string, unknown>>;
  transaction?<T>(closure: (txn: CoordinatorStorage) => Promise<T>): Promise<T>;
}

const SNAPSHOT_PREFIX = "snapshot:";
const SNAPSHOT_INDEX_KEY = "snapshot-index";
const MATERIALIZED_KEY = "materialized";
const REFRESH_LOCK_KEY = "refresh-lock";

/** Same window as the KV store: the newest slice is all any reader needs (see RECENT_HISTORY_WINDOW_DAYS). */
const DEFAULT_SNAPSHOT_READ_LIMIT = 1500;

/** Zero-padded so lexical order (which `list` uses) is numeric order. */
const snapshotKey = (sequence: number) => `${SNAPSHOT_PREFIX}${String(sequence).padStart(12, "0")}`;

type RefreshLock = { expiresAt: number };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/* Stored values were written by this store, so these checks establish the shape rather than
   validate every field; anything else in a slot is ignored rather than served. */
const isStoredSnapshotRecord = (value: unknown): value is StoredSnapshotRecord =>
  isRecord(value) && typeof value.sequence === "number" && isRecord(value.snapshot) && typeof value.snapshot.signalKey === "string";

const isStoredMaterializedRecord = (value: unknown): value is StoredMaterializedRecord =>
  isRecord(value) && isRecord(value.model) && isRecord(value.model.signals);

const isRefreshLock = (value: unknown): value is RefreshLock => isRecord(value) && typeof value.expiresAt === "number";

const readIndex = async (storage: CoordinatorStorage) => {
  const value = await storage.get(SNAPSHOT_INDEX_KEY);
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
};

export class DurableStorageIngestionStore implements IngestionStore {
  constructor(
    private readonly storage: CoordinatorStorage,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async appendSnapshots(snapshots: SignalEntitySnapshot[]) {
    if (snapshots.length === 0) {
      return;
    }

    const write = async (storage: CoordinatorStorage) => {
      let sequence = await readIndex(storage);
      for (const snapshot of snapshots) {
        sequence += 1;
        const record: StoredSnapshotRecord = { ...buildLineage("source-ingested-at"), sequence, snapshot };
        await storage.put(snapshotKey(sequence), record);
      }
      await storage.put(SNAPSHOT_INDEX_KEY, sequence);
    };

    // One transaction: the index never points past a record that was not written.
    if (this.storage.transaction) {
      await this.storage.transaction(write);
    } else {
      await write(this.storage);
    }
  }

  async readSnapshots(options?: { cursor?: string | null; limit?: number }) {
    const latest = await readIndex(this.storage);
    if (latest < 0) {
      return [];
    }

    const threshold = options?.cursor ? Number.parseInt(options.cursor, 10) : -1;
    const after = Number.isNaN(threshold) ? -1 : threshold;

    // An explicit limit is a forward page from the cursor; without one, read the newest
    // window so the cost stays flat as the object fills.
    const from = options?.limit === undefined
      ? Math.max(after + 1, latest - DEFAULT_SNAPSHOT_READ_LIMIT + 1, 0)
      : Math.max(after + 1, 0);
    const count = options?.limit === undefined ? latest - from + 1 : Math.min(options.limit, latest - from + 1);
    if (count <= 0) {
      return [];
    }

    const page = await this.storage.list({ prefix: SNAPSHOT_PREFIX, start: snapshotKey(from), limit: count });
    return [...page.values()]
      .filter(isStoredSnapshotRecord)
      .sort((left, right) => left.sequence - right.sequence)
      .map((record) => record.snapshot);
  }

  async readLatestMaterialized(): Promise<MaterializedSignalReadModel | null> {
    const stored = await this.storage.get(MATERIALIZED_KEY);
    return isStoredMaterializedRecord(stored) ? stored.model : null;
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    const stored: StoredMaterializedRecord = { ...buildLineage("request-received-at"), model };
    await this.storage.put(MATERIALIZED_KEY, stored);
  }

  backendStatus() {
    return "durable" as const;
  }

  /**
   * Real mutual exclusion: the object runs one request at a time, so the read and the write
   * below cannot interleave with another isolate's. The TTL still bounds a holder that dies.
   */
  async acquireRefreshLock(ttlSeconds: number) {
    const now = this.now();
    const held = await this.storage.get(REFRESH_LOCK_KEY);
    if (isRefreshLock(held) && held.expiresAt > now) {
      return false;
    }
    const lock: RefreshLock = { expiresAt: now + Math.max(1, ttlSeconds) * 1000 };
    await this.storage.put(REFRESH_LOCK_KEY, lock);
    return true;
  }

  async latestSnapshotSequence() {
    return readIndex(this.storage);
  }
}
