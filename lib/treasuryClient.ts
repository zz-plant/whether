/**
 * Treasury client for fetching yield curve data with explicit metadata and fallback support.
 * Keeps network access isolated behind a small interface for future Cloudflare migration.
 */
import type { TreasuryData } from "./types";
import { buildHistoricalQuery } from "./timeMachine";
import { normalizeTreasuryResponse } from "./treasuryNormalizer";

export const TREASURY_ENDPOINT =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/daily_treasury_yield_curve";

export interface TreasuryFetchOptions {
  fetcher?: typeof fetch;
  endpoint?: string;
  snapshotFallback?: TreasuryData;
  asOf?: string;
}

const buildTreasuryUrl = (endpoint: string, asOf?: string) => {
  const params = new URLSearchParams({
    sort: "-record_date",
    "page[size]": "1",
  });

  if (asOf) {
    params.set("filter", buildHistoricalQuery(asOf));
  }

  return `${endpoint}?${params.toString()}`;
};

export const fetchTreasuryData = async (
  options: TreasuryFetchOptions = {}
): Promise<TreasuryData> => {
  const fetcher = options.fetcher ?? fetch;
  const endpoint = options.endpoint ?? TREASURY_ENDPOINT;
  const fetched_at = new Date().toISOString();
  const requestUrl = buildTreasuryUrl(endpoint, options.asOf);

  try {
    const response = await fetcher(requestUrl);
    if (!response.ok) {
      throw new Error(`Treasury API error: ${response.status}`);
    }

    const payload = (await response.json()) as { data?: Record<string, unknown>[] };
    const normalized = normalizeTreasuryResponse(payload, {
      fetched_at,
      source: requestUrl,
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
