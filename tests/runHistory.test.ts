import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import {
  buildCronStepQuery,
  loadCronRunHistory,
  resetRunHistoryCacheForTests,
  resolveAnalyticsReadConfig,
  summarizeCronSteps,
} from "../lib/telemetry/runHistory";
import { requestBodyText, requestUrl } from "./fixtures/requestTarget";

const row = (timestamp: string, event: unknown) => ({ timestamp, blob2: JSON.stringify(event) });

const config = { accountId: "acct-1", token: "tok", dataset: "whether_telemetry" };

const SETTINGS = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ANALYTICS_READ_TOKEN", "WHETHER_TELEMETRY_DATASET"] as const;

afterEach(() => {
  resetRunHistoryCacheForTests();
  for (const name of SETTINGS) Reflect.deleteProperty(globalThis, name);
});

describe("summarizeCronSteps", () => {
  it("aggregates runs, failures, and last timestamps per step, newest step first", () => {
    const history = summarizeCronSteps(
      [
        row("2026-09-14 14:00:09", { step: "slack/deliver-brief", ok: true, durationMs: 900 }),
        row("2026-09-14 14:00:05", { step: "email/send-weekly", ok: false, error: "2 delivery errors", durationMs: 4000 }),
        row("2026-09-14 02:00:03", { step: "summary-history", ok: true }),
        row("2026-09-13 02:00:03", { step: "summary-history", ok: false, error: "degraded read" }),
        row("2026-09-07 14:00:05", { step: "email/send-weekly", ok: true }),
        row("2026-09-01 02:00:00", "not an event"),
        { timestamp: "2026-09-01 02:00:00", blob2: "{not json" },
      ],
      { windowDays: 30, now: new Date("2026-09-14T15:00:00.000Z") },
    );

    assert.equal(history.status, "ok");
    assert.equal(history.totalRuns, 5);
    assert.equal(history.totalFailures, 2);
    assert.deepEqual(history.steps.map((step) => step.step), ["slack/deliver-brief", "email/send-weekly", "summary-history"]);

    const email = history.steps.find((step) => step.step === "email/send-weekly");
    assert.ok(email);
    assert.equal(email.label, "Weekly email");
    assert.equal(email.runs, 2);
    assert.equal(email.failures, 1);
    assert.equal(email.lastRunAt, "2026-09-14T14:00:05.000Z");
    assert.equal(email.lastOkAt, "2026-09-07T14:00:05.000Z");
    assert.equal(email.lastError, "2 delivery errors");

    const monthly = history.steps.find((step) => step.step === "summary-history");
    assert.equal(monthly?.lastOkAt, "2026-09-14T02:00:03.000Z");
    assert.equal(monthly?.lastError, "degraded read");
  });

  it("shows an unknown step under its raw label rather than dropping it", () => {
    const history = summarizeCronSteps([row("2026-09-14 14:00:09", { step: "new-thing", ok: true })]);
    assert.equal(history.steps[0]?.label, "new-thing");
  });
});

describe("resolveAnalyticsReadConfig", () => {
  it("needs both secrets and refuses a dataset name that is not an identifier", () => {
    assert.equal(resolveAnalyticsReadConfig(), null);
    Reflect.set(globalThis, "CLOUDFLARE_ACCOUNT_ID", "acct");
    assert.equal(resolveAnalyticsReadConfig(), null);
    Reflect.set(globalThis, "CLOUDFLARE_ANALYTICS_READ_TOKEN", "tok");
    assert.deepEqual(resolveAnalyticsReadConfig(), { accountId: "acct", token: "tok", dataset: "whether_telemetry" });
    Reflect.set(globalThis, "WHETHER_TELEMETRY_DATASET", "whether_telemetry_preview");
    assert.equal(resolveAnalyticsReadConfig()?.dataset, "whether_telemetry_preview");
    Reflect.set(globalThis, "WHETHER_TELEMETRY_DATASET", "x; DROP TABLE");
    assert.equal(resolveAnalyticsReadConfig(), null);
  });

  it("builds the query against the cron-step index only", () => {
    const sql = buildCronStepQuery("whether_telemetry", 30);
    assert.match(sql, /FROM whether_telemetry/);
    assert.match(sql, /index1 = 'cron-step'/);
    assert.match(sql, /INTERVAL '30' DAY/);
  });
});

describe("loadCronRunHistory", () => {
  it("reports unconfigured without touching the network", async () => {
    let calls = 0;
    const fetcher: typeof fetch = async () => { calls += 1; return new Response("{}"); };
    assert.deepEqual(await loadCronRunHistory({ config: null, fetcher }), { status: "unconfigured" });
    assert.equal(calls, 0);
  });

  it("queries the SQL API with the token in the header only, and caches a good answer", async () => {
    const seen: Array<{ url: string; auth: string | null; body: string }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      seen.push({
        url: requestUrl(input),
        auth: new Headers(init?.headers).get("authorization"),
        body: requestBodyText(init?.body),
      });
      return new Response(JSON.stringify({ data: [row("2026-09-14 14:00:09", { step: "slack/deliver-brief", ok: true })] }));
    };

    const first = await loadCronRunHistory({ config, fetcher, now: new Date("2026-09-14T15:00:00.000Z") });
    const second = await loadCronRunHistory({ config, fetcher, now: new Date("2026-09-14T15:05:00.000Z") });

    assert.equal(first.status, "ok");
    assert.equal(second, first, "served from the cache inside the window");
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.url, "https://api.cloudflare.com/client/v4/accounts/acct-1/analytics_engine/sql");
    assert.equal(seen[0]?.auth, "Bearer tok");
    assert.doesNotMatch(seen[0]?.url ?? "", /tok/);
    assert.match(seen[0]?.body ?? "", /cron-step/);

    const later = await loadCronRunHistory({ config, fetcher, now: new Date("2026-09-14T15:20:00.000Z") });
    assert.equal(seen.length, 2, "re-read after the cache window");
    assert.equal(later.status, "ok");
  });

  it("reports unavailable on an HTTP error, a bad payload, or a slow API, and does not cache it", async () => {
    const forbidden: typeof fetch = async () => new Response("no", { status: 403 });
    const denied = await loadCronRunHistory({ config, fetcher: forbidden });
    assert.equal(denied.status, "unavailable");
    if (denied.status === "unavailable") assert.match(denied.reason, /403/);

    const garbage: typeof fetch = async () => new Response(JSON.stringify({ data: "nope" }));
    const unexpected = await loadCronRunHistory({ config, fetcher: garbage });
    assert.equal(unexpected.status, "unavailable");

    const slow: typeof fetch = () => new Promise<Response>(() => undefined);
    const timedOut = await loadCronRunHistory({ config, fetcher: slow, timeoutMs: 20 });
    assert.equal(timedOut.status, "unavailable");
    if (timedOut.status === "unavailable") assert.match(timedOut.reason, /deadline/);
  });
});
