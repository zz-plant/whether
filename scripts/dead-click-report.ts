#!/usr/bin/env bun
/**
 * Where readers press and get nothing, from the `dead-click` stream
 * (`lib/deadClickTelemetry.ts`): clicks grouped by page, section and kind of element,
 * most first, with how many came in a rapid burst and how many from a touch screen.
 *
 * The 2026-11-03 pass predicted these places from how the pages look; this is what
 * says whether readers agree, and where the next one is.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an analytics read token
 * (CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN, Account Analytics: Read).
 *
 * Usage:
 *   bun run telemetry:dead-clicks            # last 30 days
 *   WHETHER_TELEMETRY_WINDOW_DAYS=7 bun run telemetry:dead-clicks
 */
import { z } from "zod";
import { buildStreamQuery, queryAnalyticsEngine, resolveAnalyticsReadConfig } from "../lib/telemetry/analyticsQuery";
import { isDeadClickEvent } from "../lib/deadClickTelemetry";

const DEFAULT_WINDOW_DAYS = 30;
const ROW_LIMIT = 10_000;
const SHOWN = 40;

const rowSchema = z.object({ blob2: z.string().nullable().optional() });

const config = resolveAnalyticsReadConfig();
const windowDays = Number(process.env.WHETHER_TELEMETRY_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

if (!config) {
  console.error("telemetry:dead-clicks — skipped: CLOUDFLARE_ACCOUNT_ID and an analytics read token are not both set.");
  process.exitCode = 1;
} else if (!Number.isFinite(windowDays) || windowDays <= 0) {
  console.error("telemetry:dead-clicks — WHETHER_TELEMETRY_WINDOW_DAYS must be a positive number.");
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
      stream: "dead-click",
      window: { startIso: start.toISOString(), endIso: end.toISOString() },
      limit: ROW_LIMIT,
    }),
  });

  if (!result.ok) {
    console.error(`telemetry:dead-clicks — ${result.reason}`);
    process.exitCode = 1;
  } else {
    const groups = new Map<string, { clicks: number; rage: number; touch: number }>();
    let unreadable = 0;
    for (const row of result.rows) {
      let event: unknown;
      try {
        event = JSON.parse(row.blob2 ?? "");
      } catch {
        unreadable += 1;
        continue;
      }
      if (!isDeadClickEvent(event)) {
        unreadable += 1;
        continue;
      }
      const key = `${event.path}  ${event.section || "(no section)"}  ${event.kind}`;
      const group = groups.get(key) ?? { clicks: 0, rage: 0, touch: 0 };
      group.clicks += 1;
      if (event.rage) group.rage += 1;
      if (event.pointer === "touch") group.touch += 1;
      groups.set(key, group);
    }
    const ranked = [...groups.entries()].sort(([, left], [, right]) => right.clicks - left.clicks);
    const width = Math.max(10, ...ranked.slice(0, SHOWN).map(([key]) => key.length));
    console.log(`telemetry:dead-clicks — ${result.rows.length} clicks over ${windowDays} days${result.truncated ? " (row limit reached; narrow the window)" : ""}`);
    console.log(`  ${"page  section  kind".padEnd(width)}  ${"clicks".padStart(6)}  ${"burst".padStart(5)}  ${"touch".padStart(5)}`);
    for (const [key, group] of ranked.slice(0, SHOWN)) {
      console.log(`  ${key.padEnd(width)}  ${String(group.clicks).padStart(6)}  ${String(group.rage).padStart(5)}  ${String(group.touch).padStart(5)}`);
    }
    if (ranked.length > SHOWN) console.log(`  …and ${ranked.length - SHOWN} more`);
    if (unreadable > 0) console.log(`  ${unreadable} row(s) did not parse as a dead click`);
  }
}
