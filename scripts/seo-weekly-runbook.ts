import { generateProgrammaticPayloadArtifacts } from "../lib/seo/programmaticPayloadBuilder";
import { describeRefreshPageMetrics, refreshPageMetrics, refreshQueueOptionsFor } from "./seo-page-metrics";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - mjs helper is intentionally JS for script portability.
import { runSeoRefreshQueue } from "./seo-refresh-queue.mjs";

const payloadResult = await generateProgrammaticPayloadArtifacts();

/*
 * Metrics before the queue, in the one command the operations doc points at.
 *
 * The queue selects pages by organic entrances and CTA conversion rate and reads
 * both from `artifacts/seo-refresh/page-metrics.json`. When this step was a
 * separate command nobody had run, the weekly runbook evaluated the queue against
 * a missing file every week and reported success — the queue looked authoritative
 * and was built on nothing.
 *
 * Three outcomes, three behaviours:
 *
 * - `written`  → the queue runs against fresh metrics.
 * - `skipped`  → no Cloudflare credentials configured. The queue still runs: it
 *                reads a missing file as "no metrics yet", which is the state
 *                this repo has always been in, so this is not a regression and
 *                should not fail a week's runbook.
 * - `failed`   → credentials exist and the read did not work. Stop here rather
 *                than generating a queue from a stale or absent metrics file and
 *                exiting 0. That is precisely the defect `freezeWeeklyBrief`
 *                shipped a published week on: a script is at risk exactly when it
 *                reads through something that degrades quietly.
 */
const metricsResult = await refreshPageMetrics();
const metricsMessage = describeRefreshPageMetrics(metricsResult);

console.log(`Programmatic payloads generated: ${payloadResult.records.length} routes (version ${payloadResult.version}).`);

if (metricsResult.status === "failed") {
  console.error(metricsMessage);
  console.error("Refresh queue not generated: refusing to rank pages against metrics that could not be refreshed.");
  process.exit(1);
}

console.log(metricsMessage);

// A skipped refresh must not silently reuse an older run's numbers; see
// `refreshQueueOptionsFor`.
const refreshResult = await runSeoRefreshQueue(refreshQueueOptionsFor(metricsResult));

console.log(
  `Refresh queue generated: ${refreshResult.queueArtifact.totals.queued}/${refreshResult.queueArtifact.totals.pages} queued, ${refreshResult.queueArtifact.totals.noindexNow} immediate noindex`
  + `${metricsResult.status === "skipped" ? ", ranked without metrics" : ""}.`,
);
