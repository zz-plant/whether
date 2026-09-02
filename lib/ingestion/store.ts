import { promises as fs } from "node:fs";
import path from "node:path";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";
import { buildLineage, type DurableLineage } from "../storage/lineage";
import { getWhetherKv, type KvNamespace } from "../runtime/kv";
import { IngestCoordinatorStore, coordinatorStubFor, resolveIngestCoordinatorNamespace } from "./coordinatorStore";

export type StoredSnapshotRecord = DurableLineage & {
  sequence: number;
  snapshot: SignalEntitySnapshot;
};

export type StoredMaterializedRecord = DurableLineage & {
  model: MaterializedSignalReadModel;
};

export interface IngestionStore {
  appendSnapshots(snapshots: SignalEntitySnapshot[]): Promise<void>;
  readSnapshots(options?: { cursor?: string | null; limit?: number }): Promise<SignalEntitySnapshot[]>;
  readLatestMaterialized(): Promise<MaterializedSignalReadModel | null>;
  writeLatestMaterialized(model: MaterializedSignalReadModel): Promise<void>;
  backendStatus?(): "durable" | "local-fallback";
  /**
   * Best-effort cross-isolate dedup for background refreshes. Returns false when another
   * isolate holds a live lock. KV is not transactional, so two isolates racing the same
   * expired lock can both win — acceptable, because ingestion writes are idempotent
   * merges; the lock only bounds redundant upstream fetch volume.
   */
  acquireRefreshLock?(ttlSeconds: number): Promise<boolean>;
}

const DEFAULT_DIR = path.join(process.cwd(), ".cache", "ingestion");

export class FileIngestionStore implements IngestionStore {
  constructor(
    private readonly baseDir = DEFAULT_DIR,
    private readonly snapshotsFile = path.join(baseDir, "snapshots.ndjson"),
    private readonly materializedFile = path.join(baseDir, "latest.materialized.json"),
  ) {}

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async appendSnapshots(snapshots: SignalEntitySnapshot[]) {
    if (snapshots.length === 0) {
      return;
    }
    await this.ensureDir();
    const payload = `${snapshots
      .map((snapshot, index) =>
        JSON.stringify({ ...buildLineage("source-ingested-at"), sequence: Date.now() + index, snapshot } satisfies StoredSnapshotRecord),
      )
      .join("\n")}\n`;
    await fs.appendFile(this.snapshotsFile, payload, "utf8");
  }

  async readSnapshots(options?: { cursor?: string | null; limit?: number }) {
    try {
      const content = await fs.readFile(this.snapshotsFile, "utf8");
      const parsed = content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StoredSnapshotRecord)
        .sort((left, right) => left.sequence - right.sequence);

      const start = options?.cursor ? Number.parseInt(options.cursor, 10) + 1 : 0;
      const limit = options?.limit ?? Number.MAX_SAFE_INTEGER;
      return parsed.slice(start, start + limit).map((entry) => entry.snapshot);
    } catch {
      return [];
    }
  }

  async readLatestMaterialized() {
    try {
      const content = await fs.readFile(this.materializedFile, "utf8");
      const stored = JSON.parse(content) as StoredMaterializedRecord | MaterializedSignalReadModel;
      return "model" in stored ? stored.model : stored;
    } catch {
      return null;
    }
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    await this.ensureDir();
    const stored: StoredMaterializedRecord = {
      ...buildLineage("request-received-at"),
      model,
    };
    await fs.writeFile(this.materializedFile, JSON.stringify(stored, null, 2), "utf8");
  }

  backendStatus() {
    return "local-fallback" as const;
  }

  async acquireRefreshLock() {
    /* Single-process local dev: the per-instance queue already serializes writes. */
    return true;
  }
}

type KvNamespaceLike = KvNamespace;

const SNAPSHOT_PREFIX = "ingestion:snapshot:";
const SNAPSHOT_INDEX_KEY = "ingestion:snapshot:index";
const MATERIALIZED_KEY = "ingestion:materialized:latest";
const REFRESH_LOCK_KEY = "ingestion:refresh-lock";

/**
 * Snapshot keys accumulate forever (one per signal per ingestion run, ~10/day), so an
 * unbounded read grows without limit and eventually stalls every request that touches
 * report data. Consumers only ever need the latest value per signal plus the trailing
 * 92-day history window (see RECENT_HISTORY_WINDOW_DAYS in ./materialized), so cap
 * unpaginated reads to the newest slice and let older records age out of the read path.
 */
const DEFAULT_SNAPSHOT_READ_LIMIT = 1500;

/** KV round-trips dominate this read; issue them in parallel batches rather than serially. */
const SNAPSHOT_READ_CONCURRENCY = 64;

const formatSnapshotKey = (sequence: number) => `${SNAPSHOT_PREFIX}${String(sequence).padStart(12, "0")}`;

const getKvBinding = () => {
  const binding = getWhetherKv("INGESTION_KV");
  if (!binding || typeof binding.list !== "function") {
    return null;
  }
  return binding;
};

/**
 * KV is the only source this store reads. It used to fall back to the FileIngestionStore
 * when a key was missing, which made a KV-bound read depend on whatever an earlier process
 * in the same directory had ingested — in the deploy gate, a rates-only model left under
 * .cache/ingestion by a test without a binding, which sent the next read down the
 * background-refresh path and cost it a lock write. Workers never had a filesystem to fall
 * back to, so production behavior is unchanged: an empty KV is a cold store, by design.
 */
export class KvIngestionStore implements IngestionStore {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly kv: KvNamespaceLike) {}

  async appendSnapshots(snapshots: SignalEntitySnapshot[]) {
    if (snapshots.length === 0) {
      return;
    }

    const nextQueue = this.queue.then(async () => {
      const currentRaw = await this.kv.get(SNAPSHOT_INDEX_KEY);
      let current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
      if (Number.isNaN(current)) {
        current = -1;
      }

      for (const snapshot of snapshots) {
        current++;
        const record: StoredSnapshotRecord = {
          ...buildLineage("source-ingested-at"),
          sequence: current,
          snapshot,
        };
        /* Snapshots outside the 92-day materialized history window are never read
         * (reads already cap to the newest slice), so let KV retire them server-side
         * instead of accumulating forever. 180d keeps double the read window. */
        await this.kv.put(formatSnapshotKey(current), JSON.stringify(record), { expirationTtl: 180 * 24 * 60 * 60 });
      }
      await this.kv.put(SNAPSHOT_INDEX_KEY, String(current));
    });

    this.queue = nextQueue.catch(() => undefined);
    await nextQueue;
  }

  /**
   * Sequence numbers are dense and monotonic, so the index key alone describes the whole
   * keyspace. Listing is only needed when the index is missing (older namespaces).
   */
  private async resolveSequences(threshold: number): Promise<number[]> {
    const rawLatest = await this.kv.get(SNAPSHOT_INDEX_KEY);
    const latest = rawLatest === null ? Number.NaN : Number.parseInt(rawLatest, 10);

    if (Number.isFinite(latest)) {
      const sequences: number[] = [];
      for (let sequence = Math.max(threshold + 1, 0); sequence <= latest; sequence++) {
        sequences.push(sequence);
      }
      return sequences;
    }

    const sequences: number[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: SNAPSHOT_PREFIX, cursor, limit: 1000 });
      for (const key of page.keys) {
        const sequence = Number.parseInt(key.name.slice(SNAPSHOT_PREFIX.length), 10);
        if (!Number.isNaN(sequence) && sequence > threshold) {
          sequences.push(sequence);
        }
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    return sequences.sort((left, right) => left - right);
  }

  private async readSequences(sequences: number[]): Promise<StoredSnapshotRecord[]> {
    const collected: StoredSnapshotRecord[] = [];

    for (let offset = 0; offset < sequences.length; offset += SNAPSHOT_READ_CONCURRENCY) {
      const batch = sequences.slice(offset, offset + SNAPSHOT_READ_CONCURRENCY);
      /* Snapshot records are immutable once written; edge-cache them so repeated
       * legacy-path scans of the same window stop paying origin reads. */
      const raws = await Promise.all(batch.map((sequence) => this.kv.get(formatSnapshotKey(sequence), { cacheTtl: 3600 })));

      for (const raw of raws) {
        if (!raw) {
          continue;
        }
        try {
          collected.push(JSON.parse(raw) as StoredSnapshotRecord);
        } catch {
          // Skip unparseable records rather than failing the whole read.
        }
      }
    }

    return collected;
  }

  async readSnapshots(options?: { cursor?: string | null; limit?: number }) {
    await this.queue;
    const threshold = options?.cursor ? Number.parseInt(options.cursor, 10) : -1;
    const sequences = await this.resolveSequences(threshold);

    // An explicit limit is a forward page from the cursor; without one, read the newest
    // window so the cost stays flat as the namespace grows.
    const selected = options?.limit === undefined
      ? sequences.slice(-DEFAULT_SNAPSHOT_READ_LIMIT)
      : sequences.slice(0, options.limit);

    const collected = await this.readSequences(selected);

    return collected.sort((a, b) => a.sequence - b.sequence).map((entry) => entry.snapshot);
  }

  async readLatestMaterialized() {
    await this.queue;
    const raw = await this.kv.get(MATERIALIZED_KEY);
    if (!raw) {
      return null;
    }
    return (JSON.parse(raw) as StoredMaterializedRecord).model;
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    const nextQueue = this.queue.then(async () => {
      const stored: StoredMaterializedRecord = {
        ...buildLineage("request-received-at"),
        model,
      };
      await this.kv.put(MATERIALIZED_KEY, JSON.stringify(stored));
    });

    this.queue = nextQueue.catch(() => undefined);
    await nextQueue;
  }

  backendStatus() {
    return "durable" as const;
  }

  async acquireRefreshLock(ttlSeconds: number) {
    const held = await this.kv.get(REFRESH_LOCK_KEY);
    if (held !== null) {
      return false;
    }
    // KV enforces a 60s minimum expirationTtl.
    await this.kv.put(REFRESH_LOCK_KEY, new Date().toISOString(), { expirationTtl: Math.max(60, ttlSeconds) });
    return true;
  }
}

let defaultStore: { store: IngestionStore; backend: unknown } | null = null;

/**
 * Backend selection, in order: the ingest coordinator Durable Object when this deployment
 * has opted in and the binding is installed (see lib/ingestion/coordinatorStore.ts), then
 * KV, then the local file store. Re-checked on every call rather than memoized for good,
 * so a binding that appears after an earlier fallback takes over (AGENTS.md invariant).
 */
export const getDefaultIngestionStore = () => {
  const coordinator = resolveIngestCoordinatorNamespace();
  const kvBinding = coordinator ? null : getKvBinding();
  const backend: unknown = coordinator ?? kvBinding;
  if (defaultStore && defaultStore.backend === backend) {
    return defaultStore.store;
  }
  const store = coordinator
    ? new IngestCoordinatorStore(coordinatorStubFor(coordinator))
    : kvBinding
      ? new KvIngestionStore(kvBinding)
      : new FileIngestionStore();
  defaultStore = { store, backend };
  return store;
};
