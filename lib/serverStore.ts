import type { DecisionMemoryEntry } from "./decisionMemory";
import type { AlertDeliveryEvent, RegimeAlertEvent } from "./signalOps";

export type ServerStoreSnapshot = {
  regimeAlerts: RegimeAlertEvent[];
  alertDeliveries: AlertDeliveryEvent[];
  decisionMemory: DecisionMemoryEntry[];
};

export type ServerStoreAdapter = {
  kind: "memory" | "file";
  load: () => Promise<ServerStoreSnapshot>;
  save: (nextSnapshot: ServerStoreSnapshot) => Promise<void>;
};

const createEmptySnapshot = (): ServerStoreSnapshot => ({
  regimeAlerts: [],
  alertDeliveries: [],
  decisionMemory: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRegimeAlertEvent = (value: unknown): value is RegimeAlertEvent =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.createdAt === "string" &&
  isRecord(value.payload);

const isAlertDeliveryEvent = (value: unknown): value is AlertDeliveryEvent =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.alertId === "string" &&
  typeof value.channel === "string" &&
  typeof value.deliveredAt === "string" &&
  typeof value.status === "string" &&
  typeof value.summary === "string";

const isDecisionMemoryEntry = (value: unknown): value is DecisionMemoryEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.createdAt === "string" &&
  isRecord(value.context) &&
  typeof value.context.clientId === "string" &&
  typeof value.context.recordDate === "string";

const readCollection = <T>(value: unknown, guard: (entry: unknown) => entry is T): T[] =>
  Array.isArray(value) ? value.filter(guard) : [];

const toSnapshot = (value: unknown): ServerStoreSnapshot => {
  if (!isRecord(value)) {
    return createEmptySnapshot();
  }

  return {
    regimeAlerts: readCollection(value.regimeAlerts, isRegimeAlertEvent),
    alertDeliveries: readCollection(value.alertDeliveries, isAlertDeliveryEvent),
    decisionMemory: readCollection(value.decisionMemory, isDecisionMemoryEntry),
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __whetherServerStoreMemorySnapshot: ServerStoreSnapshot | undefined;
}

const getMemorySnapshot = () => globalThis.__whetherServerStoreMemorySnapshot ?? createEmptySnapshot();

const saveMemorySnapshot = (nextSnapshot: ServerStoreSnapshot) => {
  globalThis.__whetherServerStoreMemorySnapshot = nextSnapshot;
};

export const createMemoryServerStoreAdapter = (): ServerStoreAdapter => ({
  kind: "memory",
  async load() {
    return getMemorySnapshot();
  },
  async save(nextSnapshot) {
    saveMemorySnapshot(nextSnapshot);
  },
});

const getDefaultStoreFilePath = () =>
  process.env.WHETHER_SERVER_STORE_FILE?.trim() || "/tmp/whether-server-store.json";

const loadNodeModules = async () => {
  try {
    const [fs, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    return { fs, path };
  } catch {
    return null;
  }
};

export const createFileServerStoreAdapter = async (
  storeFilePath = getDefaultStoreFilePath()
): Promise<ServerStoreAdapter | null> => {
  const modules = await loadNodeModules();
  if (!modules) {
    return null;
  }

  const { fs, path } = modules;

  const readSnapshot = async (): Promise<ServerStoreSnapshot> => {
    try {
      const raw = await fs.readFile(storeFilePath, "utf8");
      return toSnapshot(JSON.parse(raw));
    } catch {
      return createEmptySnapshot();
    }
  };

  return {
    kind: "file",
    load: readSnapshot,
    async save(nextSnapshot) {
      const output = `${JSON.stringify(nextSnapshot, null, 2)}\n`;
      const directory = path.dirname(storeFilePath);
      const tempPath = `${storeFilePath}.tmp`;

      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(tempPath, output, "utf8");
      await fs.rename(tempPath, storeFilePath);
    },
  };
};

let adapterOverride: ServerStoreAdapter | null = null;
let adapterPromise: Promise<ServerStoreAdapter> | null = null;
let updateQueue: Promise<void> = Promise.resolve();

const resolveAdapter = async (): Promise<ServerStoreAdapter> => {
  if (adapterOverride) {
    return adapterOverride;
  }

  const requestedBackend = process.env.WHETHER_SERVER_STORE_BACKEND?.trim().toLowerCase();

  if (requestedBackend === "memory") {
    return createMemoryServerStoreAdapter();
  }

  const fileAdapter = await createFileServerStoreAdapter();
  if (fileAdapter) {
    return fileAdapter;
  }

  return createMemoryServerStoreAdapter();
};

const getAdapter = async (): Promise<ServerStoreAdapter> => {
  if (!adapterPromise) {
    adapterPromise = resolveAdapter();
  }
  return adapterPromise;
};

const runQueuedUpdate = <T>(fn: () => Promise<T>): Promise<T> => {
  const task = updateQueue.then(fn, fn);
  updateQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
};

export const serverStore = {
  async getSnapshot() {
    const adapter = await getAdapter();
    return adapter.load();
  },
  async replace(nextSnapshot: ServerStoreSnapshot) {
    const adapter = await getAdapter();
    await runQueuedUpdate(async () => {
      await adapter.save(nextSnapshot);
    });
    return nextSnapshot;
  },
  async mutate<T>(
    mutateFn: (snapshot: ServerStoreSnapshot) => Promise<{ snapshot: ServerStoreSnapshot; result: T }> | { snapshot: ServerStoreSnapshot; result: T }
  ): Promise<{ snapshot: ServerStoreSnapshot; result: T }> {
    const adapter = await getAdapter();

    return runQueuedUpdate(async () => {
      const current = await adapter.load();
      const next = await mutateFn(current);
      await adapter.save(next.snapshot);
      return next;
    });
  },
  async getAdapterKind() {
    const adapter = await getAdapter();
    return adapter.kind;
  },
};

export const setServerStoreAdapterForTests = (adapter: ServerStoreAdapter | null) => {
  adapterOverride = adapter;
  adapterPromise = null;
};

export const resetServerStoreForTests = () => {
  adapterOverride = null;
  adapterPromise = null;
  updateQueue = Promise.resolve();
  saveMemorySnapshot(createEmptySnapshot());
};
