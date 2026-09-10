import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "bun:test";
import { refreshPageMetrics, refreshQueueOptionsFor } from "../scripts/seo-page-metrics";

/*
 * The guards, not the transport.
 *
 * Most cases here are paths that must NOT write a metrics file, which is the
 * whole point: `seo-refresh-queue.mjs` reads a missing file as "no metrics yet"
 * and any present file as authoritative, so a file written from a bad read is
 * worse than no file. One case does write, to prove the refusals are boundaries
 * rather than a stuck door; it removes the file again.
 *
 * The Cloudflare call is stubbed on `globalThis.fetch` — the suite runs offline
 * (see `scripts/test-network-guard.ts`), and a test that owns its upstream is
 * what makes this mean the same thing here and in the build container.
 */

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

// No cast: a zero-argument async function returning a Response already satisfies
// `fetch`'s signature, since a function taking fewer parameters is assignable to
// one taking more.
const stubFetch = (response: Response | (() => Promise<Response>)) => {
  globalThis.fetch = async () => (typeof response === "function" ? response() : response);
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const rows = (count: number) =>
  Array.from({ length: count }, () => ({
    blob2: JSON.stringify({ pagePath: "/trust", cluster: "authority", intent: "board", type: "organic_entrance" }),
  }));

describe("refreshPageMetrics guards", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "token";
    delete process.env.WHETHER_METRICS_ROW_LIMIT;
    delete process.env.WHETHER_METRICS_WINDOW_DAYS;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  /*
   * Skipped, not failed. Nobody has configured credentials in this repo yet, and
   * the weekly runbook has to keep running for the weeks before someone does.
   */
  it("reports missing credentials as skipped so the weekly runbook still runs", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;

    const result = await refreshPageMetrics();

    assert.equal(result.status, "skipped");
    assert.match(result.status === "skipped" ? result.reason : "", /CLOUDFLARE_ACCOUNT_ID/);
  });

  /*
   * A result set at the cap is indistinguishable from a complete one by the time
   * it reaches buildPageMetrics, and an undercount demotes a page's traffic tier
   * and moves the conversion target it is judged against.
   */
  it("refuses to publish when the row cap truncated the window", async () => {
    process.env.WHETHER_METRICS_ROW_LIMIT = "5";
    stubFetch(jsonResponse({ data: rows(5) }));

    const result = await refreshPageMetrics();

    assert.equal(result.status, "failed");
    assert.match(result.status === "failed" ? result.reason : "", /truncated/);
    assert.match(result.status === "failed" ? result.reason : "", /WHETHER_METRICS_ROW_LIMIT/);
  });

  /*
   * The cap check is a boundary, not a blanket refusal — and this is the one
   * case that exercises the write, so it also proves the artifact carries the
   * entrance caveat rather than presenting the count as organic. It cleans up
   * after itself: a leftover file here would be read as real metrics by the next
   * `seo:refresh-queue` run in the same working tree.
   */
  it("publishes when the result sits below the cap, with the entrance caveat recorded", async () => {
    process.env.WHETHER_METRICS_ROW_LIMIT = "5";
    stubFetch(jsonResponse({ data: rows(4) }));

    const result = await refreshPageMetrics();
    assert.equal(result.status, "written");

    const written = result.status === "written" ? result.path : "";
    try {
      const artifact = JSON.parse(readFileSync(written, "utf8"));
      assert.equal(artifact.byUrl["/trust"].organicEntrances30d, 4);
      assert.match(artifact.entranceDefinition, /not classified/);
    } finally {
      rmSync(written, { force: true });
    }
  });

  it("refuses to write an empty metrics file", async () => {
    stubFetch(jsonResponse({ data: [] }));

    const result = await refreshPageMetrics();

    assert.equal(result.status, "failed");
    assert.match(result.status === "failed" ? result.reason : "", /no content-measurement events/);
  });

  it("fails on an API error rather than counting it as zero traffic", async () => {
    stubFetch(new Response("forbidden", { status: 403 }));

    const result = await refreshPageMetrics();

    assert.equal(result.status, "failed");
    assert.match(result.status === "failed" ? result.reason : "", /HTTP 403/);
  });

  it("fails on a payload that does not match the expected shape", async () => {
    stubFetch(jsonResponse({ result: "surprise" }));

    const result = await refreshPageMetrics();

    // `data` absent parses as an empty row set, which the empty-file guard
    // catches — either way nothing is written.
    assert.equal(result.status, "failed");
  });

  it("rejects a non-positive window", async () => {
    process.env.WHETHER_METRICS_WINDOW_DAYS = "0";

    const result = await refreshPageMetrics();

    assert.equal(result.status, "failed");
    assert.match(result.status === "failed" ? result.reason : "", /WHETHER_METRICS_WINDOW_DAYS/);
  });
});

describe("refreshQueueOptionsFor", () => {
  /*
   * `artifacts/seo-refresh/` is gitignored and per-worktree, so a tree that once
   * ran with credentials keeps its `page-metrics.json` after those credentials
   * go away. Handing the queue its default path would then rank pages against
   * that stale file in the very run that reported metrics were skipped.
   */
  it("steers the queue away from a stale metrics file when the refresh was skipped", () => {
    const options = refreshQueueOptionsFor({ status: "skipped", reason: "no credentials" });

    assert.ok(options.metricsPath, "a skipped refresh overrides the queue's metrics path");
    assert.ok(
      !existsSync(options.metricsPath ?? ""),
      "the override points at a path that is never written, so the queue reads 'no metrics yet'",
    );
    assert.notEqual(options.metricsPath, join(process.cwd(), "artifacts", "seo-refresh", "page-metrics.json"));
  });

  it("leaves the queue on its real metrics file after a successful refresh", () => {
    const options = refreshQueueOptionsFor({
      status: "written",
      pages: 3,
      eventsRead: 10,
      eventsParsed: 10,
      path: "/tmp/page-metrics.json",
    });

    assert.deepEqual(options, {});
  });

  /*
   * A failed refresh never reaches the queue — the runbook exits first — so this
   * pins that the helper does not quietly authorise one.
   */
  it("does not special-case a failed refresh", () => {
    assert.deepEqual(refreshQueueOptionsFor({ status: "failed", reason: "boom" }), {});
  });
});
