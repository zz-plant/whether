import type { SignalCadenceControl, SignalKey } from "./types";

const HOUR_MS = 60 * 60 * 1000;

export const SIGNAL_CADENCE: Record<SignalKey, SignalCadenceControl> = {
  TREASURY_1M: { pollWindowMs: 2 * HOUR_MS, staleAfterMs: 26 * HOUR_MS },
  TREASURY_3M: { pollWindowMs: 2 * HOUR_MS, staleAfterMs: 26 * HOUR_MS },
  TREASURY_2Y: { pollWindowMs: 2 * HOUR_MS, staleAfterMs: 26 * HOUR_MS },
  TREASURY_10Y: { pollWindowMs: 2 * HOUR_MS, staleAfterMs: 26 * HOUR_MS },
  BBB_CREDIT_SPREAD: { pollWindowMs: 4 * HOUR_MS, staleAfterMs: 36 * HOUR_MS },
  HY_CREDIT_SPREAD: { pollWindowMs: 4 * HOUR_MS, staleAfterMs: 36 * HOUR_MS },
  CPI_YOY: { pollWindowMs: 24 * HOUR_MS, staleAfterMs: 45 * 24 * HOUR_MS },
  UNEMPLOYMENT_RATE: { pollWindowMs: 24 * HOUR_MS, staleAfterMs: 45 * 24 * HOUR_MS },
  CHICAGO_FCI: { pollWindowMs: 12 * HOUR_MS, staleAfterMs: 7 * 24 * HOUR_MS },
  VIX_INDEX: { pollWindowMs: 2 * HOUR_MS, staleAfterMs: 30 * HOUR_MS },
};

/**
 * How long the coordinator's materialized model may go without an ingest before /api/health
 * calls it stale. The alarm runs hourly and rates are due every 2h, so the model's `asOf`
 * should never be more than about 3h old; 6h is three missed refreshes. This is the check
 * that catches a stopped alarm: the reader-facing source rows follow the cron's daily
 * snapshot and cannot see it (2026-10-13, #1575).
 */
export const INGEST_MODEL_STALE_AFTER_MS = 6 * HOUR_MS;

export type IngestModelFreshness = "ok" | "stale" | "unknown";

export const classifyIngestModelFreshness = (asOf: string | null | undefined, now: Date): IngestModelFreshness => {
  if (!asOf) return "unknown";
  const asOfMs = Date.parse(asOf);
  if (Number.isNaN(asOfMs)) return "unknown";
  return now.getTime() - asOfMs > INGEST_MODEL_STALE_AFTER_MS ? "stale" : "ok";
};
