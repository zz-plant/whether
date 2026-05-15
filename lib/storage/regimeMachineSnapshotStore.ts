import type { RegimeMachineSnapshot } from "../report/regimeStateMachine";

type KvNamespaceLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

const SNAPSHOT_KV_KEY = "regime:machine-snapshot";

let inMemorySnapshot: RegimeMachineSnapshot | null = null;

const getKvBinding = (): KvNamespaceLike | null => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV;
  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function") {
    return null;
  }
  return binding;
};

export const loadRegimeMachineSnapshot = async (): Promise<RegimeMachineSnapshot | null> => {
  if (inMemorySnapshot) return inMemorySnapshot;
  const kv = getKvBinding();
  if (!kv) return inMemorySnapshot;
  try {
    const raw = await kv.get(SNAPSHOT_KV_KEY);
    if (!raw) return null;
    inMemorySnapshot = JSON.parse(raw) as RegimeMachineSnapshot;
    return inMemorySnapshot;
  } catch {
    return inMemorySnapshot;
  }
};

export const saveRegimeMachineSnapshot = async (snapshot: RegimeMachineSnapshot): Promise<void> => {
  inMemorySnapshot = snapshot;
  const kv = getKvBinding();
  if (!kv) return;
  try {
    await kv.put(SNAPSHOT_KV_KEY, JSON.stringify(snapshot));
  } catch {
    // non-fatal — in-memory snapshot is still current for this request
  }
};

export const resetRegimeMachineSnapshot = () => {
  inMemorySnapshot = null;
};
