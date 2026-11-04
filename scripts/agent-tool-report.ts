#!/usr/bin/env bun
/**
 * Which agent tools get called and how those calls end, from the `agent-tool` stream
 * (`describeAgentToolCall` in `lib/agent/tools.ts`), most first.
 *
 * Counts only. The questions and plans are not recorded, so a high refused count says a
 * tool is turning callers away and not what they asked; test wordings by hand from there.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an analytics read token
 * (CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN, Account Analytics: Read).
 *
 * Usage:
 *   bun run telemetry:agent-tools            # last 30 days
 *   WHETHER_TELEMETRY_WINDOW_DAYS=7 bun run telemetry:agent-tools
 */
import { z } from "zod";
import { buildStreamQuery, queryAnalyticsEngine, resolveAnalyticsReadConfig } from "../lib/telemetry/analyticsQuery";

const DEFAULT_WINDOW_DAYS = 30;
const ROW_LIMIT = 10_000;

const rowSchema = z.object({ blob2: z.string().nullable().optional() });
const eventSchema = z.object({ tool: z.string(), outcome: z.string(), detail: z.string().nullable() });

const parseEvent = (blob: string | null | undefined) => {
  try {
    return eventSchema.safeParse(JSON.parse(blob ?? "")).data;
  } catch {
    return undefined;
  }
};

const config = resolveAnalyticsReadConfig();
const windowDays = Number(process.env.WHETHER_TELEMETRY_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

if (!config) {
  console.error("telemetry:agent-tools — skipped: CLOUDFLARE_ACCOUNT_ID and an analytics read token are not both set.");
  process.exitCode = 1;
} else if (!Number.isFinite(windowDays) || windowDays <= 0) {
  console.error("telemetry:agent-tools — WHETHER_TELEMETRY_WINDOW_DAYS must be a positive number.");
  process.exitCode = 1;
} else {
  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const result = await queryAnalyticsEngine({
    config,
    rowSchema,
    rowLimit: ROW_LIMIT,
    timeoutMs: 30_000,
    sql: buildStreamQuery({
      dataset: config.dataset,
      stream: "agent-tool",
      window: { startIso: start.toISOString(), endIso: end.toISOString() },
      limit: ROW_LIMIT,
    }),
  });

  if (!result.ok) {
    console.error(`telemetry:agent-tools — ${result.reason}`);
    process.exitCode = 1;
  } else {
    const counts = new Map<string, number>();
    let unreadable = 0;
    for (const row of result.rows) {
      const event = parseEvent(row.blob2);
      if (!event) {
        unreadable += 1;
        continue;
      }
      const key = `${event.tool}  ${event.outcome}  ${event.detail ?? "-"}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort(([, left], [, right]) => right - left);
    const width = Math.max(10, ...ranked.map(([key]) => key.length));
    console.log(`telemetry:agent-tools — ${result.rows.length} calls over ${windowDays} days${result.truncated ? " (row limit reached; narrow the window)" : ""}`);
    console.log(`  ${"tool  outcome  detail".padEnd(width)}  ${"calls".padStart(6)}`);
    for (const [key, calls] of ranked) console.log(`  ${key.padEnd(width)}  ${String(calls).padStart(6)}`);
    if (unreadable > 0) console.log(`  ${unreadable} row(s) did not parse as an agent tool call`);
  }
}
