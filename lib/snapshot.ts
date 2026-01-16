/**
 * Snapshot loader for offline mode.
 * Keeps fallback data in a typed wrapper for reuse in API and UI.
 */
import snapshotFallback from "../data/snapshot_fallback.json";
import type { TreasuryData } from "./types";
import { TreasuryDataSchema } from "./treasurySchema";

const parsedSnapshot = TreasuryDataSchema.safeParse(snapshotFallback);

if (!parsedSnapshot.success) {
  throw new Error("Snapshot fallback data failed validation.");
}

export const snapshotData: TreasuryData = parsedSnapshot.data;
