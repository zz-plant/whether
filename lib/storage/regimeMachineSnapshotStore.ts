import type { RegimeMachineSnapshot } from "../regimeStateMachine";

import type { KvNamespace as KvNamespaceLike } from "../runtime/kv";

const SNAPSHOT_KV_KEY = "regime:machine-snapshot";
const SNAPSHOT_CACHE_TTL_MS = 5000;

let inMemorySnapshot: RegimeMachineSnapshot | null = null;
let lastLoadedAt = 0;

const getKvBinding = (): KvNamespaceLike | null => {
  const binding = (globalThis as { WHETHER_DURABLE_KV?: KvNamespaceLike }).WHETHER_DURABLE_KV;
  if (!binding || typeof binding.get !== "function" || typeof binding.put !== "function") {
    return null;
  }
  return binding;
};

export const loadRegimeMachineSnapshot = async (): Promise<RegimeMachineSnapshot | null> => {
  const now = Date.now();
  if (inMemorySnapshot && now - lastLoadedAt < SNAPSHOT_CACHE_TTL_MS) return inMemorySnapshot;
  const kv = getKvBinding();
  if (!kv) return inMemorySnapshot;
  try {
    const raw = await kv.get(SNAPSHOT_KV_KEY);
    if (!raw) return null;
    inMemorySnapshot = JSON.parse(raw) as RegimeMachineSnapshot;
    lastLoadedAt = now;
    return inMemorySnapshot;
  } catch {
    return inMemorySnapshot;
  }
};

export const saveRegimeMachineSnapshot = async (snapshot: RegimeMachineSnapshot): Promise<void> => {
  inMemorySnapshot = snapshot;
  lastLoadedAt = Date.now();
  const kv = getKvBinding();
  if (!kv) return;
  try {
    await kv.put(SNAPSHOT_KV_KEY, JSON.stringify(snapshot));
  } catch {
    // non-fatal — in-memory snapshot is still current for this request
  }
};
