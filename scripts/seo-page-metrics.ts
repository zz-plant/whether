import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { buildPageMetrics, type TelemetryRow } from "../lib/seo/pageMetricsFromTelemetry";

/*
 * Pull content-measurement telemetry out of Analytics Engine and write the
 * metrics file `bun run seo:refresh-queue` reads.
 *
 * Run this before the queue:
 *   bun run seo:page-metrics && bun run seo:refresh-queue
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an API token with Account Analytics: Read.
 * Both are refused loudly rather than defaulted — a metrics file quietly built
 * from zero rows would mark every page "low traffic, underperforming" and put
 * the whole site in the refresh queue, which is worse than no file at all
 * (`seo-refresh-queue.mjs` already treats a missing file as "no metrics yet").
 *
 * Events are read as JSON blobs and aggregated in `buildPageMetrics` rather than
 * with SQL aggregates. `writeAnalytics` stores the whole event in blob2, and the
 * Analytics Engine SQL dialect has no JSON extraction to reach inside it — so the
 * grouping has to happen here regardless. That also means this works against
 * telemetry already collected, with no change to the write path.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATASET = process.env.WHETHER_TELEMETRY_DATASET ?? "whether_telemetry";
const WINDOW_DAYS = Number(process.env.WHETHER_METRICS_WINDOW_DAYS ?? 30);
const ROW_LIMIT = Number(process.env.WHETHER_METRICS_ROW_LIMIT ?? 100_000);

const OUTPUT_DIR = join(process.cwd(), "artifacts", "seo-refresh");
const OUTPUT_PATH = join(OUTPUT_DIR, "page-metrics.json");

/* Validated rather than asserted: this is a remote API response, and an error
   body or a schema change would otherwise be counted as "zero events". */
const sqlResponseSchema = z.object({
  data: z.array(z.object({ blob2: z.string().nullable().optional() })).optional(),
});

const fail = (message: string): never => {
  console.error(`seo:page-metrics — ${message}`);
  process.exit(1);
};

const querySql = async (sql: string): Promise<TelemetryRow[]> => {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return fail(`Analytics Engine query failed: HTTP ${response.status} ${detail.slice(0, 400)}`);
  }

  const parsed = sqlResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return fail(`Analytics Engine returned an unexpected payload: ${parsed.error.message.slice(0, 400)}`);
  }
  return parsed.data.data ?? [];
};

if (!ACCOUNT_ID) fail("CLOUDFLARE_ACCOUNT_ID is not set.");
if (!API_TOKEN) fail("CLOUDFLARE_API_TOKEN is not set (needs Account Analytics: Read).");
if (!Number.isFinite(WINDOW_DAYS) || WINDOW_DAYS <= 0) fail("WHETHER_METRICS_WINDOW_DAYS must be a positive number.");

const sql = [
  "SELECT blob2",
  `FROM ${DATASET}`,
  "WHERE index1 = 'content-measurement'",
  `  AND timestamp > now() - INTERVAL '${Math.trunc(WINDOW_DAYS)}' DAY`,
  `LIMIT ${Math.trunc(ROW_LIMIT)}`,
].join("\n");

const rows = await querySql(sql);
const metrics = buildPageMetrics(rows, { windowDays: WINDOW_DAYS });
const pageCount = Object.keys(metrics.byUrl).length;

if (pageCount === 0) {
  fail(
    `no content-measurement events in the last ${WINDOW_DAYS} days (${rows.length} rows read). `
    + "Refusing to write an empty metrics file — the refresh queue reads a missing file as "
    + "'no metrics yet', and an empty one as 'every page has zero traffic'.",
  );
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");

console.log(
  `seo:page-metrics — ${pageCount} pages from ${metrics.eventsParsed}/${metrics.eventsRead} events `
  + `over ${WINDOW_DAYS} days → ${OUTPUT_PATH}`,
);
