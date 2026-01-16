/**
 * Treasury normalization helpers for mapping API payloads into Regime Station data shapes.
 * Keeps source metadata and freshness explicit for traceable outputs.
 */
import type { NormalizedTreasuryRow, TreasuryData, TreasuryYields } from "./types";

const parseNumber = (value: unknown): number | null => {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeTreasuryRow = (
  row: Record<string, unknown>,
  metadata: { fetched_at: string; source: string; isLive: boolean }
): TreasuryData => {
  const yields: TreasuryYields = {
    oneMonth: parseNumber(row.bc_1month ?? row.one_month ?? row.dly_1mo),
    threeMonth: parseNumber(row.bc_3month ?? row.three_month ?? row.dly_3mo),
    twoYear: parseNumber(row.bc_2year ?? row.two_year ?? row.dly_2yr),
    tenYear: parseNumber(row.bc_10year ?? row.ten_year ?? row.dly_10yr),
  };

  return {
    source: metadata.source,
    record_date: String(row.record_date ?? ""),
    fetched_at: metadata.fetched_at,
    isLive: metadata.isLive,
    yields,
  };
};

export const normalizeTreasuryResponse = (
  payload: { data?: Record<string, unknown>[] },
  metadata: { fetched_at: string; source: string; isLive: boolean }
): NormalizedTreasuryRow | null => {
  const firstRow = payload.data?.[0];
  if (!firstRow) {
    return null;
  }

  const normalized = normalizeTreasuryRow(firstRow, metadata);

  return {
    record_date: normalized.record_date,
    fetched_at: normalized.fetched_at,
    source: normalized.source,
    yields: normalized.yields,
  };
};
