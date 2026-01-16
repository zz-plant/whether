/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "./types";
import { normalizeTreasuryResponse } from "./treasuryNormalizer";

export const TREASURY_ENDPOINT =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve";

export interface TreasuryFetchOptions {
  fetcher?: typeof fetch;
  endpoint?: string;
  snapshotFallback?: TreasuryData;
}

export const fetchTreasuryData = async (
  options: TreasuryFetchOptions = {}
): Promise<TreasuryData> => {
  const fetcher = options.fetcher ?? fetch;
  const endpoint = options.endpoint ?? TREASURY_ENDPOINT;
  const fetched_at = new Date().toISOString();

  try {
    const response = await fetcher(`${endpoint}?sort=-record_date&page[size]=1`);
    if (!response.ok) {
      throw new Error(`Treasury API error: ${response.status}`);
    }

    const payload = (await response.json()) as { data?: Record<string, unknown>[] };
    const normalized = normalizeTreasuryResponse(payload, {
      fetched_at,
      source: endpoint,
      isLive: true,
    });

    if (!normalized) {
      throw new Error("Treasury API returned no data.");
    }

    return normalized;
  } catch (error) {
    if (options.snapshotFallback) {
      return {
        ...options.snapshotFallback,
        fetched_at,
        isLive: false,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown Treasury fetch error";
    throw new Error(message);
  }
};
