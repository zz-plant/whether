#!/usr/bin/env bun
/**
 * How many rows each telemetry stream wrote, over a window.
 *
 * The streams are declared in `lib/telemetry/analyticsEngine.ts` and read from
 * there rather than listed again here. Two of them, `regime-transition` and
 * `degraded-state`, had never had a writer and were removed on 2026-09-16; only
 * two have a reader: `cron-step` (the trust page's run history) and
 * `content-measurement` (the SEO refresh loop). The rest are written on every
 * page view and read by nothing, so "is this stream alive" and "did this
 * emitter stop firing" were unanswerable without opening the Cloudflare
 * dashboard.
 *
 * This is the cheap general reader: one grouped count, which the SQL dialect
 * can do without reaching inside the JSON blob. It answers volume, not meaning
 * — a stream with a real consumer still needs its own reader — but a stream at
 * zero is either dead code or a broken emitter, and both are worth knowing.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an analytics read token
 * (CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN, Account
 * Analytics: Read).
 *
 * Usage:
 *   bun run telemetry:streams            # last 30 days
 *   WHETHER_TELEMETRY_WINDOW_DAYS=7 bun run telemetry:streams
 */
import { z } from "zod";
import { queryAnalyticsEngine, resolveAnalyticsReadConfig } from "../lib/telemetry/analyticsQuery";
import { TELEMETRY_STREAMS } from "../lib/telemetry/analyticsEngine";

const DEFAULT_WINDOW_DAYS = 30;
const ROW_LIMIT = 100;

/** Every stream the writer declares, so one at zero shows up as a row rather than an absence. */
const DECLARED_STREAMS = TELEMETRY_STREAMS;

/** What reads each stream today, so a zero row can be judged against intent. */
const READERS: Record<string, string> = {
  "cron-step": "lib/telemetry/runHistory.ts → /trust",
  "content-measurement": "scripts/seo-page-metrics.ts → SEO refresh queue",
  "premium-funnel": "KV, not Analytics Engine (GET /api/telemetry/premium-funnel)",
  search: "this census only",
};

const rowSchema = z.object({
  index1: z.string().nullable().optional(),
  count: z.union([z.number(), z.string()]).nullable().optional(),
});

export type StreamCensusRow = { stream: string; rows: number; reader: string };

export type StreamCensusResult =
  | { status: "ok"; windowDays: number; streams: StreamCensusRow[] }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

export const censusTelemetryStreams = async (): Promise<StreamCensusResult> => {
  const config = resolveAnalyticsReadConfig();
  const windowDays = Number(process.env.WHETHER_TELEMETRY_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

  if (!config) {
    return {
      status: "skipped",
      reason: "CLOUDFLARE_ACCOUNT_ID and an analytics read token "
        + "(CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN) are not both set.",
    };
  }
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return { status: "failed", reason: "WHETHER_TELEMETRY_WINDOW_DAYS must be a positive number." };
  }

  const result = await queryAnalyticsEngine({
    config,
    rowSchema,
    rowLimit: ROW_LIMIT,
    timeoutMs: 30_000,
    sql: [
      "SELECT index1, count() AS count",
      `FROM ${config.dataset}`,
      `WHERE timestamp > NOW() - INTERVAL '${Math.trunc(windowDays)}' DAY`,
      "GROUP BY index1",
      `LIMIT ${ROW_LIMIT}`,
    ].join("\n"),
  });

  if (!result.ok) return { status: "failed", reason: result.reason };

  const counts = new Map<string, number>();
  for (const row of result.rows) {
    if (!row.index1) continue;
    counts.set(row.index1, Number(row.count ?? 0));
  }

  /* Declared streams first, in declaration order, then anything the dataset
     holds that the writer no longer declares — a rename leaves rows behind. */
  const seen = new Set<string>(DECLARED_STREAMS);
  const streams: StreamCensusRow[] = [
    ...DECLARED_STREAMS.map((stream) => ({
      stream,
      rows: counts.get(stream) ?? 0,
      reader: READERS[stream] ?? "none",
    })),
    ...[...counts.keys()]
      .filter((stream) => !seen.has(stream))
      .sort()
      .map((stream) => ({ stream: `${stream} (undeclared)`, rows: counts.get(stream) ?? 0, reader: "none" })),
  ];

  return { status: "ok", windowDays, streams };
};

export const describeStreamCensus = (result: StreamCensusResult): string => {
  if (result.status === "skipped") return `telemetry:streams — skipped: ${result.reason}`;
  if (result.status === "failed") return `telemetry:streams — ${result.reason}`;

  const width = Math.max(...result.streams.map((entry) => entry.stream.length));
  const lines = result.streams.map((entry) =>
    `  ${entry.stream.padEnd(width)}  ${String(entry.rows).padStart(8)}  ${entry.reader}`);
  const silent = result.streams.filter((entry) => entry.rows === 0).map((entry) => entry.stream);

  return [
    `telemetry:streams — rows per stream over ${result.windowDays} days (reader shown last)`,
    ...lines,
    silent.length > 0 ? `  silent: ${silent.join(", ")}` : "  every declared stream wrote at least one row",
  ].join("\n");
};

if (import.meta.main) {
  const result = await censusTelemetryStreams();
  const message = describeStreamCensus(result);

  if (result.status === "ok") {
    console.log(message);
  } else {
    console.error(message);
    process.exitCode = 1;
  }
}
