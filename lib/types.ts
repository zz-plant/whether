/**
 * Shared data shapes for the Regime Station flow.
 * Keeps Treasury source metadata explicit for traceable outputs.
 */
export interface TreasuryYields {
  oneMonth: number | null;
  threeMonth?: number | null;
  twoYear: number | null;
  tenYear: number | null;
}

export interface TreasuryMetadata {
  source: string;
  record_date: string;
  fetched_at: string;
  isLive: boolean;
  fallback_at?: string | null;
  fallback_reason?: string | null;
}

export interface TreasuryData extends TreasuryMetadata {
  yields: TreasuryYields;
}

export interface SensorReading {
  id: "BASE_RATE" | "CURVE_SLOPE";
  label: string;
  value: number | null;
  unit: "%" | "bps";
  explanation: string;
  source: string;
  record_date: string;
  fetched_at: string;
  isLive: boolean;
}
