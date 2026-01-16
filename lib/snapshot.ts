/**
 * Snapshot loader for offline mode.
 * Keeps fallback data in a typed wrapper for reuse in API and UI.
 */
import snapshotFallback from "../data/snapshot_fallback.json";
import type { TreasuryData } from "./types";

export const snapshotData = snapshotFallback as TreasuryData;
