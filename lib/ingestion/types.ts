export type SignalFamily = "rates" | "spreads" | "labor" | "inflation" | "credit" | "volatility";

export type SignalKey =
  | "TREASURY_1M"
  | "TREASURY_3M"
  | "TREASURY_2Y"
  | "TREASURY_10Y"
  | "BBB_CREDIT_SPREAD"
  | "HY_CREDIT_SPREAD"
  | "CPI_YOY"
  | "UNEMPLOYMENT_RATE"
  | "CHICAGO_FCI"
  | "VIX_INDEX";

export type SignalUnit = "%" | "bps" | "index";

export interface SignalSourceMetadata {
  label: string;
  url: string;
  seriesId?: string;
}

export interface SignalEntitySnapshot {
  signalKey: SignalKey;
  family: SignalFamily;
  value: number | null;
  unit: SignalUnit;
  source: SignalSourceMetadata;
  observedAt: string;
  ingestedAt: string;
  quality: "observed" | "estimated" | "fallback";
  confidence: "high" | "medium" | "low";
}

export interface SignalCadenceControl {
  pollWindowMs: number;
  staleAfterMs: number;
}

export interface MaterializedSignalState {
  snapshot: SignalEntitySnapshot;
  staleness: {
    status: "fresh" | "stale";
    ageMs: number;
    staleAfterMs: number;
  };
  cadence: SignalCadenceControl;
}

export interface MaterializedHistoryPoint {
  date: string;
  value: number | null;
}

export interface MaterializedSignalReadModel {
  asOf: string;
  signals: Partial<Record<SignalKey, MaterializedSignalState>>;
  /** Trailing 92-day history per signal key, built at write time so the read path
   * never needs to scan raw snapshot keys. Absent on legacy materialized records;
   * callers should fall back to scanning snapshots when missing. */
  recentHistory?: Partial<Record<SignalKey, MaterializedHistoryPoint[]>>;
}
