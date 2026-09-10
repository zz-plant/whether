import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { buildPageMetrics, type TelemetryRow } from "../lib/seo/pageMetricsFromTelemetry";

/*
 * Pull content-measurement telemetry out of Analytics Engine and write the
 * metrics file `bun run seo:refresh-queue` reads.
 *
 * `bun run seo:weekly-runbook` calls `refreshPageMetrics()` before generating the
 * queue, so the weekly path needs no separate step. `bun run seo:page-metrics`
 * runs the same function on its own.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an API token with Account Analytics: Read.
 * Absent credentials are reported as "skipped", not as success and not as an
 * error: the queue already reads a missing metrics file as "no metrics yet",
 * which is the state this repo has been in all along.
 *
 * Every other unhappy path refuses to write. A metrics file built from zero rows
 * would mark every page "low traffic, underperforming" and queue the whole site;
 * one built from a truncated window would undercount entrances and silently
 * demote traffic tiers. Both are worse than no file, because both look like data.
 *
 * Events are read as JSON blobs and aggregated in `buildPageMetrics` rather than
 * with SQL aggregates. `writeAnalytics` stores the whole event in blob2, and the
 * Analytics Engine SQL dialect has no JSON extraction to reach inside it — so the
 * grouping has to happen here regardless. That also means this works against
 * telemetry already collected, with no change to the write path.
 */

const DEFAULT_DATASET = "whether_telemetry";
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_ROW_LIMIT = 100_000;

const OUTPUT_DIR = join(process.cwd(), "artifacts", "seo-refresh");
const OUTPUT_PATH = join(OUTPUT_DIR, "page-metrics.json");

/* Validated rather than asserted: this is a remote API response, and an error
   body or a schema change would otherwise be counted as "zero events". */
const sqlResponseSchema = z.object({
  data: z.array(z.object({ blob2: z.string().nullable().optional() })).optional(),
});

export type RefreshPageMetricsResult =
  | { status: "written"; pages: number; eventsRead: number; eventsParsed: number; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export const refreshPageMetrics = async (): Promise<RefreshPageMetricsResult> => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const dataset = process.env.WHETHER_TELEMETRY_DATASET ?? DEFAULT_DATASET;
  const windowDays = Number(process.env.WHETHER_METRICS_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);
  const rowLimit = Number(process.env.WHETHER_METRICS_ROW_LIMIT ?? DEFAULT_ROW_LIMIT);

  if (!accountId || !apiToken) {
    return {
      status: "skipped",
      reason: "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are not both set "
        + "(the token needs Account Analytics: Read).",
    };
  }

  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return { status: "failed", reason: "WHETHER_METRICS_WINDOW_DAYS must be a positive number." };
  }
  if (!Number.isFinite(rowLimit) || rowLimit <= 0) {
    return { status: "failed", reason: "WHETHER_METRICS_ROW_LIMIT must be a positive number." };
  }

  const sql = [
    "SELECT blob2",
    `FROM ${dataset}`,
    "WHERE index1 = 'content-measurement'",
    `  AND timestamp > now() - INTERVAL '${Math.trunc(windowDays)}' DAY`,
    `LIMIT ${Math.trunc(rowLimit)}`,
  ].join("\n");

  let rows: TelemetryRow[];
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "text/plain" },
        body: sql,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        status: "failed",
        reason: `Analytics Engine query failed: HTTP ${response.status} ${detail.slice(0, 400)}`,
      };
    }

    const parsed = sqlResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return {
        status: "failed",
        reason: `Analytics Engine returned an unexpected payload: ${parsed.error.message.slice(0, 400)}`,
      };
    }
    rows = parsed.data.data ?? [];
  } catch (error) {
    return {
      status: "failed",
      reason: `Analytics Engine query threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  /*
   * A full result set is indistinguishable from a truncated one once it reaches
   * `buildPageMetrics`, which counts whatever it is handed. Hitting the cap
   * means the window held more events than were returned, so entrances are
   * undercounted by an unknown amount — enough to demote a page's traffic tier
   * and shift the conversion target it is judged against. Refuse rather than
   * publish a number that is confidently wrong.
   */
  if (rows.length >= Math.trunc(rowLimit)) {
    return {
      status: "failed",
      reason: `query returned ${rows.length} rows, at or above the ${Math.trunc(rowLimit)} row cap, `
        + "so the window is truncated and entrance counts would be undercounted. "
        + "Raise WHETHER_METRICS_ROW_LIMIT or narrow WHETHER_METRICS_WINDOW_DAYS.",
    };
  }

  const metrics = buildPageMetrics(rows, { windowDays });
  const pageCount = Object.keys(metrics.byUrl).length;

  if (pageCount === 0) {
    return {
      status: "failed",
      reason: `no content-measurement events in the last ${windowDays} days (${rows.length} rows read). `
        + "Refusing to write an empty metrics file — the refresh queue reads a missing file as "
        + "'no metrics yet', and an empty one as 'every page has zero traffic'.",
    };
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

  return {
    status: "written",
    pages: pageCount,
    eventsRead: metrics.eventsRead,
    eventsParsed: metrics.eventsParsed,
    path: OUTPUT_PATH,
  };
};

export const describeRefreshPageMetrics = (result: RefreshPageMetricsResult): string => {
  if (result.status === "written") {
    return `seo:page-metrics — ${result.pages} pages from ${result.eventsParsed}/${result.eventsRead} events → ${result.path}`;
  }
  if (result.status === "skipped") {
    return `seo:page-metrics — skipped: ${result.reason}`;
  }
  return `seo:page-metrics — ${result.reason}`;
};

if (import.meta.main) {
  const result = await refreshPageMetrics();
  const message = describeRefreshPageMetrics(result);

  if (result.status === "written") {
    console.log(message);
  } else {
    // Skipped counts as a failure for the standalone command: someone who ran
    // this directly asked for metrics, and got none.
    console.error(message);
    process.exitCode = 1;
  }
}
