import { unstable_cache } from "next/cache";
import { loadReportDataSafe } from "./reportData";
import type { HomePageSearchParams } from "./homeMetadata";

type HomePageReportResult = Awaited<ReturnType<typeof loadReportDataSafe>>;
type CachedHomePageReportResult = Extract<HomePageReportResult, { ok: true }>;

type HomePageDataDependencies = {
  loadReportDataSafe: typeof loadReportDataSafe;
  unstableCache: typeof unstable_cache;
};

type HomePageFallbackState = Extract<HomePageReportResult, { ok: false }>;

const HOMEPAGE_REPORT_REVALIDATE_SECONDS = 300;

const defaultDependencies: HomePageDataDependencies = {
  loadReportDataSafe,
  unstableCache: unstable_cache,
};

class HomePageFallbackResultError extends Error {
  fallback: Extract<HomePageReportResult, { ok: false }>['fallback'];
  originalError: Error;

  constructor(fallback: Extract<HomePageReportResult, { ok: false }>['fallback'], originalError: Error) {
    super("Home page report data fell back to snapshot data.", { cause: originalError });
    this.name = "HomePageFallbackResultError";
    this.fallback = fallback;
    this.originalError = originalError;
  }
}

const normalizeHomePageSearchParams = (searchParams?: HomePageSearchParams) => {
  if (!searchParams) {
    return undefined;
  }

  const normalizedEntries = Object.entries(searchParams)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value.trim()] as const);

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries) as HomePageSearchParams;
};

const buildHomePageCacheKey = (searchParams?: HomePageSearchParams) =>
  JSON.stringify(normalizeHomePageSearchParams(searchParams) ?? null);

const parseHomePageCacheKey = (cacheKey: string): HomePageSearchParams | undefined => {
  const parsed = JSON.parse(cacheKey) as unknown;

  if (!parsed || typeof parsed !== "object") {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).filter(([, value]) => typeof value === "string"),
  ) as HomePageSearchParams;
};

export const createHomePageReportDataLoader = (
  dependencies: Partial<HomePageDataDependencies> = {},
) => {
  const resolvedDependencies = {
    ...defaultDependencies,
    ...dependencies,
  } satisfies HomePageDataDependencies;

  const fallbackStateByCacheKey = new Map<string, { state: HomePageFallbackState; timestamp: number }>();

  const loadCachedHomePageReportResult = resolvedDependencies.unstableCache(
    async (cacheKey: string): Promise<CachedHomePageReportResult> => {
      const reportResult = await resolvedDependencies.loadReportDataSafe(
        parseHomePageCacheKey(cacheKey),
        { route: "/" },
        { includeHistoricalLiveComparison: false },
      );

      if (!reportResult.ok) {
        fallbackStateByCacheKey.set(cacheKey, { state: reportResult, timestamp: Date.now() });
        throw new HomePageFallbackResultError(reportResult.fallback, reportResult.error);
      }

      fallbackStateByCacheKey.delete(cacheKey);
      return reportResult;
    },
    ["home-page-report-data"],
    { revalidate: HOMEPAGE_REPORT_REVALIDATE_SECONDS },
  );

  return async (searchParams?: HomePageSearchParams): Promise<HomePageReportResult> => {
    const cacheKey = buildHomePageCacheKey(searchParams);

    try {
      const cachedResult = await loadCachedHomePageReportResult(cacheKey);
      const fallbackEntry = fallbackStateByCacheKey.get(cacheKey);

      if (fallbackEntry) {
        if (Date.now() - fallbackEntry.timestamp > 30000) {
          fallbackStateByCacheKey.delete(cacheKey);
        } else {
          return fallbackEntry.state;
        }
      }

      return cachedResult;
    } catch (error) {
      if (error instanceof HomePageFallbackResultError) {
        return {
          ok: false,
          fallback: error.fallback,
          error: error.originalError,
        };
      }

      throw error;
    }
  };
};

export const loadHomePageReportData = createHomePageReportDataLoader();
