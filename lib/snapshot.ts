/**
 * Snapshot loader for offline mode.
 * Keeps fallback data in a typed wrapper for reuse in API and UI.
 */
import snapshotFallback from "../data/snapshot_fallback.json";
import type { TreasuryData } from "./types";
import { TreasuryDataSchema } from "./treasury/treasurySchema";

const buildValidationFallback = (reason: string): TreasuryData => {
  const timestamp = new Date().toISOString();
  return {
    source: "Snapshot validation fallback",
    record_date: timestamp,
    fetched_at: timestamp,
    isLive: false,
    fallback_reason: reason,
    fallback_at: timestamp,
    yields: {
      oneMonth: null,
      threeMonth: null,
      twoYear: null,
      tenYear: null,
    },
  };
};

export const parseSnapshotData = (input: unknown): TreasuryData => {
  const parsedSnapshot = TreasuryDataSchema.safeParse(input);

  if (parsedSnapshot.success) {
    return parsedSnapshot.data;
  }

  const fallback = buildValidationFallback("Snapshot fallback data failed validation.");
  console.error(fallback.fallback_reason, parsedSnapshot.error.format());
  return fallback;
};

export const snapshotData: TreasuryData = parseSnapshotData(snapshotFallback);
