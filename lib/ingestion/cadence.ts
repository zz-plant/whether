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
