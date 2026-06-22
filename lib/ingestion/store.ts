import { promises as fs } from "node:fs";
import path from "node:path";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";
import { buildLineage, type DurableLineage } from "../storage/lineage";

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
}

type KvListResult = { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string };
type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>;
};

const SNAPSHOT_PREFIX = "ingestion:snapshot:";
const SNAPSHOT_INDEX_KEY = "ingestion:snapshot:index";
const MATERIALIZED_KEY = "ingestion:materialized:latest";

const getKvBinding = () => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike; INGESTION_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV
    ?? (globalThis as { INGESTION_KV?: KvNamespaceLike }).INGESTION_KV;
  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function" || typeof binding.list !== "function") {
    return null;
  }
  return binding;
};

export class KvIngestionStore implements IngestionStore {
  private readonly fallback: FileIngestionStore | null;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly kv: KvNamespaceLike) {
    const isEdge = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === "string";
    this.fallback = isEdge ? null : new FileIngestionStore();
  }

  async appendSnapshots(snapshots: SignalEntitySnapshot[]) {
    if (snapshots.length === 0) {
      return;
    }

    this.queue = this.queue.then(async () => {
      for (const snapshot of snapshots) {
        const currentRaw = await this.kv.get(SNAPSHOT_INDEX_KEY);
        const current = currentRaw ? Number.parseInt(currentRaw, 10) : -1;
        const next = Number.isNaN(current) ? 0 : current + 1;
        const record: StoredSnapshotRecord = {
          ...buildLineage("source-ingested-at"),
          sequence: next,
          snapshot,
        };
        await this.kv.put(`${SNAPSHOT_PREFIX}${String(next).padStart(12, "0")}`, JSON.stringify(record));
        await this.kv.put(SNAPSHOT_INDEX_KEY, String(next));
      }
    }).catch(() => undefined);

    await this.queue;
  }

  async readSnapshots(options?: { cursor?: string | null; limit?: number }) {
    await this.queue;
    const threshold = options?.cursor ? Number.parseInt(options.cursor, 10) : -1;
    const limit = options?.limit ?? Number.MAX_SAFE_INTEGER;

    const collected: StoredSnapshotRecord[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.kv.list({ prefix: SNAPSHOT_PREFIX, cursor, limit: 1000 });
      for (const key of page.keys) {
        const sequence = Number.parseInt(key.name.slice(SNAPSHOT_PREFIX.length), 10);
        if (Number.isNaN(sequence) || sequence <= threshold) {
          continue;
        }
        const raw = await this.kv.get(key.name);
        if (!raw) {
          continue;
        }
        collected.push(JSON.parse(raw) as StoredSnapshotRecord);
      }
      cursor = page.cursor;
      if (page.list_complete) break;
    } while (cursor);

    if (collected.length === 0) {
      return this.fallback?.readSnapshots(options) ?? [];
    }

    return collected.sort((a, b) => a.sequence - b.sequence).slice(0, limit).map((entry) => entry.snapshot);
  }

  async readLatestMaterialized() {
    await this.queue;
    const raw = await this.kv.get(MATERIALIZED_KEY);
    if (!raw) {
      return this.fallback?.readLatestMaterialized() ?? null;
    }
    return (JSON.parse(raw) as StoredMaterializedRecord).model;
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    this.queue = this.queue.then(async () => {
      const stored: StoredMaterializedRecord = {
        ...buildLineage("request-received-at"),
        model,
      };
      await this.kv.put(MATERIALIZED_KEY, JSON.stringify(stored));
    }).catch(() => undefined);

    await this.queue;
  }

  backendStatus() {
    return "durable" as const;
  }
}

let defaultStore: IngestionStore | null = null;

export const getDefaultIngestionStore = () => {
  if (!defaultStore) {
    const kv = getKvBinding();
    defaultStore = kv ? new KvIngestionStore(kv) : new FileIngestionStore();
  }
  return defaultStore;
};
