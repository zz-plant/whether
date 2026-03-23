import { unstable_cache } from "next/cache";
import { loadReportDataSafe } from "./reportData";
import type { HomePageSearchParams } from "./homeMetadata";

type HomePageReportResult = Awaited<ReturnType<typeof loadReportDataSafe>>;
type CachedHomePageReportResult =
  | Extract<HomePageReportResult, { ok: true }>
  | Omit<Extract<HomePageReportResult, { ok: false }>, "error">;

const HOMEPAGE_REPORT_REVALIDATE_SECONDS = 900;

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

const loadCachedHomePageReportResult = unstable_cache(
  async (cacheKey: string): Promise<CachedHomePageReportResult> => {
    const reportResult = await loadReportDataSafe(
      parseHomePageCacheKey(cacheKey),
      { route: "/" },
      { includeHistoricalLiveComparison: false },
    );

    if (reportResult.ok) {
      return reportResult;
    }

    return {
      ok: false,
      fallback: reportResult.fallback,
    };
  },
  ["home-page-report-data"],
  { revalidate: HOMEPAGE_REPORT_REVALIDATE_SECONDS },
);

export const loadHomePageReportData = async (
  searchParams?: HomePageSearchParams,
): Promise<HomePageReportResult> => {
  const cachedResult = await loadCachedHomePageReportResult(buildHomePageCacheKey(searchParams));

  if (cachedResult.ok) {
    return cachedResult;
  }

  return {
    ...cachedResult,
    error: new Error("Home page report data fell back to cached data."),
  };
};
