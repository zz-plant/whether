import { z } from "zod";
import type { RegimeMachineSnapshot } from "../regimeStateMachine";

import { getWhetherKv, parseStoredJson } from "../runtime/kv";

const SNAPSHOT_KV_KEY = "regime:machine-snapshot";
const SNAPSHOT_CACHE_TTL_MS = 5000;

const regimeKeySchema = z.enum(["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"]);

/* The shape `saveRegimeMachineSnapshot` has written since the store existed. A record that does
   not match is treated as the unparseable one always was: the copy this isolate already holds
   stands, rather than a half-read state the machine would advance from. */
const regimeMachineSnapshotSchema: z.ZodType<RegimeMachineSnapshot> = z.object({
  committedState: regimeKeySchema,
  pendingState: regimeKeySchema.nullable(),
  pendingCount: z.number(),
  lastSignals: z.object({ tightness: z.number(), riskAppetite: z.number() }).optional(),
});

let inMemorySnapshot: RegimeMachineSnapshot | null = null;
let lastLoadedAt = 0;

export const loadRegimeMachineSnapshot = async (): Promise<RegimeMachineSnapshot | null> => {
  const now = Date.now();
  if (inMemorySnapshot && now - lastLoadedAt < SNAPSHOT_CACHE_TTL_MS) return inMemorySnapshot;
  const kv = getWhetherKv();
  if (!kv) return inMemorySnapshot;
  try {
    const raw = await kv.get(SNAPSHOT_KV_KEY);
    if (!raw) return null;
    const stored = parseStoredJson(raw, regimeMachineSnapshotSchema);
    if (!stored) return inMemorySnapshot;
    inMemorySnapshot = stored;
    lastLoadedAt = now;
    return inMemorySnapshot;
  } catch {
    return inMemorySnapshot;
  }
};

export const saveRegimeMachineSnapshot = async (snapshot: RegimeMachineSnapshot): Promise<void> => {
  inMemorySnapshot = snapshot;
  lastLoadedAt = Date.now();
  const kv = getWhetherKv();
  if (!kv) return;
  try {
    await kv.put(SNAPSHOT_KV_KEY, JSON.stringify(snapshot));
  } catch {
    // non-fatal — in-memory snapshot is still current for this request
  }
};
