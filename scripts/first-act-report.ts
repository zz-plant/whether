#!/usr/bin/env bun
/**
 * Which section of the brief a visit first used, from the `activation` stream's `oriented`
 * events (2026-11-04), most first, against the visits that touched nothing.
 *
 * One event per visit, so this ranks first acts rather than every press: a section that
 * never shows up here may still be used later in a visit. It says what readers reach for
 * and leaves the owner's own reloads in, so read the counts, not the shares.
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and an analytics read token
 * (CLOUDFLARE_ANALYTICS_READ_TOKEN or CLOUDFLARE_API_TOKEN, Account Analytics: Read).
 *
 * Usage:
 *   bun run telemetry:first-acts            # last 30 days
 *   WHETHER_TELEMETRY_WINDOW_DAYS=7 bun run telemetry:first-acts
 */
import { z } from "zod";
import { isActivationEvent } from "../lib/activationFunnel";
import { buildStreamQuery, queryAnalyticsEngine, resolveAnalyticsReadConfig } from "../lib/telemetry/analyticsQuery";

const DEFAULT_WINDOW_DAYS = 30;
const ROW_LIMIT = 10_000;

const rowSchema = z.object({ blob2: z.string().nullable().optional() });

const config = resolveAnalyticsReadConfig();
const windowDays = Number(process.env.WHETHER_TELEMETRY_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

if (!config) {
  console.error("telemetry:first-acts — skipped: CLOUDFLARE_ACCOUNT_ID and an analytics read token are not both set.");
  process.exitCode = 1;
} else if (!Number.isFinite(windowDays) || windowDays <= 0) {
  console.error("telemetry:first-acts — WHETHER_TELEMETRY_WINDOW_DAYS must be a positive number.");
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
      stream: "activation",
      window: { startIso: start.toISOString(), endIso: end.toISOString() },
      limit: ROW_LIMIT,
    }),
  });

  if (!result.ok) {
    console.error(`telemetry:first-acts — ${result.reason}`);
    process.exitCode = 1;
  } else {
    const sections = new Map<string, number>();
    let visits = 0;
    let oriented = 0;
    for (const row of result.rows) {
      let event: unknown;
      try {
        event = JSON.parse(row.blob2 ?? "");
      } catch {
        continue;
      }
      if (!isActivationEvent(event)) continue;
      if (event.step === "visited") visits += 1;
      if (event.step !== "oriented") continue;
      oriented += 1;
      /* Events from before 2026-11-04 carry no section, and a press outside every section sends "". */
      const section = event.section || "(no section recorded)";
      sections.set(section, (sections.get(section) ?? 0) + 1);
    }
    console.log(`telemetry:first-acts — ${visits} visits, ${oriented} used a control, over ${windowDays} days${result.truncated ? " (row limit reached; narrow the window)" : ""}`);
    for (const [section, count] of [...sections.entries()].sort(([, left], [, right]) => right - left)) {
      console.log(`  ${String(count).padStart(5)}  ${section}`);
    }
  }
}
