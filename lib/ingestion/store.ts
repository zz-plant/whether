import { promises as fs } from "node:fs";
import path from "node:path";
import type { MaterializedSignalReadModel, SignalEntitySnapshot } from "./types";

export interface IngestionStore {
  appendSnapshots(snapshots: SignalEntitySnapshot[]): Promise<void>;
  readSnapshots(): Promise<SignalEntitySnapshot[]>;
  readLatestMaterialized(): Promise<MaterializedSignalReadModel | null>;
  writeLatestMaterialized(model: MaterializedSignalReadModel): Promise<void>;
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
    const payload = `${snapshots.map((snapshot) => JSON.stringify(snapshot)).join("\n")}\n`;
    await fs.appendFile(this.snapshotsFile, payload, "utf8");
  }

  async readSnapshots() {
    try {
      const content = await fs.readFile(this.snapshotsFile, "utf8");
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as SignalEntitySnapshot);
    } catch {
      return [];
    }
  }

  async readLatestMaterialized() {
    try {
      const content = await fs.readFile(this.materializedFile, "utf8");
      return JSON.parse(content) as MaterializedSignalReadModel;
    } catch {
      return null;
    }
  }

  async writeLatestMaterialized(model: MaterializedSignalReadModel) {
    await this.ensureDir();
    await fs.writeFile(this.materializedFile, JSON.stringify(model, null, 2), "utf8");
  }
}

let defaultStore: IngestionStore | null = null;

export const getDefaultIngestionStore = () => {
  if (!defaultStore) {
    defaultStore = new FileIngestionStore();
  }
  return defaultStore;
};
