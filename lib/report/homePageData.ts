import { unstable_cache } from "next/cache";
import { ENGINE_VERSION } from "../regimeEngineCore";
import { getBuildCommit, getDeployedVersion } from "../runtime/versionMetadata";
import { REPORT_DATA_CACHE_TAG } from "./cacheTags";
import { loadReportDataSafe } from "./reportData";
import type { HomePageSearchParams } from "./homeMetadata";

type HomePageReportResult = Awaited<ReturnType<typeof loadReportDataSafe>>;
type CachedHomePageReportResult = Extract<HomePageReportResult, { ok: true }>;

type HomePageDataDependencies = {
  loadReportDataSafe: typeof loadReportDataSafe;
  unstableCache: typeof unstable_cache;
  resolveDeployVersion: () => string;
};

type HomePageFallbackState = Extract<HomePageReportResult, { ok: false }>;

const HOMEPAGE_REPORT_REVALIDATE_SECONDS = 300;
// Only historical selection changes the canonical report inputs. Every other
// key (stage and runway in homePageAssembler, cadence on the page) applies after
// the read; including one here fragments the shared five-minute data cache
// without changing the value it stores.
const HOMEPAGE_DATA_PARAM_KEYS = new Set(["month", "year"]);

/**
 * Names the code that wrote a cache entry. The data cache is KV-backed in production, so its
 * entries outlive the deploy that wrote them; keying on the Worker version means a deploy that
 * changes `ReportData`'s shape never reads an entry the old code saved (PR #1563 added a required
 * field and a pre-merge entry crashed the trust strip). Off Cloudflare the binding is absent, so
 * the engine calibration plus the commit the bundle was built from stand in.
 */
const resolveDeployVersion = () =>
  getDeployedVersion()?.id ?? `${ENGINE_VERSION}:${getBuildCommit() ?? "unbuilt"}`;

const defaultDependencies: HomePageDataDependencies = {
  loadReportDataSafe,
  unstableCache: unstable_cache,
  resolveDeployVersion,
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
    .filter((entry): entry is [string, string] => HOMEPAGE_DATA_PARAM_KEYS.has(entry[0]) && typeof entry[1] === "string" && entry[1].trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value.trim()] as const);

  if (normalizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(normalizedEntries) as HomePageSearchParams;
};

export const buildHomePageCacheKey = (searchParams?: HomePageSearchParams) =>
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

  // Lives for the lifetime of the isolate and is keyed by search params, so it is bounded
  // explicitly: an unbounded Map here is a slow memory leak driven by arbitrary query strings.
  const FALLBACK_STATE_MAX_ENTRIES = 64;
  const fallbackStateByCacheKey = new Map<string, { state: HomePageFallbackState; timestamp: number }>();

  const rememberFallbackState = (cacheKey: string, state: HomePageFallbackState) => {
    fallbackStateByCacheKey.set(cacheKey, { state, timestamp: Date.now() });
    while (fallbackStateByCacheKey.size > FALLBACK_STATE_MAX_ENTRIES) {
      const oldestKey = fallbackStateByCacheKey.keys().next().value;
      if (oldestKey === undefined) break;
      fallbackStateByCacheKey.delete(oldestKey);
    }
  };

  const loadCachedHomePageReportResult = resolvedDependencies.unstableCache(
    // `_deployVersion` is unused by the loader: it is an argument only so it lands in the key,
    // since keyParts are fixed when this function is created.
    async (cacheKey: string, _deployVersion: string): Promise<CachedHomePageReportResult> => {
      const reportResult = await resolvedDependencies.loadReportDataSafe(
        parseHomePageCacheKey(cacheKey),
        { route: "/" },
        { includeHistoricalLiveComparison: false },
      );

      if (!reportResult.ok) {
        rememberFallbackState(cacheKey, reportResult);
        throw new HomePageFallbackResultError(reportResult.fallback, reportResult.error);
      }

      fallbackStateByCacheKey.delete(cacheKey);
      return reportResult;
    },
    ["home-page-report-data"],
    { revalidate: HOMEPAGE_REPORT_REVALIDATE_SECONDS, tags: [REPORT_DATA_CACHE_TAG] },
  );

  return async (searchParams?: HomePageSearchParams): Promise<HomePageReportResult> => {
    const cacheKey = buildHomePageCacheKey(searchParams);

    try {
      const cachedResult = await loadCachedHomePageReportResult(
        cacheKey,
        resolvedDependencies.resolveDeployVersion(),
      );
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
