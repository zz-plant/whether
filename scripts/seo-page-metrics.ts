import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { buildPageMetrics, type TelemetryRow } from "../lib/seo/pageMetricsFromTelemetry";
import {
  buildStreamQuery,
  queryAnalyticsEngine,
  queryWindowPaged,
  resolveAnalyticsReadConfig,
} from "../lib/telemetry/analyticsQuery";

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
 * would mark every page "low traffic, underperforming" and queue the whole site,
 * which is worse than no file because it looks like data. A window too dense for
 * one query is no longer such a path: it is read as successively narrower time
 * slices (`queryWindowPaged`), and only a slice below a quarter of an hour that
 * still fills the cap gives up.
 *
 * Events are read as JSON blobs and aggregated in `buildPageMetrics` rather than
 * with SQL aggregates. `writeAnalytics` stores the whole event in blob2, and the
 * Analytics Engine SQL dialect has no JSON extraction to reach inside it — so the
 * grouping has to happen here regardless. That also means this works against
 * telemetry already collected, with no change to the write path.
 */

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_ROW_LIMIT = 100_000;
/** Below this a slice is dense enough that the cap, not the window, is the problem. */
const MIN_SLICE_MS = 15 * 60 * 1000;
const SLICE_TIMEOUT_MS = 30_000;

const OUTPUT_DIR = join(process.cwd(), "artifacts", "seo-refresh");
const OUTPUT_PATH = join(OUTPUT_DIR, "page-metrics.json");

/* Validated rather than asserted: this is a remote API response, and an error
   body or a schema change would otherwise be counted as "zero events". */
const rowSchema = z.object({ blob2: z.string().nullable().optional() });

export type RefreshPageMetricsResult =
  | { status: "written"; pages: number; eventsRead: number; eventsParsed: number; path: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export const refreshPageMetrics = async (): Promise<RefreshPageMetricsResult> => {
  const config = resolveAnalyticsReadConfig();
  const windowDays = Number(process.env.WHETHER_METRICS_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);
  const rowLimit = Number(process.env.WHETHER_METRICS_ROW_LIMIT ?? DEFAULT_ROW_LIMIT);

  if (!config) {
    return {
      status: "skipped",
      reason: "CLOUDFLARE_ACCOUNT_ID and an analytics read token "
        + "(CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN) are not both set "
        + "(the token needs Account Analytics: Read).",
    };
  }

  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return { status: "failed", reason: "WHETHER_METRICS_WINDOW_DAYS must be a positive number." };
  }
  if (!Number.isFinite(rowLimit) || rowLimit <= 0) {
    return { status: "failed", reason: "WHETHER_METRICS_ROW_LIMIT must be a positive number." };
  }

  /*
   * Paged by time, not refused at the cap.
   *
   * Analytics Engine's SQL has no cursor, so "the next page" is a narrower time
   * range. A slice that comes back at the row cap is re-read as four shorter
   * ones. The previous behaviour was to fail the whole run the moment a single
   * query reached the cap, which made a busy month unreadable rather than
   * slower — and the run that most needed metrics was the one that produced
   * none.
   */
  const now = new Date();
  const paged = await queryWindowPaged<typeof rowSchema>({
    window: {
      startIso: new Date(now.getTime() - Math.trunc(windowDays) * 24 * 60 * 60 * 1000).toISOString(),
      endIso: now.toISOString(),
    },
    minSliceMs: MIN_SLICE_MS,
    run: (slice) =>
      queryAnalyticsEngine({
        config,
        rowSchema,
        rowLimit: Math.trunc(rowLimit),
        /* Bounded per slice: up to 64 sequential POSTs, and one that never
           answers would otherwise hang the whole nightly job. */
        timeoutMs: SLICE_TIMEOUT_MS,
        sql: buildStreamQuery({
          dataset: config.dataset,
          stream: "content-measurement",
          window: slice,
          columns: ["blob2"],
          limit: Math.trunc(rowLimit),
        }),
      }),
  });

  if (!paged.ok) {
    return { status: "failed", reason: `Analytics Engine read failed after ${paged.queries} queries: ${paged.reason}` };
  }

  const rows: TelemetryRow[] = paged.rows;

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

/*
 * A path that is never written, handed to the refresh queue when a refresh was
 * skipped.
 *
 * `artifacts/seo-refresh/` is gitignored and per-worktree, so a tree where
 * someone once ran this with credentials keeps a `page-metrics.json` after those
 * credentials go away. A `skipped` refresh does not touch that file, and the
 * queue's default metrics path would then read it as current — advancing
 * underperformance streaks and ranking pages in the very run that reported
 * metrics were skipped.
 *
 * Pointing the queue at a path that cannot exist makes it take the branch it
 * already has: `readJsonOrDefault` returns `{ byUrl: {} }`, which is "no metrics
 * yet". Deleting the operator's artifact would throw away data this script did
 * not create; an age check would invent a policy the queue does not have.
 */
const ABSENT_METRICS_PATH = join(OUTPUT_DIR, "page-metrics.skipped-no-credentials");

/** Queue options for a refresh outcome. Empty means "use the real metrics file". */
export const refreshQueueOptionsFor = (
  result: RefreshPageMetricsResult,
): { metricsPath?: string } =>
  (result.status === "skipped" ? { metricsPath: ABSENT_METRICS_PATH } : {});

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
