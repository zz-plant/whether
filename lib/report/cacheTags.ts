/**
 * Cache tag linking the ingest pipeline to report-derived caches. Ingest completing is
 * the only event that changes canonical report inputs, so it revalidates this tag
 * instead of waiting out time-based revalidate windows.
 */
export const REPORT_DATA_CACHE_TAG = "report-data";

/**
 * Revalidate report caches after a successful ingest. Dynamic import + swallow:
 * executeIngest also runs under bun tests and node scripts where next/cache either
 * does not resolve or has no request store — staleness falls back to the existing
 * time-based revalidation there, so failure is non-fatal by design.
 */
export const revalidateReportDataCaches = async () => {
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(REPORT_DATA_CACHE_TAG, "max");
    return true;
  } catch {
    return false;
  }
};
