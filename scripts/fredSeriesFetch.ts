/**
 * Fetch one FRED series in full for a script: `fetch()` first, and when that
 * fails for any reason, `curl` — which has succeeded where Bun's fetch has not
 * on some networks — with one warning naming the failure. The Worker has no
 * curl; it uses `fetchFredSeries` alone and retries the Workflow step instead.
 */
import { execFileSync } from "node:child_process";
import { FRED_BASE_URL } from "../lib/fred";
import { fetchFredSeries, parseSeries, type SeriesDataset } from "../lib/summary/regimeArchiveContext";

export const fetchSeries = async (seriesId: string): Promise<SeriesDataset> => {
  try {
    return await fetchFredSeries(seriesId);
  } catch (error) {
    const csv = execFileSync("curl", ["-fsSL", `${FRED_BASE_URL}?id=${encodeURIComponent(seriesId)}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (error instanceof Error) {
      console.warn(`fetch() failed for ${seriesId}; retried with curl fallback (${error.message}).`);
    }
    return parseSeries(csv);
  }
};
